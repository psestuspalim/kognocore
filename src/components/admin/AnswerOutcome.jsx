import { answerOutcome } from '@/lib/answer-report';
import MathText from '../quiz/MathText';

export default function AnswerOutcome({ answer }) {
  const outcome = answerOutcome(answer);
  return <div className="mt-2 space-y-1 text-xs">
    <p className="font-semibold text-slate-800">{outcome.label}</p>
    {answer.admin_review && <p>Motivo: {answer.admin_review.reason}</p>}
    {outcome.originalAnswer !== null && <p>Respuesta original: <MathText text={outcome.originalAnswer || 'Sin respuesta'} /></p>}
    {outcome.revisionCount > 0 && <p>Ediciones y reevaluaciones: {outcome.revisionCount}</p>}
    {outcome.changedAt && Number.isFinite(Date.parse(outcome.changedAt)) && <p>Último cambio: {new Date(outcome.changedAt).toLocaleString('es-MX')}</p>}
  </div>;
}
