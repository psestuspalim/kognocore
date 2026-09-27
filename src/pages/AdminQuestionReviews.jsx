import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewRequest } from '@/api/question-reviews';
import AdminShell from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const labels = { pending: 'Pendiente', recalculating: 'Recálculo pendiente', resolved: 'Corregida' };

export default function AdminQuestionReviews() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [answerJson, setAnswerJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { data, isPending, error: loadError, refetch } = useQuery({
    queryKey: ['question-reviews'], queryFn: () => reviewRequest(), refetchInterval: 15000
  });
  const edit = report => {
    setEditing(report); setDraft({ ...structuredClone(report.current_question), answerOptions: structuredClone(report.current_question.answerOptions || report.current_question.options || []) });
    setAnswerJson(JSON.stringify(report.current_question.respuesta || {}, null, 2)); setError('');
  };
  const save = async (report, retry = false) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const question = retry ? null : { ...draft,
        ...(draft.respuesta ? { respuesta: JSON.parse(answerJson),
          ...(draft.type === 'cloze' || draft.tipo === 'cloze' ? { blancos: JSON.parse(answerJson).blancos } : {}) } : {}) };
      const result = await reviewRequest('PATCH', {
        quiz_id: report.quiz_id, report_id: report.id, action: retry ? 'retry' : 'correct',
        expected_question: report.current_question, question
      });
      setEditing(null);
      setNotice(`Corrección guardada. ${result.count} intentos recalculados.${result.ungradable ? ' ' + result.ungradable + ' respuestas antiguas no conservan información suficiente para recalificarlas; se mantuvo su calificación.' : ''}`);
      await queryClient.invalidateQueries();
      window.dispatchEvent(new Event('question-corrected'));
    } catch (err) { setError(err.message); await refetch(); }
    finally { setBusy(false); }
  };
  const reports = (data?.reviews || []).filter(r => filter === 'all' || (filter === 'pending' ? r.status !== 'resolved' : r.status === filter));
  return <AdminShell>
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Revisión de preguntas</h1>
        <p className="text-slate-600 mt-2">Corrige preguntas reportadas y actualiza las calificaciones, el desempeño y el progreso de los estudiantes.</p></div>
      <div className="flex flex-wrap gap-2">
        {[['pending', 'Pendientes'], ['resolved', 'Corregidas'], ['all', 'Todas']].map(([value, label]) =>
          <Button key={value} variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>{label}</Button>)}
        <Button variant="outline" onClick={() => refetch()}>Actualizar</Button>
      </div>
      {notice && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{notice}</p>}
      {(loadError || (error && !editing)) && <p role="alert" className="text-red-700">{loadError?.message || error}</p>}
      {isPending ? <p>Cargando reportes…</p> : !loadError && reports.length === 0 ? <p>No hay reportes en esta categoría.</p> : null}
      {reports.map(report => <article key={report.id} className="rounded-xl border bg-white p-5 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><strong>{report.quiz_title}</strong><span className="text-sm">{labels[report.status]}</span></div>
        <p className="whitespace-pre-wrap">{report.current_question.question || report.current_question.prompt}</p>
        <p className="text-sm text-slate-600">Motivo: {report.reason || 'Pregunta mal interpretada o con errores.'}</p>
        <p className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</p>
        {report.status === 'pending' && <Button onClick={() => edit(report)}>Revisar y corregir</Button>}
        {report.status === 'recalculating' && <Button disabled={busy} onClick={() => save(report, true)}>Completar recálculo</Button>}
        {!!report.ungradable && <p className="text-amber-800 text-sm">{report.ungradable} respuestas antiguas requieren revisión individual por falta de datos.</p>}
      </article>)}
    </div>
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) setEditing(null); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Corregir pregunta</DialogTitle>
          <DialogDescription>Se conservarán las respuestas de los estudiantes y se recalcularán los intentos afectados. Mantén el significado de cada opción al corregir su texto.</DialogDescription></DialogHeader>
        {draft && <div className="space-y-4">
          <label className="block text-sm font-medium">Enunciado
            <textarea className="mt-1 w-full min-h-28 rounded border p-2" value={draft.question || draft.prompt || ''}
              onChange={e => setDraft({ ...draft, question: e.target.value, prompt: e.target.value, ...(draft.tipo === 'cloze' || draft.type === 'cloze' ? { texto: e.target.value } : {}) })} />
          </label>
          {(draft.answerOptions || []).map((option, index) => <div key={option.id} className="flex gap-3 items-start">
            <label className="flex items-center gap-2 text-sm pt-2">
              <input type={draft.type === 'image-multiple' || draft.multiple || draft.allowMultiple ? 'checkbox' : 'radio'}
                name="correct-option" checked={!!option.isCorrect}
                onChange={e => setDraft({ ...draft, correctAnswer: null, correct_answer: null, correcta: null, respuesta_correcta: null,
                  answerOptions: draft.answerOptions.map((o, i) => ({ ...o, c: false, correct: false,
                    isCorrect: i === index ? e.target.checked : (draft.type === 'image-multiple' || draft.multiple || draft.allowMultiple ? o.isCorrect : false) })) })} />
              Correcta
            </label>
            <textarea aria-label={`Opción ${index + 1}`} className="w-full rounded border p-2" value={option.text}
              onChange={e => setDraft({ ...draft, answerOptions: draft.answerOptions.map((o, i) => i === index ? { ...o, text: e.target.value } : o) })} />
          </div>)}
          {draft.respuesta && <label className="block text-sm font-medium">Respuesta esperada (JSON; conserva las claves)
            <textarea className="mt-1 w-full min-h-48 rounded border p-2 font-mono text-sm" value={answerJson} onChange={e => setAnswerJson(e.target.value)} />
          </label>}
          <label className="block text-sm font-medium">Explicación
            <textarea className="mt-1 w-full min-h-24 rounded border p-2" value={draft.feedback || draft.justificacion || ''}
              onChange={e => setDraft({ ...draft, feedback: e.target.value, justificacion: e.target.value, explanation: e.target.value })} />
          </label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <Button disabled={busy} onClick={() => save(editing)}>{busy ? 'Guardando y recalculando…' : 'Guardar y recalcular calificaciones'}</Button>
        </div>}
      </DialogContent>
    </Dialog>
  </AdminShell>;
}
