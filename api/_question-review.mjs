import { applyQuestionCorrections, withQuestionIdentities } from '../src/lib/question-review.js';

export async function readQuiz(db, id) {
  const { data, error } = await db.from('quizzes').select('id, payload, updated_date').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('Cuestionario no encontrado.'), { status: 404 });
  if (data.payload.questions) data.payload = { ...data.payload, questions: data.payload.questions.map(withQuestionIdentities) };
  return data;
}

// Optimistic locking protects reports and corrections from simultaneous reviewers.
export async function changeQuiz(db, id, transform) {
  for (let retry = 0; retry < 5; retry++) {
    const row = await readQuiz(db, id);
    const payload = await transform(row.payload);
    const now = new Date(Math.max(Date.now(), new Date(row.updated_date || 0).getTime() + 1)).toISOString();
    let query = db.from('quizzes').update({ payload: { ...payload, updated_date: now }, updated_date: now }).eq('id', id);
    query = row.updated_date ? query.eq('updated_date', row.updated_date) : query.is('updated_date', null);
    const { data, error } = await query.select('payload');
    if (error) throw error;
    if (data?.length) return data[0].payload;
  }
  throw Object.assign(new Error('El cuestionario cambió. Vuelve a intentar.'), { status: 409 });
}

export async function regradeQuizAttempts(db, quiz) {
  let count = 0, ungradable = 0;
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await db.from('quiz_attempts').select('id').eq('payload->>quiz_id', quiz.id)
      .order('id').range(offset, offset + 199);
    if (error) throw error;
    for (const item of data || []) {
      let saved = false;
      for (let retry = 0; retry < 5; retry++) {
        const { data: row, error: readError } = await db.from('quiz_attempts').select('payload, updated_date').eq('id', item.id).maybeSingle();
        if (readError) throw readError;
        if (!row) { saved = true; break; }
        const payload = applyQuestionCorrections(row.payload, quiz);
        if (payload === row.payload) { ungradable += payload.review_ungradable_count || 0; saved = true; break; }
        let query = db.from('quiz_attempts').update({ payload, updated_date: new Date().toISOString() }).eq('id', item.id);
        query = row.updated_date ? query.eq('updated_date', row.updated_date) : query.is('updated_date', null);
        const result = await query.select('id');
        if (result.error) throw result.error;
        if (result.data?.length) { count++; ungradable += payload.review_ungradable_count || 0; saved = true; break; }
      }
      if (!saved) throw new Error('Hay respuestas en curso. Reintenta completar el recálculo.');
    }
    if ((data || []).length < 200) break;
  }
  return { count, ungradable };
}
