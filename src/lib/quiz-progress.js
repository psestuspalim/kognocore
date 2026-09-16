export const sessionKey = (user, quizId) => `kc_quiz_session_v2:${encodeURIComponent(user?.learner_id || user?.email || 'anonymous')}:${encodeURIComponent(quizId)}`;

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
