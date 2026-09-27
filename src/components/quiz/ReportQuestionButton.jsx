import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { reviewRequest } from '@/api/question-reviews';

export default function ReportQuestionButton({ quizId, question }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setPending(true); setError('');
    try {
      await reviewRequest('POST', { quiz_id: quizId, question, reason });
      setSent(true); setOpen(false);
    } catch (err) { setError(err.message); }
    finally { setPending(false); }
  };
  return <>
    <Button type="button" variant="outline" size="sm" disabled={sent} onClick={() => setOpen(true)}>
      <Flag className="mr-2 h-4 w-4" />{sent ? 'Enviada a revisión' : 'Marcar para revisión manual'}
    </Button>
    <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reportar un error en la pregunta</DialogTitle>
          <DialogDescription>El administrador podrá corregirla. Tu calificación se actualizará si cambia la respuesta correcta.</DialogDescription>
        </DialogHeader>
        <p className="text-sm line-clamp-4">{question?.question || question?.prompt}</p>
        <label className="text-sm font-medium" htmlFor="review-reason">¿Qué está mal? (opcional)</label>
        <textarea id="review-reason" className="w-full min-h-28 rounded-md border p-3" maxLength={2000}
          placeholder="Enunciado cortado, opciones mezcladas, respuesta incorrecta…" value={reason} onChange={e => setReason(e.target.value)} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button onClick={submit} disabled={pending}>{pending ? 'Enviando…' : 'Enviar a revisión'}</Button>
      </DialogContent>
    </Dialog>
  </>;
}
