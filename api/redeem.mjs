import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

function sha256(s) {
    return crypto.createHash('sha256').update(s).digest('hex')
}

function hmac(s) {
    const secret = process.env.TOKEN_SIGNING_SECRET
    if (!secret) throw new Error('TOKEN_SIGNING_SECRET_MISSING')
    return crypto.createHmac('sha256', secret).update(s).digest('hex')
}

function toBase64Url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

function issueStatelessToken(courseId, expiresAtIso) {
    const payload = JSON.stringify({ courseId, exp: expiresAtIso })
    const payloadB64 = toBase64Url(payload)
    const signature = hmac(payloadB64)
    return `v2.${payloadB64}.${signature}`
}

export async function POST(req) {
    try {
        const supabase = getSupabaseAdmin()
        if (!supabase || !process.env.CODE_PEPPER || !process.env.TOKEN_SIGNING_SECRET) {
            return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
        }

        const { code } = await req.json()
        if (!code || typeof code !== 'string' || code.length < 8) {
            return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 400 })
        }

        const codeHash = sha256(`${code.trim()}|${process.env.CODE_PEPPER}`)

        // Busca invite válido
        const now = new Date().toISOString()
        const { data: invite, error } = await supabase
            .from('invites')
            .select('id, course_id, expires_at, used_at, max_uses, uses')
            .eq('code_hash', codeHash)
            .maybeSingle()

        if (error || !invite) return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 401 })
        if (invite.expires_at && invite.expires_at <= now) return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 401 })

        const uses = invite.uses ?? 0
        const maxUses = invite.max_uses
        if (maxUses && uses >= maxUses) {
            return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 401 })
        }

        // Expiración token de acceso
        const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() // 7 días

        // Emite token opaco (random) + firma (HMAC) para detectar manipulación
        const raw = crypto.randomBytes(32).toString('hex')
        const sig = hmac(raw)
        let token = `${raw}.${sig}`

        const tokenHash = sha256(`${token}|${process.env.CODE_PEPPER}`)

        // Guarda sesión (best effort). Si falla, cae a token stateless para no bloquear acceso.
        const { error: sErr } = await supabase.from('sessions').insert({
            token_hash: tokenHash,
            course_id: invite.course_id,
            expires_at: expiresAt
        })
        if (sErr) {
            token = issueStatelessToken(invite.course_id, expiresAt)
        }

        // Consume uso (best effort, no bloquea acceso)
        const { error: uErr } = await supabase.from('invites')
            .update({ uses: uses + 1, used_at: maxUses && uses + 1 >= maxUses ? now : invite.used_at })
            .eq('id', invite.id)

        if (uErr) {
            console.error('redeem warning: failed to update invite usage', uErr.message)
        }

        return new Response(JSON.stringify({
            token,
            courseId: invite.course_id,
            expiresAt
        }), { status: 200 })
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
    }
}
