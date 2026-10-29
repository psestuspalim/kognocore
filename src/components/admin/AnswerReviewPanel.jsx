import { useState } from 'react';
import { Search, AlertCircle, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readableAnswer, possibleVerificationMismatch } from '@/lib/answer-review';
import MathText from '../quiz/MathText';
import AnswerOutcome from './AnswerOutcome';

export default function AnswerReviewPanel({ students, quizzes, subjects, getRows, onOpenAttempt, onApprove, saving, loading, error }) {
  const [reviewing, setReviewing] = useState(null);
  const [reason, setReason] = useState('');
  const [includeReviewed, setIncludeReviewed] = useState(false);
  const [studentKey, setStudentKey] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [quizId, setQuizId] = useState('');
  const [search, setSearch] = useState('');
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [page, setPage] = useState(1);
  const change = setter => event => { setter(event.target.value); setPage(1); };
  const rows = students.flatMap(student => student.attempts.flatMap(attempt => {
    const quiz = quizzes.find(item => item.id === attempt.quiz_id);
    const subject = attempt.subject_id || attempt.quiz_snapshot?.subject_id || quiz?.subject_id || 'unknown';
    return getRows(attempt).filter(answer => !answer.is_correct || (includeReviewed && answer.admin_review)).map((answer, index) => ({
      ...answer, id: `${attempt.id}:${index}`, student, attempt, subject,
      subjectName: subjects.find(item => item.id === subject)?.name || 'Sin materia',
      quizTitle: attempt.quiz_snapshot?.title || quiz?.title || 'Cuestionario eliminado',
      mismatch: !answer.is_correct && possibleVerificationMismatch(answer.selected_answer, answer.correct_answer),
    }));
  }));
  const filtered = rows.filter(row => (!studentKey || row.student.key === studentKey)
    && (!subjectId || row.subject === subjectId) && (!quizId || row.attempt.quiz_id === quizId)
    && (!onlyMatches || row.mismatch)
    && [row.question, readableAnswer(row.selected_answer), row.correct_answer, row.student.username, row.quizTitle]
      .join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  filtered.sort((a, b) => a.student.username.localeCompare(b.student.username)
    || a.subjectName.localeCompare(b.subjectName)
    || String(b.attempt.created_date || '').localeCompare(String(a.attempt.created_date || '')));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 30));
  const currentPage = Math.min(page, pageCount);
  const groups = new Map();
  for (const row of filtered.slice((currentPage - 1) * 30, currentPage * 30)) {
    const key = `${row.student.key}:${row.subject}`;
    if (!groups.has(key)) groups.set(key, { student: row.student, subjectName: row.subjectName, rows: [] });
    groups.get(key).rows.push(row);
  }
  const selectClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm';
  return <div className="space-y-5">
    <Card><CardContent className="p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Revisión global de respuestas</h2>
        <p className="text-sm text-slate-600 mt-1">Compara las respuestas marcadas como incorrectas de cada alumno, agrupadas por materia.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm space-y-1"><span>Alumno</span><select className={selectClass} value={studentKey} onChange={change(setStudentKey)}>
          <option value="">Todos los alumnos</option>
          {students.filter(student => student.attempts.length).map(student => <option key={student.key} value={student.key}>{student.username} · {student.email || student.learner_id}</option>)}
        </select></label>
        <label className="text-sm space-y-1"><span>Materia</span><select className={selectClass} value={subjectId} onChange={change(setSubjectId)}>
          <option value="">Todas las materias</option>
          {[...new Map(rows.map(row => [row.subject, row.subjectName]))].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label className="text-sm space-y-1"><span>Cuestionario</span><select className={selectClass} value={quizId} onChange={change(setQuizId)}>
          <option value="">Todos los cuestionarios</option>
          {[...new Map(rows.map(row => [row.attempt.quiz_id, row.quizTitle]))].map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select></label>
      </div>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label="Buscar preguntas o respuestas" placeholder="Buscar pregunta, respuesta o alumno…" className="pl-9" value={search} onChange={change(setSearch)} /></div>
      <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={onlyMatches} onChange={event => { setOnlyMatches(event.target.checked); setPage(1); }} />Solo posibles errores de verificación por coincidencia de texto</label>
      <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={includeReviewed} onChange={event => { setIncludeReviewed(event.target.checked); setPage(1); }} />Incluir respuestas validadas por el administrador</label>
      <div className="flex gap-2 flex-wrap"><Badge variant="outline">{filtered.length} respuestas</Badge><Badge variant="outline">{new Set(filtered.map(row => row.student.key)).size} alumnos</Badge><Badge variant="outline">{filtered.filter(row => row.mismatch).length} coincidencias para revisar</Badge></div>
      <p className="text-xs text-slate-500">Las coincidencias ignoran mayúsculas, acentos y espacios. No detectan todas las respuestas equivalentes. Al validar una respuesta se suma un acierto al intento y se guarda el motivo de la revisión. Se muestran los intentos cargados (máximo 2000).</p>
    </CardContent></Card>
    {loading ? <p role="status">Cargando respuestas…</p> : error ? <p role="alert" className="text-red-700">No se pudieron cargar todos los datos. Vuelve a cargar la página para revisar las respuestas.</p> : <>
      {filtered.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No hay respuestas incorrectas que coincidan con estos filtros.</CardContent></Card>}
      {[...groups].map(([key, group]) => <section key={key} className="space-y-3">
        <div className="rounded-lg bg-slate-900 text-white p-4"><h3 className="font-semibold">{group.student.username} · {group.subjectName}</h3><p className="text-xs text-slate-300 mt-1">{group.student.email || group.student.learner_id}</p></div>
        {group.rows.map(row => <Card key={row.id} className={row.mismatch ? 'border-amber-400' : ''}><CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs text-slate-500">{row.quizTitle} · {Number.isFinite(Date.parse(row.attempt.completed_at || row.attempt.created_date)) ? new Date(row.attempt.completed_at || row.attempt.created_date).toLocaleString('es-MX') : 'Fecha no disponible'}</div><Button variant="outline" size="sm" onClick={() => onOpenAttempt({ attempt: row.attempt, quizTitle: row.quizTitle })}><Eye className="w-4 h-4 mr-2" />Ver intento</Button></div>
          {row.mismatch && <div className="flex gap-2 items-center rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="w-5 h-5 shrink-0" />Posible error de verificación: los textos coinciden al normalizar el formato.</div>}
          <h4 className="font-semibold text-slate-900"><MathText text={row.question} /></h4>
          {row.imageUrl && <img src={row.imageUrl} alt="Imagen de la pregunta" className="max-h-72 max-w-full rounded-lg object-contain" loading="lazy" />}
          <div className="grid md:grid-cols-2 gap-3">
            <div className={`rounded-xl border p-4 ${row.admin_review ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><p className="text-xs font-semibold mb-2">RESPUESTA DEL ALUMNO · {row.admin_review ? 'VALIDADA' : 'MARCADA INCORRECTA'}</p><MathText text={readableAnswer(row.selected_answer) || 'Sin respuesta registrada'} /></div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800 mb-2">RESPUESTA ESPERADA</p><MathText text={row.correct_answer || 'No disponible en este registro'} /><p className="text-xs text-emerald-800 mt-2">{row.expectedSource}</p></div>
          </div>
          {row.answerOptions?.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Ver opciones de respuesta</summary><ul className="mt-2 space-y-2">{row.answerOptions.map((option, index) => <li key={index} className={`rounded border p-2 text-sm ${option.isCorrect ? 'border-emerald-300 bg-emerald-50' : ''}`}><MathText text={option.text} />{option.isCorrect && <span className="ml-2 text-emerald-700">(Correcta)</span>}</li>)}</ul></details>}
          {(row.explanation || row.rationale || row.feedback || row.justificacion || row.hint) && <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold mb-1">Explicación / pista</p><MathText text={row.explanation || row.rationale || row.feedback || row.justificacion || row.hint} /></div>}
          <AnswerOutcome answer={row} />
          {!row.is_correct && (reviewing === row.id ? <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm font-medium">La calificación pasará de {row.attempt.score}/{row.attempt.total_questions} a {Number(row.attempt.score) + 1}/{row.attempt.total_questions}.</p>
            <label className="block text-sm">Motivo de la validación<textarea className="mt-1 block w-full rounded border p-2" maxLength={1000} rows={2} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ej. Respuesta equivalente que el verificador no reconoció" disabled={saving} /></label>
            <div className="flex gap-2"><Button disabled={saving || !reason.trim()} onClick={async () => {
              try { await onApprove(row, reason); setReviewing(null); setReason(''); } catch { /* Parent displays the server error. */ }
            }}>{saving ? 'Guardando…' : 'Guardar y actualizar calificación'}</Button><Button variant="outline" disabled={saving} onClick={() => setReviewing(null)}>Cancelar</Button></div>
          </div> : <div className="space-y-1"><Button disabled={saving || !row.attempt.is_completed} onClick={() => { setReviewing(row.id); setReason(''); }}>Aceptar como correcta</Button>{!row.attempt.is_completed && <p className="text-xs text-slate-500">Disponible cuando el alumno termine este intento.</p>}</div>)}
        </CardContent></Card>)}
      </section>)}
      {pageCount > 1 && <div className="flex items-center justify-center gap-4"><Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span className="text-sm">Página {currentPage} de {pageCount}</span><Button variant="outline" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div>}
    </>}
  </div>;
}
