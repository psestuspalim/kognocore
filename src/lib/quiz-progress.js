export const sessionKey = (user, quizId) => `kc_quiz_session_v2:${encodeURIComponent(user?.learner_id || user?.email || 'anonymous')}:${encodeURIComponent(quizId)}`;

export function summarizeQuizProgress(quiz, attempts = [], session = null) {
  const records = attempts.filter(attempt => String(attempt.quiz_id) === String(quiz.id));
  const candidates = [...records];
  if (session && String(session.quizId) === String(quiz.id)) {
    const index = candidates.findIndex(attempt => attempt.id === session.attemptId);
    const saved = {
      id: session.attemptId || 'saved-session',
      quiz_id: quiz.id,
      total_questions: session.lightweightQuiz?.questions?.length || quiz.total_questions || quiz.questions?.length,
      answered_questions: Math.max(session.answerLog?.length || 0, session.currentQuestionIndex || 0),
      score: session.score || 0,
      created_date: candidates[index]?.created_date || session.updatedAt,
      updated_date: session.updatedAt,
    };
    saved.is_completed = saved.total_questions > 0 && saved.answered_questions >= saved.total_questions;
    if (index < 0) candidates.push(saved);
    else if (new Date(saved.updated_date || 0) >= new Date(candidates[index].updated_date || candidates[index].created_date || 0)) {
      candidates[index] = { ...candidates[index], ...saved };
    }
  }
  candidates.sort((a, b) => new Date(b.created_date || b.updated_date || 0) - new Date(a.created_date || a.updated_date || 0));
  const latest = candidates[0];
  const total = Number(latest?.total_questions || quiz.total_questions || quiz.questions?.length || quiz.q?.length || 0);
  const answered = Math.min(total, Math.max(Number(latest?.answered_questions || 0), latest?.answer_log?.length || 0,
    Number(latest?.score || 0) + (latest?.wrong_questions?.length || 0)));
  const completed = !!latest && (latest.is_completed || (total > 0 && answered >= total));
  return {
    status: completed ? 'completed' : latest ? 'in-progress' : 'not-started',
    label: completed ? 'Completado' : latest ? 'En progreso' : 'Sin iniciar',
    answered: completed ? total : answered,
    total,
    percent: completed ? 100 : total ? Math.round(answered / total * 100) : 0,
    attemptCount: new Set(candidates.map(attempt => attempt.id)).size,
  };
}

// Shuffle whole options so correctness, identity and rationale stay together.
// Only call when creating an attempt; saved attempts retain their exact order.
export function shuffleAnswerOptions(options, random = Math.random) {
  const shuffled = options.map(option => ({ ...option }));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((option, index) => ({ ...option, label: String.fromCharCode(65 + index) }));
}

export function countDescendantQuizzes(containerId, containers, quizzes) {
  const ids = new Set([String(containerId)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of containers) {
      if (node.parent_id != null && ids.has(String(node.parent_id)) && !ids.has(String(node.id))) {
        ids.add(String(node.id));
        changed = true;
      }
    }
  }
  return new Set(quizzes.filter(q => ids.has(String(q.folder_id || q.subject_id || q.course_id))).map(q => String(q.id))).size;
}
