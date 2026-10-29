export function approveAnswer(attempt, review, reviewer, now = new Date().toISOString()) {
  if (!attempt.is_completed) throw new Error('Espera a que el alumno termine el intento antes de modificar su calificación.');
  const source = attempt.answer_log?.length ? 'answer_log' : 'wrong_questions';
  const answers = attempt[source] || [];
  const entry = answers[review.index];
  if (review.source !== source || !Number.isInteger(review.index) || !entry
    || entry.question !== review.question || entry.selected_answer !== review.selected_answer) {
    throw new Error('La respuesta cambió. Actualiza el panel y vuelve a revisarla.');
  }
  if (entry.is_correct === true || entry.admin_review) throw new Error('Esta respuesta ya fue validada.');
  const reason = String(review.reason || '').trim();
  if (!reason || reason.length > 1000) throw new Error('Escribe un motivo de hasta 1000 caracteres.');
  const score = Number(attempt.score);
  if (review.expected_score !== score) throw new Error('La calificación cambió. Actualiza el panel antes de validar otra respuesta.');
  const total = Number(attempt.total_questions);
  if (!Number.isFinite(score) || !Number.isFinite(total) || score < 0 || score >= total) {
    throw new Error('El puntaje del intento no permite agregar otro acierto.');
  }
  const approved = {
    ...entry, is_correct: true,
    admin_review: { reviewed_at: now, reviewed_by: reviewer.id, reviewer_email: reviewer.email,
      reason, original_is_correct: entry.is_correct ?? false, original_score: entry.score,
      original_result: entry.result },
  };
  if (Number.isFinite(entry.max_score)) approved.score = entry.max_score;
  if (entry.result) approved.result = { ...entry.result, correcto: true, puntos: entry.result.max };
  const updated = { ...attempt, score: score + 1, updated_date: now };
  if ('percentage' in attempt) updated.percentage = (updated.score / total) * 100;
  if (source === 'answer_log') {
    updated.answer_log = answers.map((answer, index) => index === review.index ? approved : answer);
    updated.wrong_questions = updated.answer_log.filter(answer => answer.is_correct !== true);
  } else {
    updated.wrong_questions = answers.filter((_, index) => index !== review.index);
    updated.admin_reviewed_answers = [...(attempt.admin_reviewed_answers || []), approved];
  }
  updated.admin_reviews = [...(attempt.admin_reviews || []), {
    ...approved.admin_review, source, index: review.index, question: entry.question,
    selected_answer: entry.selected_answer, previous_score: score, score: updated.score,
  }];
  return updated;
}
