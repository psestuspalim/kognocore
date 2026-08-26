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

export async function POST(req) {
  try {
    const supabase = getSupabaseAdmin()
    const pepper = process.env.CODE_PEPPER
    if (!supabase || !pepper) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 503 })
    }

    const { code } = await req.json()
    if (!code || typeof code !== 'string' || code.length < 4) {
      return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 400 })
    }

    const codeHash = sha256(`${code.trim()}|${pepper}`)
    const now = new Date().toISOString()

    const { data: invite, error } = await supabase
      .from('invites')
      .select('id, course_id, expires_at, max_uses, uses')
      .eq('code_hash', codeHash)
      .maybeSingle()

    if (error || !invite) {
      return new Response(JSON.stringify({ error: 'Código no encontrado' }), { status: 404 })
    }

    if (invite.expires_at && invite.expires_at <= now) {
      return new Response(JSON.stringify({ error: 'Código expirado' }), { status: 410 })
    }

    const uses = invite.uses ?? 0
    if (invite.max_uses && uses >= invite.max_uses) {
      return new Response(JSON.stringify({ error: 'Código agotado' }), { status: 410 })
    }

    const { error: uErr } = await supabase.from('invites')
      .update({ uses: uses + 1, used_at: invite.max_uses && uses + 1 >= invite.max_uses ? now : null })
      .eq('id', invite.id)

    if (uErr) {
      console.error('invites-validate: failed to update usage', uErr.message)
    }

    return new Response(JSON.stringify({
      valid: true,
      courseId: invite.course_id
    }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
