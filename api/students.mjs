import { requireAdmin } from './_auth.mjs';
import { STUDENT_DOMAIN, studentFromAuth, validateStudentInput } from './_students.mjs';

const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  const students = [];
  for (let page = 1; ; page++) {
    const { data, error } = await auth.supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return reply({ error: 'No se pudieron cargar los alumnos.' }, 500);
    students.push(...data.users.map(studentFromAuth).filter(Boolean));
    if (data.users.length < 1000) break;
  }
  return reply({ students });
}

async function save(req, creating) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  let input, fields;
  try {
    input = await req.json();
    fields = validateStudentInput(input, { creating });
  } catch (error) { return reply({ error: error.message }, 400); }

  if (fields.course_ids.length) {
    const { data, error } = await auth.supabase.from('learning_catalog').select('id').eq('kind', 'Course').in('id', fields.course_ids);
    if (error) return reply({ error: 'No se pudieron comprobar los cursos.' }, 500);
    if (data.length !== fields.course_ids.length) return reply({ error: 'Uno de los cursos ya no existe. Actualiza la lista.' }, 400);
  }

  const metadata = { managed_student: true, ...fields };
  if (creating) {
    const { data, error } = await auth.supabase.auth.admin.createUser({
      email: `${fields.username}@${STUDENT_DOMAIN}`, password: input.password, email_confirm: true,
      ban_duration: fields.is_active ? 'none' : '876000h',
      app_metadata: metadata, user_metadata: { username: fields.username, full_name: fields.full_name }
    });
    if (error) return reply({ error: error.code === 'email_exists' || error.code === 'email_already_exists' ? 'Ese usuario ya existe.' : 'No se pudo crear el alumno. Comprueba que el usuario sea único y que la contraseña sea válida.' }, 400);
    return reply({ student: studentFromAuth(data.user) }, 201);
  }

  if (typeof input.id !== 'string') return reply({ error: 'Alumno inválido.' }, 400);
  const { data: existing, error: lookupError } = await auth.supabase.auth.admin.getUserById(input.id);
  if (lookupError || !studentFromAuth(existing?.user)) return reply({ error: 'Alumno no encontrado.' }, 404);
  // Usernames are stable login identifiers; the administrator can edit the display name.
  metadata.username = existing.user.app_metadata.username;
  const { data, error } = await auth.supabase.auth.admin.updateUserById(input.id, {
    app_metadata: { ...existing.user.app_metadata, ...metadata },
    ...(input.password ? { password: input.password } : {}),
    ban_duration: fields.is_active ? 'none' : '876000h'
  });
  if (error) return reply({ error: 'No se pudo guardar el alumno.' }, 400);
  return reply({ student: studentFromAuth(data.user) });
}

export const POST = req => save(req, true);
export const PATCH = req => save(req, false);
