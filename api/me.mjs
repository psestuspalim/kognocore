import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex') }
function hmac(s) { return crypto.createHmac('sha256', process.env.TOKEN_SIGNING_SECRET).update(s).digest('hex') }

export async function GET(req) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })

    const [raw, sig] = token.split('.')
    if (!raw || !sig || hmac(raw) !== sig) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })

    const tokenHash = sha256(`${token}|${process.env.CODE_PEPPER}`)
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from('sessions')
        .select('course_id, expires_at')
        .eq('token_hash', tokenHash)
        .maybeSingle()

    if (error || !data) return new Response(JSON.stringify({ error: 'Token no encontrado' }), { status: 401 })
    if (data.expires_at && data.expires_at <= now) return new Response(JSON.stringify({ error: 'Token expirado' }), { status: 401 })

    return new Response(JSON.stringify({ courseId: data.course_id }), { status: 200 })
}
