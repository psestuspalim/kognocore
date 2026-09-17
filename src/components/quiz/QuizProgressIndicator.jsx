export default function QuizProgressIndicator({ progress }) {
  const { status, label, answered, total, percent, attemptCount } = progress;
  const color = status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : status === 'in-progress' ? 'text-amber-800 bg-amber-50 border-amber-200'
      : 'text-slate-600 bg-slate-50 border-slate-200';
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${color}`}>{label}</span>
        <span className="text-slate-600">{answered} de {total} contestadas</span>
        {attemptCount > 0 && <span className="text-slate-500">{attemptCount} {attemptCount === 1 ? 'intento' : 'intentos'}</span>}
      </div>
      <div className="flex items-center gap-2">
        <div role="progressbar" aria-label="Avance del quiz" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
          className="h-1.5 flex-1 max-w-xs overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs tabular-nums text-slate-600">{percent}%</span>
      </div>
    </div>
  );
}
