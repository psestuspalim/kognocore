import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SelfCorrectionButton({ onCorrect, inputs = { text: '' }, corrected = false }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  if (corrected) return <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">Respuesta editada y evaluada de nuevo.</p>;
  if (!onCorrect) return null;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <p className="mb-2 text-xs">Puedes editar tu respuesta y comprobarla de nuevo con la respuesta del banco.</p>
      {confirming ? <>
        <div className="space-y-2 mb-3">
          {Object.entries(draft).map(([key, value], index) => <label key={key} className="block text-xs">
            {key === 'text' ? 'Tu respuesta' : /^\d+$/.test(key) ? `Elemento ${index + 1}` : `Respuesta ${key}`}
            <Input value={value} disabled={saving} autoFocus={index === 0}
              onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} />
          </label>)}
        </div>
        <p className="mb-2 text-xs">Solo contará como correcta si pasa la nueva evaluación.</p>
        {error && <p role="alert" className="mb-2 text-xs text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={saving} onClick={async () => {
            if (saving) return;
            setSaving(true);
            setError('');
            try { await onCorrect(draft); setConfirming(false); }
            catch { setError('No se pudo guardar y evaluar tu respuesta. Puedes volver a intentarlo.'); }
            finally { setSaving(false); }
          }}>{saving ? 'Evaluando…' : 'Guardar y volver a evaluar'}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setConfirming(false)}>Cancelar</Button>
        </div>
      </> : <Button type="button" size="sm" variant="outline" onClick={() => {
        setDraft({ ...inputs }); setError(''); setConfirming(true);
      }}>Editar mi respuesta</Button>}
    </div>
  );
}
