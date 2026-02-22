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

