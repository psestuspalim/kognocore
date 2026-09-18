import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const STUDENT_DOMAIN = 'students.kognocore.local';
const ADMIN_VERIFY_URL = 'https://kognocore.vercel.app/api/access-codes';
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const bearer = (req: Request) => req.headers.get('authorization') || '';

async function isAdmin(req: Request) {
  const authorization = bearer(req);
  if (!authorization) return false;
  const response = await fetch(ADMIN_VERIFY_URL, { headers: { Authorization: authorization } });
  return response.ok;
}

async function managedStudent(req: Request) {
  const token = bearer(req).replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  const metadata = user?.app_metadata;
  if (!user || !metadata?.managed_student || metadata.is_active !== true) return null;
  return { user, metadata };
}

function studentFromAuth(user: any) {
  const metadata = user?.app_metadata;
  if (!metadata?.managed_student) return null;
  return {
    id: user.id,
    email: user.email,
    learner_id: `user_${user.id}`,
    username: metadata.username,
    full_name: metadata.full_name || metadata.username,
    role: 'user',
    is_admin: false,
    auth_provider: 'supabase',
    managed_student: true,
    is_active: metadata.is_active === true,
    course_ids: Array.isArray(metadata.course_ids) ? metadata.course_ids : [],
    created_date: user.created_at,
    last_sign_in_at: user.last_sign_in_at
  };
}

function validateStudentInput(input: any, creating = false) {
  const username = String(input.username || '').trim().toLowerCase();
  if (creating && !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) throw new Error('El usuario debe tener entre 3 y 40 caracteres válidos.');
  if ((creating || input.password) && (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128)) throw new Error('La contraseña debe tener entre 8 y 128 caracteres.');
  if (!Array.isArray(input.course_ids) || input.course_ids.length > 50 || input.course_ids.some((id: unknown) => typeof id !== 'string' || !id || id.length > 150)) throw new Error('Selecciona cursos válidos.');
  if (typeof input.is_active !== 'boolean') throw new Error('Estado de cuenta inválido.');
  const fullName = String(input.full_name || username).trim();
  if (!fullName || fullName.length > 120) throw new Error('Indica un nombre de hasta 120 caracteres.');
  return { username, full_name: fullName, course_ids: [...new Set(input.course_ids)], is_active: input.is_active };
}

async function catalog(req: Request, url: URL) {
  const kind = url.searchParams.get('kind');
  const kinds = ['Course', 'Subject', 'Folder'];
  if (req.method === 'GET') {
    if (!kinds.includes(kind || '')) return reply({ error: 'Tipo inválido.' }, 400);
    const student = await managedStudent(req);
    const admin = student ? false : await isAdmin(req);
    if (!student && !admin) return reply({ error: 'Authentication required' }, 401);
    let query = supabase.from('learning_catalog').select('payload').eq('kind', kind!);
    if (student) {
      const ids = Array.isArray(student.metadata.course_ids) ? student.metadata.course_ids : [];
      if (!ids.length) return reply({ items: [] });
      query = query.in('course_id', ids);
    }
    const { data, error } = await query;
    return error ? reply({ error: 'No se pudo cargar el catálogo.' }, 500) : reply({ items: data.map(row => row.payload) });
  }

  if (!await isAdmin(req)) return reply({ error: 'Administrator access required' }, 403);
  if (req.method === 'POST') {
    try {
      const { kind: bodyKind, items, importOnly = false } = await req.json();
      if (!kinds.includes(bodyKind) || !Array.isArray(items) || items.length > 1000) return reply({ error: 'Catálogo inválido.' }, 400);
      const rows = items.map((item: any) => {
        const courseId = bodyKind === 'Course' ? item.id : item.course_id;
        if (typeof item.id !== 'string' || !item.id || typeof courseId !== 'string' || !courseId) throw new Error();
        return { id: item.id, kind: bodyKind, course_id: courseId, payload: item };
      });
      if (!rows.length) return reply({ ok: true });
      const { error } = await supabase.from('learning_catalog').upsert(rows, { onConflict: 'id', ignoreDuplicates: importOnly });
      return error ? reply({ error: 'No se pudo guardar el catálogo.' }, 500) : reply({ ok: true });
    } catch { return reply({ error: 'Catálogo inválido.' }, 400); }
  }
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) return reply({ error: 'Identificador requerido.' }, 400);
    const { error } = await supabase.from('learning_catalog').delete().eq('id', id);
    return error ? reply({ error: 'No se pudo eliminar.' }, 500) : reply({ ok: true });
  }
  return reply({ error: 'Method not allowed' }, 405);
}

async function students(req: Request) {
  if (!await isAdmin(req)) return reply({ error: 'Administrator access required' }, 403);
  if (req.method === 'GET') {
    const result = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return reply({ error: 'No se pudieron cargar los alumnos.' }, 500);
      result.push(...data.users.map(studentFromAuth).filter(Boolean));
      if (data.users.length < 1000) break;
    }
    return reply({ students: result });
  }

  if (!['POST', 'PATCH'].includes(req.method)) return reply({ error: 'Method not allowed' }, 405);
  const creating = req.method === 'POST';
  let input: any, fields: any;
  try { input = await req.json(); fields = validateStudentInput(input, creating); }
  catch (error) { return reply({ error: error instanceof Error ? error.message : 'Datos inválidos.' }, 400); }

  if (fields.course_ids.length) {
    const { data, error } = await supabase.from('learning_catalog').select('id').eq('kind', 'Course').in('id', fields.course_ids);
    if (error) return reply({ error: 'No se pudieron comprobar los cursos.' }, 500);
    if (data.length !== fields.course_ids.length) return reply({ error: 'Uno de los cursos ya no existe.' }, 400);
  }

  const metadata = { managed_student: true, ...fields };
  if (creating) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: `${fields.username}@${STUDENT_DOMAIN}`,
      password: input.password,
      email_confirm: true,
      ban_duration: fields.is_active ? 'none' : '876000h',
      app_metadata: metadata,
      user_metadata: { username: fields.username, full_name: fields.full_name }
    });
    if (error) return reply({ error: error.code?.includes('email') ? 'Ese usuario ya existe.' : 'No se pudo crear el alumno.' }, 400);
    return reply({ student: studentFromAuth(data.user) }, 201);
  }

  const { data: existing, error: lookupError } = await supabase.auth.admin.getUserById(input.id);
  if (lookupError || !studentFromAuth(existing?.user)) return reply({ error: 'Alumno no encontrado.' }, 404);
  metadata.username = existing.user.app_metadata.username;
  const { data, error } = await supabase.auth.admin.updateUserById(input.id, {
    app_metadata: { ...existing.user.app_metadata, ...metadata },
    ...(input.password ? { password: input.password } : {}),
    ban_duration: fields.is_active ? 'none' : '876000h'
  });
  return error ? reply({ error: 'No se pudo guardar el alumno.' }, 400) : reply({ student: studentFromAuth(data.user) });
}

Deno.serve(async req => {
  try {
    const url = new URL(req.url);
    const route = url.searchParams.get('route');
    if (route === 'catalog') return await catalog(req, url);
    if (route === 'students') return await students(req);
    return reply({ error: 'Route not found' }, 404);
  } catch (error) {
    console.error(error);
    return reply({ error: 'Unexpected server error' }, 500);
  }
});
