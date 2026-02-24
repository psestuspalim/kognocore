import { getSupabaseAdmin, unauthorizedResponse, verifyRequestAuth } from './_auth.mjs'

const TABLE_BY_ENTITY = {
  MetacogQuestion: 'metacog_questions',
  MetacogSession: 'metacog_sessions',
  MetacogAnalysis: 'metacog_analyses',
  MetacogAssignment: 'metacog_assignments'
}

const resolveTable = (entity) => TABLE_BY_ENTITY[entity] || null

export async function GET(req) {
  try {
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const url = new URL(req.url)
    const entity = url.searchParams.get('entity')
    const table = resolveTable(entity)
    if (!table) {
      return new Response(JSON.stringify({ error: 'entity inválida' }), { status: 400 })
    }

    let query = supabase
      .from(table)
      .select('id, payload, created_date, updated_date')
      .order('created_date', { ascending: false })

    for (const [key, value] of url.searchParams.entries()) {
      if (key === 'entity' || value === undefined || value === null || value === '') continue
      query = query.eq(`payload->>${key}`, value)
    }

    const { data, error } = await query
    if (error) {
      return new Response(JSON.stringify({ error: `No se pudo listar ${entity}`, details: error.message }), { status: 500 })
    }

    const records = (data || []).map((row) => ({
      id: row.id,
      created_date: row.created_date || row.payload?.created_date,
      updated_date: row.updated_date || row.payload?.updated_date,
      ...(row.payload || {})
    }))

    return new Response(JSON.stringify({ records }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function POST(req) {
  try {
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const entity = body?.entity
    const table = resolveTable(entity)
    const record = body?.record

    if (!table || !record || !record.id) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 })
    }
    if (auth.role !== 'admin' && entity !== 'MetacogAnalysis') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    const now = new Date().toISOString()
    const row = {
      id: record.id,
      payload: record,
      created_date: record.created_date || now,
      updated_date: record.updated_date || now
    }

    const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' })
    if (error) {
      return new Response(JSON.stringify({ error: `No se pudo guardar ${entity}`, details: error.message }), { status: 500 })
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

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const entity = body?.entity
    const table = resolveTable(entity)
    const id = body?.id
    const data = body?.data || {}

    if (!table || !id) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 })
    }
    if (auth.role !== 'admin' && entity !== 'MetacogAnalysis') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    const { data: current, error: getErr } = await supabase
      .from(table)
      .select('id, payload')
      .eq('id', id)
      .maybeSingle()

    if (getErr) {
      return new Response(JSON.stringify({ error: `No se pudo leer ${entity}`, details: getErr.message }), { status: 500 })
    }
    if (!current) {
      return new Response(JSON.stringify({ error: `${entity} no encontrado` }), { status: 404 })
    }

    const merged = {
      ...(current.payload || {}),
      ...data,
      id,
      updated_date: new Date().toISOString()
    }

    const { error } = await supabase
      .from(table)
      .update({ payload: merged, updated_date: merged.updated_date })
      .eq('id', id)

    if (error) {
      return new Response(JSON.stringify({ error: `No se pudo actualizar ${entity}`, details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, record: merged }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function DELETE(req) {
  try {
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const url = new URL(req.url)
    const entity = url.searchParams.get('entity')
    const table = resolveTable(entity)
    const id = url.searchParams.get('id')
    if (!table || !id) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 })
    }
    if (auth.role !== 'admin' && entity !== 'MetacogAnalysis') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: `No se pudo eliminar ${entity}`, details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
