// Uploads the question banks in src/data to the database through the API,
// so they can later be removed from the public bundle.
//
// Only quizzes that are missing on the server are created. Existing ones are
// left untouched, because the server copy may contain edits and corrections.
//
// Usage (Node 22+):
//   KOGNOCORE_URL=https://<your-site> ADMIN_USER=<user> ADMIN_PASS=<password> node scripts/seed-quizzes.mjs
//   add --dry-run to list what would be uploaded without writing anything.
import { readdir, readFile } from 'node:fs/promises';
import { normalizeExpandedQuiz } from '../src/lib/quiz-normalization.js';

const { KOGNOCORE_URL, ADMIN_USER, ADMIN_PASS } = process.env;
const dryRun = process.argv.includes('--dry-run');
if (!KOGNOCORE_URL || !ADMIN_USER || !ADMIN_PASS) {
  console.error('Faltan variables: KOGNOCORE_URL, ADMIN_USER, ADMIN_PASS');
  process.exit(1);
}
const base = KOGNOCORE_URL.replace(/\/+$/, '');

async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body.error || ''}`);
  return body;
}

const dataDir = new URL('../src/data/', import.meta.url);
const files = (await readdir(dataDir)).filter(name => name.endsWith('.json')).sort();
const local = [];
for (const name of files) {
  const quiz = normalizeExpandedQuiz(JSON.parse(await readFile(new URL(name, dataDir), 'utf8')));
  if (!quiz?.id) { console.warn(`Sin id, omitido: ${name}`); continue; }
  local.push({ name, quiz });
}

const { token } = await request('/api/admin-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
});
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const { quizzes } = await request('/api/quizzes', { headers });
const remoteIds = new Set(quizzes.map(quiz => quiz.id));

let created = 0;
for (const { name, quiz } of local) {
  const questions = quiz.questions?.length || 0;
  if (remoteIds.has(quiz.id)) { console.log(`ya existe   ${quiz.id}  (${name})`); continue; }
  if (dryRun) { console.log(`se subiría  ${quiz.id}  ${questions} preguntas  (${name})`); continue; }
  await request('/api/quizzes', { method: 'POST', headers, body: JSON.stringify(quiz) });
  created++;
  console.log(`creado      ${quiz.id}  ${questions} preguntas  (${name})`);
}
console.log(`\nLocales: ${local.length}. En servidor antes: ${remoteIds.size}. Creados: ${created}.${dryRun ? ' (simulación)' : ''}`);
