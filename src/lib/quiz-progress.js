export const sessionKey = (user, quizId) => `kc_quiz_session_v2:${encodeURIComponent(user?.learner_id || user?.email || 'anonymous')}:${encodeURIComponent(quizId)}`;

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
