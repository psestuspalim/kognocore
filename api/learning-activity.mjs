import { requireDataActor } from './_auth.mjs';
import { actorOwner, allRows } from './_learning.mjs';

export async function GET(req) {
  const authorization = await requireDataActor(req);
  if (authorization.response) return authorization.response;
  const { actor, supabase } = authorization;
  const params = new URL(req.url).searchParams;
  try {
    const rows = await allRows(() => {
      let query = supabase.from('learning_activity').select('id,payload').order('id');
      if (actor.kind !== 'admin') query = query.eq('owner_key', actorOwner(actor, req));
      if (actor.kind === 'admin' && params.get('learner_id')) query = query.eq('payload->>learner_id', params.get('learner_id'));
      if (actor.kind === 'admin' && params.get('user_email')) query = query.eq('payload->>user_email', params.get('user_email'));
      return query;
    });
    return Response.json({ activity: rows.map(row => ({ ...row.payload, id: row.id })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'No se pudo consultar el tiempo de actividad.' }, { status: 503 }); }
}

export async function POST(req) {
  const authorization = await requireDataActor(req);
  if (authorization.response) return authorization.response;
  const { actor, supabase } = authorization;
  try {
    const { activity } = await req.json();
    if (!activity?.id || !Number.isFinite(activity.active_seconds) || !Number.isFinite(activity.visible_seconds)) return Response.json({ error: 'Actividad inválida.' }, { status: 400 });
    const started = Date.parse(activity.started_at);
    if (!Number.isFinite(started) || started > Date.now() + 60000) return Response.json({ error: 'Fecha inválida.' }, { status: 400 });
    const maximum = Math.max(0, Math.floor((Date.now() - started) / 1000) + 5);
    const payload = {
      id: String(activity.id).slice(0, 160),
      learner_id: actor.learnerId || activity.learner_id,
      user_email: actor.student?.email || actor.user?.email || activity.user_email,
      started_at: activity.started_at, updated_at: new Date().toISOString(),
      active_seconds: Math.max(0, Math.min(activity.active_seconds, activity.visible_seconds, maximum)),
      visible_seconds: Math.max(0, Math.min(activity.visible_seconds, maximum))
    };
    const { error } = await supabase.rpc('save_learning_activity', { p_id: payload.id, p_owner: actorOwner(actor, req), p_payload: payload });
    if (error) return Response.json({ error: 'No se pudo guardar actividad.' }, { status: 409 });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'Actividad inválida.' }, { status: 400 }); }
}
