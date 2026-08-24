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
    if (!supabase || !process.env.CODE_PEPPER) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const code = (body?.code || '').trim().toUpperCase()
    const courseId = body?.course_id || null
    const rawMaxUses = body?.max_uses
    const hasMaxUses = rawMaxUses !== undefined && rawMaxUses !== null && String(rawMaxUses).trim() !== ''
    const maxUses = hasMaxUses ? Number(rawMaxUses) : null
    const expiresAt = body?.expires_at ? new Date(body.expires_at).toISOString() : null

    if (!code || code.length < 8 || !courseId) {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 })
    }

    const codeHash = sha256(`${code}|${process.env.CODE_PEPPER}`)

    const { error } = await supabase.from('invites').insert({
      code_hash: codeHash,
      course_id: courseId,
      max_uses: hasMaxUses ? (maxUses > 0 ? maxUses : 1) : null,
      uses: 0,
      expires_at: expiresAt
    })

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo crear invite', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
