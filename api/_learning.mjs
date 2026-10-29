import crypto from 'node:crypto';

export function actorOwner(actor, req) {
  if (actor.learnerId) return `learner:${actor.learnerId}`;
  if (actor.user?.id) return `user:${actor.user.id}`;
  return `session:${crypto.createHash('sha256').update(req.headers.get('authorization') || '').digest('hex')}`;
}

export function normalizeAttempt(attempt, now = new Date().toISOString()) {
  const log = Array.isArray(attempt.answer_log) ? attempt.answer_log : [];
  if (!log.length) return { ...attempt, updated_date: now };
  const answers = log.map((a, index) => ({ ...a,
    question_index: Number.isInteger(a.question_index) ? a.question_index : index,
    answer_id: a.answer_id || `${attempt.id}:${index}`,
    response_time: Math.max(0, Math.min(86400, Number(a.response_time) || 0))
  }));
  const points = answers.reduce((n, a) => n + Math.max(0, Math.min(Number(a.result?.max ?? 1), Number(a.result?.puntos ?? (a.is_correct ? 1 : 0)))), 0);
  const maxPoints = answers.reduce((n, a) => n + Math.max(1, Number(a.result?.max) || 1), 0);
  const total = Math.max(answers.length, Number(attempt.total_questions) || 0);
  return { ...attempt, schema_version: 2, answer_log: answers,
    answered_questions: answers.length, total_questions: total,
    score: answers.filter(a => a.is_correct === true).length,
    wrong_questions: answers.filter(a => a.is_correct !== true).map(a => ({ ...a.question_snapshot, ...a })),
    response_times: answers.map(a => a.response_time),
    total_time_seconds: answers.reduce((n, a) => n + a.response_time, 0),
    points_earned: points, points_possible: maxPoints, grade_percent: maxPoints ? 100 * points / maxPoints : 0,
    progress_percent: total ? 100 * answers.length / total : 0,
    is_completed: total > 0 && answers.length >= total, updated_date: now };
}

export async function allRows(queryFactory) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await queryFactory().range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}
