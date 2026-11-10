import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Failed attempts are counted per client address. Only failures count, so a
// classroom signing in from one network is not locked out by its own successes.
// The limiter fails open: if the database function is missing or unreachable,
// requests proceed as before.
const WINDOW_SECONDS = 15 * 60;

function clientKey(req, scope) {
  const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const address = forwarded.split(',')[0].trim();
  return `${scope}:${crypto.createHash('sha256').update(address).digest('hex').slice(0, 32)}`;
}

function database() {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function hit(req, scope, increment) {
  try {
    const db = database();
    if (!db) return 0;
    const { data, error } = await db.rpc('auth_rate_limit_hit', {
      p_key: clientKey(req, scope), p_window_seconds: WINDOW_SECONDS, p_increment: increment
    });
    return error || !Number.isFinite(data) ? 0 : data;
  } catch {
    return 0;
  }
}

export async function tooManyFailures(req, scope, limit) {
  if (await hit(req, scope, 0) < limit) return null;
  return Response.json(
    { error: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.' },
    { status: 429, headers: { 'Retry-After': String(WINDOW_SECONDS), 'Cache-Control': 'no-store' } }
  );
}

export const recordFailure = (req, scope) => hit(req, scope, 1);
