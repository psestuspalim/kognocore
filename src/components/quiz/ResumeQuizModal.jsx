import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, HelpCircle, CheckCircle2, Clock } from 'lucide-react';

export default function ResumeQuizModal({
  open,
  onClose,
  onResume,
  onRestart,
  quizTitle = 'Cuestionario',
  currentQuestion = 1,
  totalQuestions = 1,
  score = 0,
  wrongCount = 0
}) {
  const answeredCount = Math.min(currentQuestion - 1, totalQuestions);
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-1">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">
            ¿Deseas reanudar este examen?
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            Tienes un progreso guardado en <span className="font-semibold text-slate-800">"{quizTitle}"</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Progreso actual</span>
            <span className="text-indigo-600 font-bold">Pregunta {currentQuestion} de {totalQuestions}</span>
          </div>

          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-around pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{score} Aciertos</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>{progressPercent}% completado</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={onResume}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Continuar desde pregunta {currentQuestion}</span>
          </Button>

          <Button
            variant="outline"
            onClick={onRestart}
            className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-100 font-medium rounded-xl flex items-center justify-center gap-2 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reiniciar desde el inicio</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
