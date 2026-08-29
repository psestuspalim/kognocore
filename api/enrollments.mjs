import { createClient } from '@supabase/supabase-js'
import { requireAdmin, requireDataActor } from './_auth.mjs'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req) {
  try {
    const authorization = await requireDataActor(req)
    if (authorization.response) return authorization.response

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const url = new URL(req.url)
    const learnerId = url.searchParams.get('learner_id')
    const userEmail = url.searchParams.get('user_email')
    const courseId = url.searchParams.get('course_id')

    if (authorization.actor.kind === 'student' && !learnerId) {
      return new Response(JSON.stringify({ error: 'learner_id requerido' }), { status: 400 })
    }

    let query = supabase
      .from('enrollments')
      .select('id, payload, created_date, updated_date')
      .order('created_date', { ascending: false })

    if (learnerId) query = query.eq('payload->>learner_id', learnerId)
    if (authorization.actor.kind === 'admin' && userEmail) query = query.eq('payload->>user_email', userEmail)
    if (authorization.actor.kind === 'student') {
      query = query.eq('payload->>course_id', authorization.actor.courseId)
    } else if (courseId) {
      query = query.eq('payload->>course_id', courseId)
    }

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
    const authorization = await requireDataActor(req)
    if (authorization.response) return authorization.response

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const enrollment = body?.enrollment
    if (!enrollment || !enrollment.id) {
      return new Response(JSON.stringify({ error: 'Inscripción inválida' }), { status: 400 })
    }

    if (authorization.actor.kind === 'student') {
      if (!enrollment.learner_id || String(enrollment.course_id) !== String(authorization.actor.courseId)) {
        return new Response(JSON.stringify({ error: 'La inscripción no corresponde a esta sesión' }), { status: 403 })
      }
    }

    const safeEnrollment = authorization.actor.kind === 'student'
      ? {
          ...enrollment,
          learner_id: String(enrollment.learner_id),
          user_email: `learner+${enrollment.learner_id}@kognocore.local`,
          course_id: authorization.actor.courseId,
          status: 'approved'
        }
      : enrollment

    const { data: existing, error: existingError } = await supabase
      .from('enrollments')
      .select('payload')
      .eq('id', enrollment.id)
      .maybeSingle()

    if (existingError) {
      return new Response(JSON.stringify({ error: 'No se pudo validar la inscripción', details: existingError.message }), { status: 500 })
    }
    if (
      authorization.actor.kind === 'student' &&
      existing?.payload?.learner_id &&
      String(existing.payload.learner_id) !== String(safeEnrollment.learner_id)
    ) {
      return new Response(JSON.stringify({ error: 'No puedes modificar esta inscripción' }), { status: 403 })
    }

    const now = new Date().toISOString()
    const row = {
      id: enrollment.id,
      payload: safeEnrollment,
      created_date: safeEnrollment.created_date || now,
      updated_date: safeEnrollment.updated_date || now
    }

    const { error } = await supabase.from('enrollments').upsert(row, { onConflict: 'id' })
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo guardar inscripción', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, enrollment: safeEnrollment }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    const authorization = await requireAdmin(req)
    if (authorization.response) return authorization.response

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
    const authorization = await requireAdmin(req)
    if (authorization.response) return authorization.response

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const purgeAll = url.searchParams.get('purge_all')

    if (purgeAll === 'true') {
      const { error } = await supabase.from('enrollments').delete().neq('id', '')
      if (error) {
        return new Response(JSON.stringify({ error: 'No se pudo purgar inscripciones', details: error.message }), { status: 500 })
      }
      return new Response(JSON.stringify({ ok: true, purged: true }), { status: 200 })
    }

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
