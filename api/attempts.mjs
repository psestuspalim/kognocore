import { getSupabaseAdmin, unauthorizedResponse, verifyRequestAuth } from './_auth.mjs'

export async function GET(req) {
  try {
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)
    if (auth.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const url = new URL(req.url)
    const learnerId = url.searchParams.get('learner_id')
    const userEmail = url.searchParams.get('user_email')

    let query = supabase
      .from('quiz_attempts')
      .select('id, payload, created_date, updated_date')
      .order('created_date', { ascending: false })

    if (learnerId) query = query.eq('payload->>learner_id', learnerId)
    if (userEmail) query = query.eq('payload->>user_email', userEmail)

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
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)
    if (auth.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const attempt = body?.attempt
    if (!attempt || !attempt.id) {
      return new Response(JSON.stringify({ error: 'Intento inválido' }), { status: 400 })
    }

    const now = new Date().toISOString()
    const row = {
      id: attempt.id,
      payload: attempt,
      created_date: attempt.created_date || now,
      updated_date: attempt.updated_date || now
    }

    const { error } = await supabase.from('quiz_attempts').upsert(row, { onConflict: 'id' })
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo guardar intento', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)
    if (auth.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

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
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)
    if (auth.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

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
