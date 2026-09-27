import { randomUUID } from 'node:crypto';
import { requireAdmin, requireDataActor } from './_auth.mjs';
import { canAccessCourse } from './_students.mjs';
import { changeQuiz, readQuiz, regradeQuizAttempts } from './_question-review.mjs';
import { matchesQuestion, questionIdentity } from '../src/lib/question-review.js';
import { validateNormalizedQuiz } from '../src/lib/quiz-normalization.js';

const fail = error => Response.json({ error: error.message || 'No se pudo procesar la revisión.' }, { status: error.status || 500 });

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  try {
    const reviews = [];
    for (let offset = 0; ; offset += 200) {
      const { data, error } = await auth.supabase.from('quizzes').select('id, payload').order('id').range(offset, offset + 199);
      if (error) throw error;
      for (const row of data || []) for (const report of row.payload.question_reviews || []) {
        const question = row.payload.questions?.find(q => matchesQuestion(q, report.question));
        reviews.push({ ...report, quiz_id: row.id, quiz_title: row.payload.title, current_question: question || report.question });
      }
      if ((data || []).length < 200) break;
    }
    return Response.json({ reviews: reviews.sort((a, b) => b.created_at.localeCompare(a.created_at)) });
  } catch (error) { return fail(error); }
}

export async function POST(req) {
  const auth = await requireDataActor(req);
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    if (!body.quiz_id || !body.question || typeof body.reason !== 'string' || body.reason.length > 2000) {
      return Response.json({ error: 'Indica la pregunta y un motivo de hasta 2000 caracteres.' }, { status: 400 });
    }
    const id = randomUUID();
    let report;
    await changeQuiz(auth.supabase, body.quiz_id, quiz => {
      if (!canAccessCourse(auth.actor, quiz.course_id)) throw Object.assign(new Error('Acceso denegado.'), { status: 403 });
      const question = quiz.questions?.find(q => matchesQuestion(q, body.question));
      if (!question) throw Object.assign(new Error('La pregunta no está disponible en el servidor. Actualiza el cuestionario.'), { status: 409 });
      const reporter = auth.actor.learnerId || auth.actor.user?.id || 'course-session';
      const existing = (quiz.question_reviews || []).find(r => r.reporter === reporter && r.status === 'pending' && matchesQuestion(r.question, question));
      if (existing) { report = existing; return quiz; }
      report = { id, question, reason: body.reason.trim(), reporter, status: 'pending', created_at: new Date().toISOString() };
      return { ...quiz, question_reviews: [...(quiz.question_reviews || []), report] };
    });
    return Response.json({ report: { id: report.id, status: report.status } });
  } catch (error) { return fail(error); }
}

export async function PATCH(req) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    if (!body.quiz_id || !body.report_id) return Response.json({ error: 'Revisión inválida.' }, { status: 400 });
    let quiz;
    if (body.action === 'retry') {
      quiz = (await readQuiz(auth.supabase, body.quiz_id)).payload;
      if (!quiz.question_reviews?.some(r => r.id === body.report_id && r.status === 'recalculating')) {
        return Response.json({ error: 'No hay un recálculo pendiente.' }, { status: 409 });
      }
    } else {
      quiz = await changeQuiz(auth.supabase, body.quiz_id, current => {
        const report = current.question_reviews?.find(r => r.id === body.report_id);
        if (!report || report.status !== 'pending') throw Object.assign(new Error('La revisión ya cambió. Actualiza la bandeja.'), { status: 409 });
        const index = current.questions?.findIndex(q => matchesQuestion(q, report.question)) ?? -1;
        if (index < 0) throw Object.assign(new Error('Pregunta no encontrada.'), { status: 404 });
        const before = current.questions[index];
        if (JSON.stringify(before) !== JSON.stringify(body.expected_question)) throw Object.assign(new Error('Otro administrador modificó la pregunta. Actualiza la bandeja.'), { status: 409 });
        const after = { ...before, ...body.question, id: before.id, questionId: before.questionId };
        if (questionIdentity(after) !== questionIdentity(before)) throw new Error('No se puede cambiar la identidad de la pregunta.');
        if ((after.tipo || after.type) !== (before.tipo || before.type)) throw Object.assign(new Error('Conserva el tipo de pregunta para recalificar las respuestas.'), { status: 400 });
        if (before.options && !before.answerOptions) after.options = after.answerOptions;
        const errors = validateNormalizedQuiz({ title: current.title || 'Quiz', questions: [after] });
        if (errors.length) throw Object.assign(new Error(errors.map(e => e.text).join(' ')), { status: 400 });
        if ((after.answerOptions || []).some(o => !String(o.text || '').trim())) throw Object.assign(new Error('Todas las opciones necesitan texto.'), { status: 400 });
        const oldIds = (before.answerOptions || before.options || []).map(o => String(o.id));
        const newIds = (after.answerOptions || []).map(o => String(o.id));
        if (new Set(newIds).size !== newIds.length || oldIds.length !== newIds.length || oldIds.some(id => !newIds.includes(id))) {
          throw Object.assign(new Error('Conserva las opciones y sus identificadores; puedes corregir su texto y la respuesta correcta.'), { status: 400 });
        }
        const revision = Number(current.review_revision || 0) + 1;
        const correction = { before, after, revision, created_at: new Date().toISOString(), admin: auth.user.id };
        return { ...current, review_revision: revision,
          questions: current.questions.map((q, i) => i === index ? after : q),
          question_corrections: [...(current.question_corrections || []), correction],
          question_reviews: current.question_reviews.map(r => r.status === 'pending' && matchesQuestion(r.question, before)
            ? { ...r, status: 'recalculating', revision } : r) };
      });
    }
    const result = await regradeQuizAttempts(auth.supabase, { ...quiz, id: body.quiz_id });
    await changeQuiz(auth.supabase, body.quiz_id, current => ({ ...current, question_reviews: current.question_reviews.map(r =>
      r.status === 'recalculating' && r.revision <= quiz.review_revision ? { ...r, status: 'resolved', resolved_at: new Date().toISOString(), ...result } : r) }));
    return Response.json({ ok: true, ...result });
  } catch (error) { return fail(error); }
}
