import { requireAdmin } from './_auth.mjs';

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
