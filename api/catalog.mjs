import { forwardToAdminEdge, requireDataActor } from './_auth.mjs';

export async function GET(req) {
  const auth = await requireDataActor(req);
  if (auth.response) return auth.response;
  const kind = new URL(req.url).searchParams.get('kind');
  if (!['Course', 'Subject', 'Folder'].includes(kind)) {
    return Response.json({ error: 'Tipo inválido.' }, { status: 400 });
  }
  let query = auth.supabase.from('learning_catalog').select('id, payload').eq('kind', kind);
  if (auth.actor.kind !== 'admin') {
    const ids = auth.actor.courseIds || [auth.actor.courseId].filter(Boolean);
    if (!ids.length) return Response.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } });
    query = query.in(kind === 'Course' ? 'id' : 'course_id', ids);
  }
  const { data, error } = await query;
  if (error) return Response.json({ error: 'No se pudo cargar el catálogo.' }, { status: 500 });
  return Response.json({ items: data.map(row => ({ ...row.payload, id: row.id })) }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
export async function POST(req) { return forwardToAdminEdge(req, 'catalog'); }
export async function DELETE(req) { return forwardToAdminEdge(req, 'catalog'); }
