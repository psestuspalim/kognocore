import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_date', { ascending: false })

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo listar códigos', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ codes: data || [] }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function POST(req) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const code = body?.code
    if (!code || !code.id || !code.code) {
      return new Response(JSON.stringify({ error: 'Código inválido' }), { status: 400 })
    }

    const now = new Date().toISOString()
    const row = {
      id: code.id,
      code: code.code,
      course_id: code.course_id,
      course_name: code.course_name || null,
      is_active: code.is_active !== false,
      max_uses: code.max_uses || null,
      current_uses: code.current_uses || 0,
      expires_at: code.expires_at || null,
      created_date: code.created_date || now,
      updated_date: now
    }

    const { error } = await supabase.from('access_codes').upsert(row, { onConflict: 'id' })
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo guardar código', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const id = body?.id
    const data = body?.data || {}
    if (!id) {
      return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 })
    }

    const updates = { updated_date: new Date().toISOString() }
    if (data.is_active !== undefined) updates.is_active = data.is_active
    if (data.max_uses !== undefined) updates.max_uses = data.max_uses
    if (data.current_uses !== undefined) updates.current_uses = data.current_uses
    if (data.expires_at !== undefined) updates.expires_at = data.expires_at
    if (data.course_name !== undefined) updates.course_name = data.course_name

    const { error } = await supabase.from('access_codes').update(updates).eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo actualizar código', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function DELETE(req) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 })
    }

    const { error } = await supabase.from('access_codes').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo eliminar código', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
