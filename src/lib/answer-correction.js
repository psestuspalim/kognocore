export function canSelfCorrect(answer) {
  return Boolean(answer) && answer.is_correct !== true && answer.result?.correcto === false
    && Number.isFinite(answer.result.max) && answer.result.max > 0;
}

// Correct one occurrence, never all questions with the same wording.
export function selfCorrectAnswer(answerLog, index, question, inputs, grade, correctedAt = new Date().toISOString()) {
  const original = answerLog[index];
  if (!Number.isInteger(index) || !canSelfCorrect(original) || !question || !inputs
    || typeof inputs !== 'object' || Array.isArray(inputs) || typeof grade !== 'function') return null;
  const keys = Object.keys(original.inputs || { text: '' });
  if (!keys.length || keys.some(key => typeof inputs[key] !== 'string')) return null;
  const editedInputs = Object.fromEntries(keys.map(key => [key, inputs[key]]));
  const tipo = String(question.tipo || question.type || 'respuesta_corta').toLowerCase();
  const payload = tipo === 'cloze' || tipo === 'relacion' ? editedInputs
    : tipo === 'enumeracion' || tipo === 'secuencia' ? Object.values(editedInputs)
      : editedInputs.text || '';
  const result = grade(question, payload);
  if (typeof result?.correcto !== 'boolean' || !Number.isFinite(result.puntos)
    || !Number.isFinite(result.max) || result.max <= 0) throw new Error('No se pudo evaluar la respuesta.');
  const corrected = {
    ...original,
    inputs: editedInputs,
    selected_answer: JSON.stringify(payload),
    is_correct: result.correcto,
    score: result.puntos,
    max_score: result.max,
    result,
    answer_revisions: [...(original.answer_revisions || []), {
      corrected_at: correctedAt, inputs: original.inputs,
      selected_answer: original.selected_answer, is_correct: original.is_correct, result: original.result
    }]
  };
  delete corrected.self_correction;
  const nextLog = answerLog.map((answer, i) => i === index ? corrected : answer);
  return {
    answerLog: nextLog,
    correctAnswers: nextLog.filter(answer => answer.is_correct),
    wrongAnswers: nextLog.filter(answer => !answer.is_correct),
    score: nextLog.filter(answer => answer.is_correct).length
  };
}
