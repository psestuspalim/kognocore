import { requireDataActor } from './_auth.mjs';
export async function GET(req) {
  const auth = await requireDataActor(req);
  if (auth.response) return auth.response;
  const { actor } = auth;
  if (actor.student) return Response.json({ user: actor.student }, { headers: { 'Cache-Control': 'no-store' } });
  if (actor.kind === 'admin') return Response.json({ user: { id: actor.user.id, email: actor.user.email, role: 'admin', is_admin: true } });
  return Response.json({ courseId: actor.courseId });
}
