import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const jsonError = (message, status) => new Response(
  JSON.stringify({ error: message }),
  { status, headers: { 'Content-Type': 'application/json' } }
);

export async function requireAdmin(req) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { response: jsonError('Server auth not configured', 503) };

  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return { response: jsonError('Authentication required', 401) };

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return { response: jsonError('Invalid or expired session', 401) };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { response: jsonError('Administrator access required', 403) };
  }

  return { user, supabase };
}
