const moods = ['happy', 'sleepy', 'spicy', 'funky', 'dancing', 'grumpy', 'sneaky', 'giggly', 'dramatic', 'confused', 'cosmic', 'bouncy', 'flying', 'clumsy', 'cheeky', 'jolly', 'quirky', 'wobbly', 'groovy', 'sparkly'];
const anatomy = ['deltoid', 'neuron', 'soleus', 'biceps', 'patella', 'femur', 'axon', 'thalamus', 'nephron', 'gluteus', 'synapse', 'tibia', 'masseter', 'sartorius', 'cerebellum', 'scapula', 'triceps', 'retina', 'sternum', 'alveolus'];
const words = ['Mango', 'Kiwi', 'Nube', 'Luna', 'Brisa', 'Chispa', 'Coco', 'Rayo', 'Lima', 'Cometa', 'Mora', 'Bosque', 'Duna', 'Trueno', 'Menta', 'Faro'];

function randomIndex(max) {
  const limit = 2 ** 32 - (2 ** 32 % max);
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % max;
}
const pick = list => list[randomIndex(list.length)];

export function generateStudentCredentials(count, existing = []) {
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error('Elige entre 1 y 50 alumnos.');
  const used = new Set(existing.map(name => String(name).trim().toLowerCase()));
  // Already assigned; never propose this account again.
  used.add('happydeltoid');
  const available = moods.flatMap(mood => anatomy.map(part => mood + part)).filter(name => !used.has(name));
  return Array.from({ length: count }, () => {
    let username;
    if (available.length) username = available.splice(randomIndex(available.length), 1)[0];
    else {
      const base = pick(moods) + pick(anatomy);
      let suffix = randomIndex(100000);
      do { username = base + suffix++; } while (used.has(username));
    }
    used.add(username);
    const password = `${pick(words)}${pick('!#@$')}${1000 + randomIndex(9000)}${pick(words)}${pick('abcdefghjkmnpqrstuvwxyz23456789')}${pick('ABCDEFGHJKMNPQRSTUVWXYZ23456789')}`;
    return { username, password, status: 'pending' };
  });
}

export async function registerStudentBatch(rows, { listStudents, createStudent, courseIds = [], onUpdate = () => {} }) {
  const existing = new Set((await listStudents()).map(student => student.username?.toLowerCase()));
  const result = [];
  for (const row of rows) {
    let next = row;
    if (row.status !== 'created') {
      if (existing.has(row.username.toLowerCase())) {
        next = { ...row, status: 'error', error: 'Este usuario ya existe. No se modificó su cuenta ni su contraseña.' };
      } else {
        try {
          const student = await createStudent({ username: row.username, full_name: row.username,
            password: row.password, course_ids: [...courseIds], is_active: true });
          if (!student?.id) throw new Error('No se pudo confirmar el registro.');
          next = { ...row, status: 'created', id: student.id, error: '' };
          existing.add(row.username.toLowerCase());
        } catch (error) {
          next = { ...row, status: 'error', error: error.message || 'No se pudo registrar la cuenta.' };
        }
      }
    }
    result.push(next);
    onUpdate(next);
  }
  return result;
}

export function credentialsText(rows) {
  return ['Usuario\tContraseña', ...rows.filter(row => row.status === 'created').map(row => `${row.username}\t${row.password}`)].join('\n');
}
