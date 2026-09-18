export async function forwardToAdminEdge(req, route) {
  const baseUrl = process.env.SUPABASE_URL;
  if (!baseUrl) return Response.json({ error: 'Server auth not configured' }, { status: 503 });
  const sourceUrl = new URL(req.url);
  const targetUrl = new URL(`${baseUrl}/functions/v1/kognocore-admin`);
  targetUrl.searchParams.set('route', route);
  sourceUrl.searchParams.forEach((value, key) => targetUrl.searchParams.append(key, value));
  const authorization = req.headers.get('authorization');
  const contentType = req.headers.get('content-type');
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      ...(contentType ? { 'Content-Type': contentType } : {})
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text()
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' }
  });
}
