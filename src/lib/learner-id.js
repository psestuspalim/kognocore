export function getOrCreateLearnerId() {
  const key = 'kc_learner_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `learner_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, id);
  return id;
}

export function getOrCreateStudentAlias() {
  const key = 'kc_student_alias';
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tag = '';
  for (let i = 0; i < 4; i++) tag += chars[Math.floor(Math.random() * chars.length)];
  const alias = `Estudiante_${tag}`;
  localStorage.setItem(key, alias);
  return alias;
}
