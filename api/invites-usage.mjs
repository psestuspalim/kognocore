import crypto from 'crypto'
import { getSupabaseAdmin, unauthorizedResponse, verifyRequestAuth } from './_auth.mjs'

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export async function POST(req) {
  try {
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)
    if (auth.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

    const supabase = getSupabaseAdmin()
    if (!supabase || !process.env.CODE_PEPPER) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const codes = Array.isArray(body?.codes) ? body.codes : []
    const normalizedCodes = [...new Set(codes.map(c => String(c || '').trim().toUpperCase()).filter(Boolean))]

    if (normalizedCodes.length === 0) {
      return new Response(JSON.stringify({ usage: {} }), { status: 200 })
    }

    const hashByCode = new Map()
    const hashes = normalizedCodes.map((code) => {
      const hash = sha256(`${code}|${process.env.CODE_PEPPER}`)
      hashByCode.set(hash, code)
      return hash
    })

    const { data, error } = await supabase
      .from('invites')
      .select('code_hash, uses, max_uses, expires_at')
      .in('code_hash', hashes)

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo consultar invites', details: error.message }), { status: 500 })
    }

    const usage = {}
    for (const row of data || []) {
      const code = hashByCode.get(row.code_hash)
      if (!code) continue
      usage[code] = {
        uses: row.uses ?? 0,
        max_uses: row.max_uses ?? null,
        expires_at: row.expires_at ?? null
      }
    }

    return new Response(JSON.stringify({ usage }), { status: 200 })
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
