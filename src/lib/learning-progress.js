const DAY = 86400000;
const INTERVALS = [1, 3, 7, 14, 30, 60];
export const learnerMatches = (record, user) => Boolean(user && (
  user.learner_id ? record.learner_id === user.learner_id
    : user.email && record.user_email?.toLowerCase() === user.email.toLowerCase()
));

export function questionKey(question, quizId) {
  const text = String(question.question || question.prompt || '').normalize('NFKC').trim().toLowerCase();
  return `${quizId}:${question.question_id || question.questionId || question.id || text}`;
}

export function answeredCount(attempt) {
  return Math.max(attempt.answer_log?.length || 0, Number(attempt.answered_questions || 0),
    Number(attempt.score || 0) + (attempt.wrong_questions?.length || 0));
}

// Deterministic Leitner-style schedule. Rebuilt from persisted answers, never from UI renders.
export function buildReviewSchedule(attempts = [], now = Date.now()) {
  const events = new Map();
  for (const attempt of attempts) {
    const log = attempt.answer_log?.length ? attempt.answer_log : (attempt.wrong_questions || []).map(q => ({ ...q, is_correct: false }));
    log.forEach((answer, index) => {
      const at = Date.parse(answer.answered_at || attempt.completed_at || attempt.updated_date || attempt.created_date);
      if (!Number.isFinite(at)) return;
      const key = answer.question_key || questionKey(answer.question_snapshot || answer, attempt.quiz_id);
      const eventId = answer.answer_id || `${attempt.id}:${answer.question_index ?? index}`;
      if (!events.has(eventId)) events.set(eventId, { answer, attempt, at, key, eventId });
    });
  }
  const cards = new Map();
  for (const { answer, attempt, at, key } of [...events.values()].sort((a, b) => a.at - b.at || a.eventId.localeCompare(b.eventId))) {
    const old = cards.get(key) || { key, streak: 0, failures: 0, reviews: 0, total_seconds: 0 };
    const correct = answer.is_correct === true;
    const streak = correct ? old.streak + 1 : 0;
    const partial = !correct && Number(answer.result?.puntos || 0) > 0;
    const intervalMs = correct ? INTERVALS[Math.min(streak - 1, INTERVALS.length - 1)] * DAY : partial ? DAY : 10 * 60000;
    cards.set(key, {
      ...old, streak, failures: old.failures + (correct ? 0 : 1), reviews: old.reviews + 1,
      quiz_id: attempt.quiz_id, subject_id: attempt.subject_id,
      question: answer.question_snapshot || { ...answer, id: answer.question_id },
      prompt: answer.question || answer.question_snapshot?.question || answer.question_snapshot?.prompt,
      last_answer: answer.selected_answer, correct_answer: answer.correct_answer,
      last_correct: correct, last_reviewed_at: new Date(at).toISOString(),
      due_at: new Date(at + intervalMs).toISOString(), due: at + intervalMs <= now,
      interval_days: intervalMs / DAY,
      total_seconds: old.total_seconds + Math.max(0, Number(answer.response_time || 0))
    });
  }
  return [...cards.values()].sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at) || b.failures - a.failures);
}

export function learningSummary(attempts = [], activity = []) {
  const unique = [...new Map(attempts.map(a => [a.id, a])).values()];
  const answered = unique.reduce((sum, a) => sum + answeredCount(a), 0);
  const correct = unique.reduce((sum, a) => sum + Number(a.score || 0), 0);
  const points = unique.reduce((sum, a) => sum + (a.answer_log || []).reduce((n, answer) => n + Number(answer.result?.puntos ?? (answer.is_correct ? 1 : 0)), 0), 0);
  const maxPoints = unique.reduce((sum, a) => sum + (a.answer_log || []).reduce((n, answer) => n + Number(answer.result?.max ?? 1), 0), 0);
  const questionSeconds = unique.reduce((sum, a) => sum + (a.answer_log?.length
    ? a.answer_log.reduce((n, answer) => n + Number(answer.response_time || 0), 0)
    : (a.response_times || []).reduce((n, seconds) => n + Number(seconds || 0), 0)), 0);
  return { answered, correct, accuracy: answered ? 100 * correct / answered : 0,
    grade: maxPoints ? 100 * points / maxPoints : answered ? 100 * correct / answered : 0,
    completed: unique.filter(a => a.is_completed).length, attempts: unique.length,
    questionSeconds, activeSeconds: activity.reduce((sum, a) => sum + Number(a.active_seconds || 0), 0),
    visibleSeconds: activity.reduce((sum, a) => sum + Number(a.visible_seconds || 0), 0),
    pending: unique.filter(a => a._sync_status === 'pending').length };
}

export function createStudyClock({ now = () => Date.now(), idleMs = 120000 } = {}) {
  let previous = now();
  let interaction = previous;
  let activeMs = 0;
  let visibleMs = 0;
  return {
    tick(visible = true) {
      const time = now();
      if (visible) {
        visibleMs += Math.max(0, time - previous);
        activeMs += Math.max(0, Math.min(time, interaction + idleMs) - previous);
      }
      previous = time;
      return { active_seconds: Math.floor(activeMs / 1000), visible_seconds: Math.floor(visibleMs / 1000) };
    },
    interact() { interaction = now(); },
    read() { return { active_seconds: Math.floor(activeMs / 1000), visible_seconds: Math.floor(visibleMs / 1000) }; }
  };
}
