const displayAnswer = (value) => String(value ?? '').trim() || 'Sin respuesta';

export default function OpenEndedAnswerComparison({ inputs = {}, result, type }) {
  const answers = Object.entries(inputs);
  const details = result.detalle || [];
  const labelFor = (key, index) => {
    if (type === 'relacion') return key;
    if (type === 'cloze') return `Espacio ${String(key).replace(/^c/i, '')}`;
    if (type === 'secuencia') return `Paso ${index + 1}`;
    return null;
  };

  return (
    <section aria-label="Comparación de respuestas" className="mt-4 border-t border-black/10 pt-4">
      <h4 className="font-bold text-slate-900 mb-3">Compara tus respuestas</h4>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <h5 className="font-bold text-slate-900 mb-3">Tu respuesta</h5>
          <ul className="space-y-3">
            {answers.length === 0 && <li className="text-slate-500">Sin respuesta</li>}
            {answers.map(([key, value], index) => {
              const label = labelFor(key, index);
              return (
                <li key={key} className="break-words whitespace-pre-wrap text-slate-700">
                  {label && <span className="block font-semibold text-slate-900">{label}</span>}
                  {displayAnswer(value)}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <h5 className="font-bold text-emerald-950 mb-3">Respuestas correctas</h5>
          <ul className="space-y-3">
            {details.map((detail, index) => {
              const label = labelFor(detail.clave ?? detail.blanco, index);
              return (
                <li key={index} className="break-words whitespace-pre-wrap text-emerald-900">
                  {label && <span className="block font-semibold">{label}</span>}
                  {detail.esperado ?? 'Sin respuesta de referencia'}
                  <span className={`block mt-1 text-[11px] font-semibold ${detail.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {detail.ok ? '✓ Acertaste' : '✗ Por repasar'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
