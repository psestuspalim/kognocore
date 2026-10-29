const text = value => String(value ?? '').trim();
const join = values => values.map(text).filter(Boolean).join('; ');

export function answerOutcome(entry = {}) {
  const correct = entry.is_correct === true;
  const revisions = Array.isArray(entry.answer_revisions) ? entry.answer_revisions : [];
  const manual = correct && Boolean(entry.self_correction);
  return {
    label: entry.admin_review ? 'Validada por el administrador' : manual ? 'Marcada como correcta por el alumno'
      : revisions.length ? (correct ? 'Correcta tras editar y reevaluar' : 'Incorrecta tras editar y reevaluar')
        : correct ? 'Correcta en la evaluación inicial' : 'Incorrecta',
    originalAnswer: revisions.length ? revisions[0].selected_answer ?? '' : manual ? entry.selected_answer ?? '' : null,
    revisionCount: revisions.length,
    changedAt: entry.admin_review?.reviewed_at || revisions.at(-1)?.corrected_at || entry.self_correction?.corrected_at || null
  };
}

// Never infer a student's correct answers from questions absent in the error list.
export function recordedAnswers(attempt = {}) {
  return attempt.answer_log?.length ? attempt.answer_log
    : [...(attempt.wrong_questions || []).map(answer => ({ ...answer, is_correct: false })), ...(attempt.admin_reviewed_answers || [])];
}

// Prefer the saved answer so historical reports keep the original answer key.
export function correctAnswerText(entry = {}, question = {}) {
  if (text(entry.correct_answer)) return text(entry.correct_answer);
  const details = entry.result?.detalle;
  if (Array.isArray(details)) {
    const expected = join(details.map(detail => {
      const label = detail.clave ?? (detail.blanco ? `Espacio ${detail.blanco}` : detail.posicion);
      return text(detail.esperado) ? `${label != null ? `${label}: ` : ''}${detail.esperado}` : '';
    }));
    if (expected) return expected;
  }
  for (const source of [entry, question]) {
    if (text(source.correct_answer)) return text(source.correct_answer);
    const options = source.answerOptions?.length ? source.answerOptions : source.options;
    if (Array.isArray(options)) {
      const expected = join(options.filter(o => o.isCorrect || o.c || o.correct)
        .map(o => o.text ?? o.t ?? o.value ?? o.label));
      if (expected) return expected;
    }
    const answer = source.respuesta;
    if (answer) {
      if (text(answer.canonico)) return text(answer.canonico);
      if (answer.valor != null || answer.rango) {
        return `${answer.rango ? answer.rango.join('–') : answer.valor} ${answer.unidad ?? ''}`.trim();
      }
      if (answer.elementos || answer.pasos) return join((answer.elementos || answer.pasos).map((item, i) => `${i + 1}: ${item.canonico}`));
      if (answer.pares) return join(answer.pares.map(item => `${item.clave}: ${item.canonico}`));
    }
    const blanks = source.blancos || answer?.blancos;
    if (blanks) return join(Object.entries(blanks).map(([key, item]) => `Espacio ${key}: ${item.canonico}`));
  }
  return '';
}
