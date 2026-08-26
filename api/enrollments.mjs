import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const url = new URL(req.url)
    const learnerId = url.searchParams.get('learner_id')
    const userEmail = url.searchParams.get('user_email')
    const courseId = url.searchParams.get('course_id')

    let query = supabase
      .from('enrollments')
      .select('id, payload, created_date, updated_date')
      .order('created_date', { ascending: false })

    if (learnerId) query = query.eq('payload->>learner_id', learnerId)
    if (userEmail) query = query.eq('payload->>user_email', userEmail)
    if (courseId) query = query.eq('payload->>course_id', courseId)

    const { data, error } = await query
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo listar inscripciones', details: error.message }), { status: 500 })
    }

    const enrollments = (data || []).map((row) => ({
      id: row.id,
      created_date: row.created_date || row.payload?.created_date,
      updated_date: row.updated_date || row.payload?.updated_date,
      ...(row.payload || {})
    }))

    return new Response(JSON.stringify({ enrollments }), { status: 200 })
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
    const enrollment = body?.enrollment
    if (!enrollment || !enrollment.id) {
      return new Response(JSON.stringify({ error: 'Inscripción inválida' }), { status: 400 })
    }

    const now = new Date().toISOString()
    const row = {
      id: enrollment.id,
      payload: enrollment,
      created_date: enrollment.created_date || now,
      updated_date: enrollment.updated_date || now
    }

    const { error } = await supabase.from('enrollments').upsert(row, { onConflict: 'id' })
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo guardar inscripción', details: error.message }), { status: 500 })
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
      .from('enrollments')
      .select('id, payload')
      .eq('id', id)
      .maybeSingle()

    if (getErr) {
      return new Response(JSON.stringify({ error: 'No se pudo leer inscripción', details: getErr.message }), { status: 500 })
    }
    if (!current) {
      return new Response(JSON.stringify({ error: 'Inscripción no encontrada' }), { status: 404 })
    }

    const merged = {
      ...(current.payload || {}),
      ...data,
      id,
      updated_date: new Date().toISOString()
    }

    const { error } = await supabase.from('enrollments').update({
      payload: merged,
      updated_date: merged.updated_date
    }).eq('id', id)

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo actualizar inscripción', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, enrollment: merged }), { status: 200 })
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

    const { error } = await supabase.from('enrollments').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo eliminar inscripción', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
