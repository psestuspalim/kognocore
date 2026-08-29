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
  const legacyKey = 'kc_display_name';
  const existing = (localStorage.getItem(key) || localStorage.getItem(legacyKey) || '').trim();
  const isGeneratedLegacyAlias = /^Estudiante_[A-Z0-9]{4}$/i.test(existing);

  if (existing && !isGeneratedLegacyAlias) {
    localStorage.setItem(key, existing);
    localStorage.removeItem(legacyKey);
    return existing;
  }

  const animals = ['Lince', 'Colibri', 'Ajolote', 'Zorro', 'Buho', 'Jaguar', 'Delfin', 'Halcon'];
  const colors = ['Azul', 'Coral', 'Verde', 'Dorado', 'Turquesa', 'Cobalto', 'Ambar', 'Violeta'];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const number = String(Math.floor(Math.random() * 90) + 10);
  const alias = `${animal} ${color} ${number}`;
  localStorage.setItem(key, alias);
  localStorage.removeItem(legacyKey);
  return alias;
}

export function saveStudentAlias(value) {
  const alias = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!alias) return getOrCreateStudentAlias();
  localStorage.setItem('kc_student_alias', alias);
  localStorage.removeItem('kc_display_name');
  return alias;
}
