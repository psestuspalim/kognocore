export function canSelfCorrect(answer) {
  return Boolean(answer) && answer.is_correct !== true && answer.result?.correcto === false
    && Number.isFinite(answer.result.max) && answer.result.max > 0 && !answer.self_correction;
}

// Correct one occurrence, never all questions with the same wording.
export function selfCorrectAnswer(answerLog, index, correctedAt = new Date().toISOString()) {
  const original = answerLog[index];
  if (!Number.isInteger(index) || !canSelfCorrect(original)) return null;
  const corrected = {
    ...original,
    is_correct: true,
    self_correction: { corrected_at: correctedAt, original_is_correct: false, original_result: original.result },
    result: {
      ...original.result,
      correcto: true,
      puntos: original.result.max,
      sobrantes: [],
      detalle: (original.result.detalle || []).map(item => ({ ...item, ok: true, via: 'autocorreccion' }))
    }
  };
  const nextLog = answerLog.map((answer, i) => i === index ? corrected : answer);
  return {
    answerLog: nextLog,
    correctAnswers: nextLog.filter(answer => answer.is_correct),
    wrongAnswers: nextLog.filter(answer => !answer.is_correct),
    score: nextLog.filter(answer => answer.is_correct).length
  };
}
