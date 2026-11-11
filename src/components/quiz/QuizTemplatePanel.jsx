import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { QUIZ_TEMPLATE_TEXT } from '@/lib/quiz-template';

const NOTES = [
  ['title', 'Obligatorio. Nombre con el que aparece el cuestionario.'],
  ['questions', 'Lista de preguntas. Cada una es de opción múltiple o lleva "tipo".'],
  ['answerOptions', 'Opción múltiple: mínimo dos opciones y exactamente una con "isCorrect": true.'],
  ['tipo', 'respuesta_corta, numerico, enumeracion, secuencia, cloze, relacion o definicion.'],
  ['canonico / acepta', 'Respuesta esperada y sinónimos que también cuentan como correctos.'],
  ['cloze', 'Cada hueco {{c1}}, {{c2}}… del texto necesita su entrada en "blancos".'],
  ['feedback / rationale', 'Opcionales. Explicación que ve el alumno después de responder.']
];

export default function QuizTemplatePanel() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(QUIZ_TEMPLATE_TEXT);
      setCopied(true);
      toast.success('Estructura copiada');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-slate-600">
          Estructura base con un ejemplo de cada tipo de pregunta. Cópiala, sustituye el contenido y borra los tipos que no uses.
        </p>
        <Button type="button" onClick={copy} className="h-10 shrink-0 bg-indigo-600 hover:bg-indigo-700">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? 'Copiada' : 'Copiar estructura'}
        </Button>
      </div>

      <pre className="max-h-[45dvh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 select-all">
        {QUIZ_TEMPLATE_TEXT}
      </pre>

      <dl className="space-y-1.5 text-sm">
        {NOTES.map(([term, description]) => (
          <div key={term} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 font-mono text-xs font-semibold text-slate-900 sm:w-40 sm:pt-0.5">{term}</dt>
            <dd className="min-w-0 text-slate-600">{description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
