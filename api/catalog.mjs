import { requireAdmin, requireDataActor } from './_auth.mjs';

const kinds = ['Course', 'Subject', 'Folder'];
const reply = (body, status = 200) => Response.json(body, { status });

export async function GET(req) {
  const auth = await requireDataActor(req);
  if (auth.response) return auth.response;
  const kind = new URL(req.url).searchParams.get('kind');
  if (!kinds.includes(kind)) return reply({ error: 'Tipo inválido.' }, 400);
  let query = auth.supabase.from('learning_catalog').select('payload').eq('kind', kind);
  if (auth.actor.kind !== 'admin') {
    const ids = auth.actor.courseIds || [auth.actor.courseId];
    if (!ids.length) return reply({ items: [] });
    query = query.in('course_id', ids);
  }
  const { data, error } = await query;
  return error ? reply({ error: 'No se pudo cargar el catálogo.' }, 500) : reply({ items: data.map(row => row.payload) });
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  try {
    const { kind, items, importOnly = false } = await req.json();
    if (!kinds.includes(kind) || !Array.isArray(items) || items.length > 1000) return reply({ error: 'Catálogo inválido.' }, 400);
    const rows = items.map(item => {
      const courseId = kind === 'Course' ? item.id : item.course_id;
      if (typeof item.id !== 'string' || !item.id || typeof courseId !== 'string' || !courseId) throw new Error('Curso requerido.');
      return { id: item.id, kind, course_id: courseId, payload: item };
    });
    if (!rows.length) return reply({ ok: true });
    const { error } = await auth.supabase.from('learning_catalog').upsert(rows, { onConflict: 'id', ignoreDuplicates: importOnly });
    return error ? reply({ error: 'No se pudo guardar el catálogo.' }, 500) : reply({ ok: true });
  } catch { return reply({ error: 'Catálogo inválido.' }, 400); }
}

export async function DELETE(req) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return reply({ error: 'Identificador requerido.' }, 400);
  const { error } = await auth.supabase.from('learning_catalog').delete().eq('id', id);
  return error ? reply({ error: 'No se pudo eliminar.' }, 500) : reply({ ok: true });
}
