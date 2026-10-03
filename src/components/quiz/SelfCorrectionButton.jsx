import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SelfCorrectionButton({ onCorrect, corrected = false }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  if (corrected) return <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">Marcada como correcta por ti.</p>;
  if (!onCorrect) return null;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <p className="mb-2 text-xs">¿Tu respuesta significa lo mismo, pero se marcó mal por un sinónimo o por la redacción?</p>
      {confirming ? <>
        <p className="mb-2 text-xs">Confirma que tu respuesta es equivalente. Esta pregunta contará como correcta y se actualizará tu resultado.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={saving} onClick={async () => {
            if (saving) return;
            setSaving(true);
            try { await onCorrect(); setConfirming(false); } finally { setSaving(false); }
          }}>{saving ? 'Guardando…' : 'Marcar como correcta'}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setConfirming(false)}>Cancelar</Button>
        </div>
      </> : <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>Mi respuesta es correcta</Button>}
    </div>
  );
}
