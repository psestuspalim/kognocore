export const STUDENT_DOMAIN = 'students.kognocore.local';

export function validateStudentInput(input, { creating = false } = {}) {
  const username = String(input.username || '').trim().toLowerCase();
  if (creating && !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
    throw new Error('El usuario debe tener entre 3 y 40 letras, números, puntos, guiones o guiones bajos.');
  }
  if ((creating || input.password) && (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128)) {
    throw new Error('La contraseña debe tener entre 8 y 128 caracteres.');
  }
  if (!Array.isArray(input.course_ids) || input.course_ids.length > 50 || input.course_ids.some(id => typeof id !== 'string' || !id || id.length > 150)) {
    throw new Error('Selecciona cursos válidos.');
  }
  if (typeof input.is_active !== 'boolean') throw new Error('Estado de cuenta inválido.');
  const fullName = String(input.full_name || username).trim();
  if (!fullName || fullName.length > 120) throw new Error('Indica un nombre de hasta 120 caracteres.');
  return { username, full_name: fullName, course_ids: [...new Set(input.course_ids)], is_active: input.is_active };
}

export function studentFromAuth(user) {
  const meta = user?.app_metadata;
  if (!meta?.managed_student) return null;
  return {
    id: user.id, email: user.email, learner_id: `user_${user.id}`,
    username: meta.username, full_name: meta.full_name || meta.username,
    role: 'user', is_admin: false, auth_provider: 'supabase', managed_student: true,
    is_active: meta.is_active === true,
    course_ids: Array.isArray(meta.course_ids) ? meta.course_ids : [],
    created_date: user.created_at, last_sign_in_at: user.last_sign_in_at
  };
}

export function canAccessCourse(actor, courseId) {
  return actor.kind === 'admin' || (actor.courseIds || [actor.courseId]).includes(String(courseId));
}
