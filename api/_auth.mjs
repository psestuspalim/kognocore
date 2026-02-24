import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function hmac(s) {
  const secret = process.env.TOKEN_SIGNING_SECRET
  if (!secret) throw new Error('TOKEN_SIGNING_SECRET_MISSING')
  return crypto.createHmac('sha256', secret).update(s).digest('hex')
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

export function issueAdminToken(username) {
  const payload = {
    u: username,
    role: 'admin',
    exp: new Date(Date.now() + 12 * 3600 * 1000).toISOString()
  }
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = hmac(payloadB64)
  return `adm.v1.${payloadB64}.${sig}`
}

export async function verifyRequestAuth(req) {
  if (!process.env.CODE_PEPPER || !process.env.TOKEN_SIGNING_SECRET) {
    return { ok: false, status: 503, error: 'Server auth not configured' }
  }

  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, status: 401, error: 'No token' }

  // Admin token: adm.v1.<payloadB64>.<sig>
  if (token.startsWith('adm.v1.')) {
    const parts = token.split('.')
    if (parts.length !== 4) return { ok: false, status: 401, error: 'Token inválido' }
    const payloadB64 = parts[2]
    const sig = parts[3]
    if (hmac(payloadB64) !== sig) return { ok: false, status: 401, error: 'Token inválido' }
    try {
      const payload = JSON.parse(fromBase64Url(payloadB64))
      const now = new Date().toISOString()
      if (payload?.role !== 'admin' || !payload?.exp || payload.exp <= now) {
        return { ok: false, status: 401, error: 'Token expirado' }
      }
      return { ok: true, role: 'admin', username: payload.u || 'admin', token }
    } catch (_e) {
      return { ok: false, status: 401, error: 'Token inválido' }
    }
  }

  // Student stateless token: v2.<payloadB64>.<hmac>
  if (token.startsWith('v2.')) {
    const parts = token.split('.')
    if (parts.length !== 3) return { ok: false, status: 401, error: 'Token inválido' }
    const payloadB64 = parts[1]
    const sig = parts[2]
    if (hmac(payloadB64) !== sig) return { ok: false, status: 401, error: 'Token inválido' }
    try {
      const payload = JSON.parse(fromBase64Url(payloadB64))
      const now = new Date().toISOString()
      if (!payload?.courseId || !payload?.exp || payload.exp <= now) {
        return { ok: false, status: 401, error: 'Token expirado' }
      }
      return { ok: true, role: 'user', courseId: payload.courseId, token }
    } catch (_e) {
      return { ok: false, status: 401, error: 'Token inválido' }
    }
  }

  // Student opaque token: <raw>.<sig>
  const [raw, sig] = token.split('.')
  if (!raw || !sig || hmac(raw) !== sig) return { ok: false, status: 401, error: 'Token inválido' }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { ok: false, status: 503, error: 'Server auth not configured' }

  const tokenHash = sha256(`${token}|${process.env.CODE_PEPPER}`)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('sessions')
    .select('course_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !data) return { ok: false, status: 401, error: 'Token no encontrado' }
  if (data.expires_at && data.expires_at <= now) return { ok: false, status: 401, error: 'Token expirado' }

  return { ok: true, role: 'user', courseId: data.course_id, token }
}

export function unauthorizedResponse(auth) {
  return new Response(JSON.stringify({ error: auth?.error || 'Unauthorized' }), { status: auth?.status || 401 })
}

