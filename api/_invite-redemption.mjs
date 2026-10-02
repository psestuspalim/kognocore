import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const reply = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' }
});

export async function consumeInviteRequest(req, { createSession }) {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, CODE_PEPPER: pepper, TOKEN_SIGNING_SECRET: secret } = process.env;
  if (!url || !key || !pepper || (createSession && !secret)) {
    return reply({ error: 'Server auth not configured' }, 503);
  }

  let code;
  try {
    const body = await req.json();
    if (typeof body?.code !== 'string') return reply({ error: 'Código inválido' }, 400);
    code = body.code.trim().toUpperCase();
    if (code.length < (createSession ? 8 : 4) || code.length > 256) {
      return reply({ error: 'Código inválido' }, 400);
    }
  } catch {
    return reply({ error: 'Bad request' }, 400);
  }

  try {
    const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    let token = null;
    if (createSession) {
      const raw = crypto.randomBytes(32).toString('hex');
      const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      token = `${raw}.${signature}`;
    }
    const { data, error } = await supabase.rpc('consume_invite', {
      p_code_hash: sha256(`${code}|${pepper}`),
      p_code: code,
      p_token_hash: token ? sha256(`${token}|${pepper}`) : null
    });
    // Never issue a token if the transaction failed or rejected the invite.
    if (error) return reply({ error: 'No se pudo validar el código' }, 503);
    if (!data) return reply({ error: 'Código inválido, inactivo, expirado o agotado' }, 401);
    if (!data.course_id || !data.expires_at) return reply({ error: 'Invalid server response' }, 503);
    return reply(createSession
      ? { token, courseId: data.course_id, expiresAt: data.expires_at }
      : { valid: true, courseId: data.course_id });
  } catch {
    return reply({ error: 'No se pudo validar el código' }, 503);
  }
}
