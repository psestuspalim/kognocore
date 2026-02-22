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
      .from('quizzes')
      .select('id, payload, created_date, updated_date')

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo listar quizzes', details: error.message }), { status: 500 })
    }

    const quizzes = (data || []).map((row) => ({
      id: row.id,
      created_date: row.created_date || row.payload?.created_date,
      updated_date: row.updated_date || row.payload?.updated_date,
      ...(row.payload || {})
    }))

    return new Response(JSON.stringify({ quizzes }), { status: 200 })
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
    const quiz = body?.quiz
    if (!quiz || !quiz.id) {
      return new Response(JSON.stringify({ error: 'Quiz inválido' }), { status: 400 })
    }

    const now = new Date().toISOString()
    const row = {
      id: quiz.id,
      payload: quiz,
      created_date: quiz.created_date || now,
      updated_date: quiz.updated_date || now
    }

    const { error } = await supabase.from('quizzes').upsert(row, { onConflict: 'id' })
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo guardar quiz', details: error.message }), { status: 500 })
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

    const { data: current, error: getErr } = await supabase
      .from('quizzes')
      .select('id, payload, created_date')
      .eq('id', id)
      .maybeSingle()

    if (getErr) {
      return new Response(JSON.stringify({ error: 'No se pudo leer quiz', details: getErr.message }), { status: 500 })
    }
    if (!current) {
      return new Response(JSON.stringify({ error: 'Quiz no encontrado' }), { status: 404 })
    }

    const merged = {
      ...(current.payload || {}),
      ...data,
      id,
      updated_date: new Date().toISOString()
    }

    const { error } = await supabase.from('quizzes').update({
      payload: merged,
      updated_date: merged.updated_date
    }).eq('id', id)

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo actualizar quiz', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, quiz: merged }), { status: 200 })
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

    const { error } = await supabase.from('quizzes').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo eliminar quiz', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

