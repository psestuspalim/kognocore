import { motorAnatomia } from './normalizador.js';

export const questionIdentity = q => String(q?.question_id ?? q?.questionId ?? q?.id ?? '');
export function withQuestionIdentities(question, index = 0) {
  const options = question.answerOptions || question.options;
  return { ...question, questionId: questionIdentity(question) || `Q${index + 1}`,
    ...(Array.isArray(options) ? { answerOptions: options.map((option, i) => ({
      ...(typeof option === 'string' ? { text: option } : option), id: String(option.id ?? i)
    })) } : {}) };
}
const textOf = q => String(q?.question ?? q?.prompt ?? q?.text ?? '');
export const matchesQuestion = (entry, question) => {
  const a = questionIdentity(entry), b = questionIdentity(question);
  return a && b ? a === b : textOf(entry) === textOf(question);
};

// Keep the attempt's order: option IDs refer to content, never displayed letters.
export function correctedSnapshot(question, replacement) {
  const options = replacement.answerOptions || replacement.options || [];
  const oldOptions = question.answerOptions || question.options || [];
  const ordered = oldOptions.map(old => options.find(o => String(o.id) === String(old.id))).filter(Boolean);
  options.forEach(o => { if (!ordered.some(v => String(v.id) === String(o.id))) ordered.push(o); });
  return { ...question, ...replacement, answerOptions: ordered };
}

function regradeEntry(entry, correction) {
  if (!matchesQuestion(entry, correction.before)) return entry;
  const q = { ...correction.after, answerOptions: correction.after.answerOptions || correction.after.options || [] };
  let isCorrect;
  let result = entry.result;
  const type = q.tipo || q.type;
  if (q.respuesta && ['respuesta_corta', 'numerico', 'enumeracion', 'secuencia', 'cloze', 'relacion'].includes(type)) {
    if (!entry.inputs) return { ...entry, review_ungradable: true };
    const payload = ['enumeracion', 'secuencia'].includes(type) ? Object.values(entry.inputs)
      : ['cloze', 'relacion'].includes(type) ? entry.inputs : entry.inputs.text || '';
    result = motorAnatomia.calificar(q, payload);
    isCorrect = Boolean(result.correcto);
  } else if (entry.swipe_answer !== undefined) {
    const opt = q.answerOptions.find(o => String(o.id) === String(entry.selected_option_id));
    if (!opt) return { ...entry, review_ungradable: true };
    isCorrect = entry.swipe_answer === Boolean(opt.isCorrect);
  } else {
    let ids = entry.selected_option_ids || (entry.selected_option_id != null ? [entry.selected_option_id] : null);
    if (!ids) {
      const matching = (correction.before.answerOptions || correction.before.options || []).filter(o => o.text === entry.selected_answer);
      if (matching.length !== 1) return { ...entry, review_ungradable: true };
      ids = [matching[0].id];
    }
    const correctIds = (q.answerOptions || []).filter(o => o.isCorrect).map(o => String(o.id));
    isCorrect = ids.length === correctIds.length && ids.every(id => correctIds.includes(String(id)));
  }
  return {
    ...entry, original_question: entry.original_question ?? entry.question,
    original_is_correct: entry.original_is_correct ?? entry.is_correct,
    question_id: questionIdentity(q), question: textOf(q), is_correct: isCorrect,
    correct_answer: entry.swipe_answer !== undefined
      ? (q.answerOptions.find(o => String(o.id) === String(entry.selected_option_id))?.isCorrect ? 'Verdadero' : 'Falso')
      : (q.answerOptions || []).filter(o => o.isCorrect).map(o => o.text).join(' / '),
    answerOptions: q.answerOptions, explanation: q.feedback || q.justificacion || '',
    feedback: q.feedback || q.justificacion || '', justificacion: q.feedback || q.justificacion || '',
    rationale: q.feedback || q.justificacion || '', ...(result ? { result } : {}),
    review_ungradable: false, review_revision: correction.revision
  };
}

export function applyQuestionCorrections(attempt, quiz) {
  let updated = attempt;
  for (const correction of quiz?.question_corrections || []) {
    if (Number(updated.review_revision || 0) >= correction.revision) continue;
    const source = updated.answer_log?.length ? updated.answer_log
      : (updated.wrong_questions || []).map(e => ({ ...e, is_correct: false }));
    const missingAnswers = updated.answer_log_incomplete || !updated.answer_log?.length
      ? Math.max(0, Number(updated.answered_questions || (Number(updated.score || 0) + (updated.wrong_questions || []).length)) - source.length) : 0;
    const log = source.map(e => regradeEntry(e, correction));
    const delta = log.reduce((sum, e, i) => sum + Number(Boolean(e.is_correct)) - Number(Boolean(source[i].is_correct)), 0);
    let snapshot = updated.quiz_snapshot;
    if (snapshot?.questions) snapshot = { ...snapshot, review_revision: correction.revision, questions: snapshot.questions.map(q =>
      matchesQuestion(q, correction.before) ? correctedSnapshot(q, correction.after) : q) };
    updated = {
      ...updated, score: Math.max(0, Number(updated.score || 0) + delta),
      answer_log: log,
      ...(updated.answer_log?.length ? {} : { answer_log_incomplete: true }),
      wrong_questions: log.filter(e => !e.is_correct),
      ...(snapshot ? { quiz_snapshot: snapshot } : {}),
      review_revision: correction.revision, regraded_at: correction.created_at,
      review_ungradable_count: log.filter(e => e.review_ungradable).length + missingAnswers
    };
  }
  return updated;
}

export function applySessionCorrections(session, quiz) {
  const attempt = applyQuestionCorrections({
    score: session.score, answered_questions: Math.max(session.currentQuestionIndex || 0, session.answerLog?.length || 0), answer_log: session.answerLog, wrong_questions: session.wrongAnswers,
    quiz_snapshot: session.lightweightQuiz, review_revision: session.review_revision
  }, quiz);
  return { ...session, score: attempt.score, answerLog: attempt.answer_log || session.answerLog,
    wrongAnswers: attempt.wrong_questions, correctAnswers: (attempt.answer_log || []).filter(e => e.is_correct),
    lightweightQuiz: attempt.quiz_snapshot, review_revision: attempt.review_revision };
}
