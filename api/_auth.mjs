import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hmac = (value) => crypto.createHmac('sha256', process.env.TOKEN_SIGNING_SECRET).update(value).digest('hex');

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function validateAdminToken(token) {
  if (!token.startsWith('adm.') || !process.env.TOKEN_SIGNING_SECRET) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || hmac(parts[1]) !== parts[2]) return null;
  try {
    const payload = JSON.parse(fromBase64Url(parts[1]));
    if (payload?.sub !== 'admin' || !payload?.exp || payload.exp <= new Date().toISOString()) return null;
    return { kind: 'admin', user: { id: 'admin_local', email: `${payload.user}@kognocore.local` } };
  } catch (_error) {
    return null;
  }
}

async function validateCodeSession(supabase, token) {
  if (!process.env.CODE_PEPPER || !process.env.TOKEN_SIGNING_SECRET) return null;

  if (token.startsWith('v2.')) {
    const parts = token.split('.');
    if (parts.length !== 3 || hmac(parts[1]) !== parts[2]) return null;
    try {
      const payload = JSON.parse(fromBase64Url(parts[1]));
      if (!payload?.courseId || !payload?.exp || payload.exp <= new Date().toISOString()) return null;
      return { kind: 'student', courseId: payload.courseId };
    } catch (_error) {
      return null;
    }
  }

  const [raw, signature] = token.split('.');
  if (!raw || !signature || hmac(raw) !== signature) return null;

  const tokenHash = sha256(`${token}|${process.env.CODE_PEPPER}`);
  const { data, error } = await supabase
    .from('sessions')
    .select('course_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data || (data.expires_at && data.expires_at <= new Date().toISOString())) return null;
  return { kind: 'student', courseId: data.course_id };
}

export async function requireDataActor(req, { adminOnly = false } = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { response: jsonError('Server auth not configured', 503) };

  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return { response: jsonError('Authentication required', 401) };

  const adminActor = validateAdminToken(token);
  if (adminActor) return { actor: adminActor, supabase };

  const { data: { user } } = await supabase.auth.getUser(token);
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'admin') return { actor: { kind: 'admin', user }, supabase };
    if (!adminOnly) return { actor: { kind: 'student', user }, supabase };
    return { response: jsonError('Administrator access required', 403) };
  }

  if (!adminOnly) {
    const actor = await validateCodeSession(supabase, token);
    if (actor) return { actor, supabase };
  }

  return { response: jsonError('Invalid or expired session', 401) };
}

export async function requireAdmin(req) {
  const result = await requireDataActor(req, { adminOnly: true });
  if (result.response) return result;
  return { user: result.actor.user, supabase: result.supabase };
}
