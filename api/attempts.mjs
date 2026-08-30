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

    if (authorization.actor.kind === 'student' && !learnerId && !userEmail) {
      return new Response(JSON.stringify({ error: 'learner_id o user_email requerido' }), { status: 400 })
    }

    let query = supabase
      .from('quiz_attempts')
      .select('id, payload, created_date, updated_date')
      .order('created_date', { ascending: false })

    if (learnerId) query = query.eq('payload->>learner_id', learnerId)
    else if (userEmail) query = query.eq('payload->>user_email', userEmail)
    if (authorization.actor.kind === 'admin' && userEmail) query = query.eq('payload->>user_email', userEmail)

    const { data, error } = await query
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo listar intentos', details: error.message }), { status: 500 })
    }

    const attempts = (data || []).map((row) => ({
      id: row.id,
      created_date: row.created_date || row.payload?.created_date,
      updated_date: row.updated_date || row.payload?.updated_date,
      ...(row.payload || {})
    }))

    return new Response(JSON.stringify({ attempts }), { status: 200 })
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
    const attempt = body?.attempt
    if (!attempt || !attempt.id) {
      return new Response(JSON.stringify({ error: 'Intento inválido' }), { status: 400 })
    }

    const effectiveLearnerId = attempt.learner_id || (authorization.actor.user?.id ? `user_${authorization.actor.user.id}` : null)
    if (authorization.actor.kind === 'student' && !effectiveLearnerId) {
      return new Response(JSON.stringify({ error: 'learner_id requerido' }), { status: 400 })
    }

    const safeAttempt = authorization.actor.kind === 'student'
      ? {
          ...attempt,
          learner_id: String(effectiveLearnerId),
          user_email: attempt.user_email || (authorization.actor.user?.email ? authorization.actor.user.email : `learner+${effectiveLearnerId}@kognocore.local`),
          course_id: authorization.actor.courseId || attempt.course_id
        }
      : attempt

    const { data: existing, error: existingError } = await supabase
      .from('quiz_attempts')
      .select('payload')
      .eq('id', attempt.id)
      .maybeSingle()

    if (existingError) {
      return new Response(JSON.stringify({ error: 'No se pudo validar el intento', details: existingError.message }), { status: 500 })
    }
    if (
      authorization.actor.kind === 'student' &&
      existing?.payload?.learner_id &&
      String(existing.payload.learner_id) !== String(safeAttempt.learner_id)
    ) {
      return new Response(JSON.stringify({ error: 'No puedes modificar este intento' }), { status: 403 })
    }

    const now = new Date().toISOString()
    const row = {
      id: attempt.id,
      payload: safeAttempt,
      created_date: safeAttempt.created_date || now,
      updated_date: safeAttempt.updated_date || now
    }

    const { error } = await supabase.from('quiz_attempts').upsert(row, { onConflict: 'id' })
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo guardar intento', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, attempt: safeAttempt }), { status: 200 })
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
      .from('quiz_attempts')
      .select('id, payload')
      .eq('id', id)
      .maybeSingle()

    if (getErr) {
      return new Response(JSON.stringify({ error: 'No se pudo leer intento', details: getErr.message }), { status: 500 })
    }
    if (!current) {
      return new Response(JSON.stringify({ error: 'Intento no encontrado' }), { status: 404 })
    }

    const merged = {
      ...(current.payload || {}),
      ...data,
      id,
      updated_date: new Date().toISOString()
    }

    const { error } = await supabase.from('quiz_attempts').update({
      payload: merged,
      updated_date: merged.updated_date
    }).eq('id', id)

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo actualizar intento', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, attempt: merged }), { status: 200 })
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
    if (!id) {
      return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 })
    }

    const { error } = await supabase.from('quiz_attempts').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo eliminar intento', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
