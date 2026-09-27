import * as questionReviews from './_question-reviews.mjs'
import { withQuestionIdentities } from '../src/lib/question-review.js'
import { changeQuiz } from './_question-review.mjs'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, requireDataActor } from './_auth.mjs'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req) {
  if (new URL(req.url).searchParams.get('resource') === 'question-reviews') return questionReviews.GET(req)
  try {
    const authorization = await requireDataActor(req)
    if (authorization.response) return authorization.response

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    let query = supabase
      .from('quizzes')
      .select('id, payload, created_date, updated_date')

    if (authorization.actor.kind === 'student') {
      const courseIds = authorization.actor.courseIds || [authorization.actor.courseId]
      if (!courseIds.length) return Response.json({ quizzes: [] })
      query = query.in('payload->>course_id', courseIds)
    }

    const { data, error } = await query

    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo listar quizzes', details: error.message }), { status: 500 })
    }

    const quizzes = (data || []).map((row) => ({
      id: row.id,
      created_date: row.created_date || row.payload?.created_date,
      updated_date: row.updated_date || row.payload?.updated_date,
      ...(row.payload || {})
    }))

    quizzes.forEach(quiz => { if (quiz.questions) quiz.questions = quiz.questions.map(withQuestionIdentities) })
    if (authorization.actor.kind !== 'admin') {
      quizzes.forEach(quiz => {
        delete quiz.question_reviews;
        quiz.question_corrections = (quiz.question_corrections || []).map(({ admin, ...correction }) => correction);
      });
    }
    return new Response(JSON.stringify({ quizzes }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

export async function POST(req) {
  if (new URL(req.url).searchParams.get('resource') === 'question-reviews') return questionReviews.POST(req)
  try {
    const authorization = await requireAdmin(req)
    if (authorization.response) return authorization.response

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server auth not configured' }), { status: 503 })
    }

    const body = await req.json()
    const quiz = body?.quiz
    if (!quiz || !quiz.id) {
      return new Response(JSON.stringify({ error: 'Quiz inválido' }), { status: 400 })
    }

    const { data: existing, error: readError } = await supabase.from('quizzes').select('id').eq('id', quiz.id).maybeSingle()
    if (readError) throw readError
    if (existing) {
      const updated = await changeQuiz(supabase, quiz.id, current => {
        if (Number(current.review_revision || 0) > Number(quiz.review_revision || 0)) throw new Error('El cuestionario tiene correcciones recientes. Actualiza antes de editar.')
        return { ...current, ...quiz, question_reviews: current.question_reviews || [], question_corrections: current.question_corrections || [], review_revision: current.review_revision || 0 }
      })
      return Response.json({ ok: true, quiz: updated })
    }
    delete quiz.question_reviews
    delete quiz.question_corrections
    delete quiz.review_revision
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
  if (new URL(req.url).searchParams.get('resource') === 'question-reviews') return questionReviews.PATCH(req)
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

    const merged = await changeQuiz(supabase, id, latest => {
      if (data.questions && Number(latest.review_revision || 0) > Number(data.review_revision || 0)) throw new Error('Actualiza el cuestionario antes de editarlo.')
      return { ...latest, ...data, id, question_reviews: latest.question_reviews || [], question_corrections: latest.question_corrections || [], review_revision: latest.review_revision || 0 }
    })

    return new Response(JSON.stringify({ ok: true, quiz: merged }), { status: 200 })
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

    const { error } = await supabase.from('quizzes').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: 'No se pudo eliminar quiz', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
