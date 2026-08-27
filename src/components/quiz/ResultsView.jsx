import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Home, RotateCcw, TrendingUp, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import MathText from './MathText';

export default function ResultsView({
  score,
  totalQuestions,
  wrongAnswers = [],
  correctAnswers = [],
  answeredQuestions = 0,
  isPartial = false,
  onRetry,
  onRetryWrong,
  onHome
}) {
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(true);

  const difficultyStats = (() => {
    const stats = {
      fácil: { correct: 0, total: 0 },
      moderado: { correct: 0, total: 0 },
      difícil: { correct: 0, total: 0 }
    };

    correctAnswers.forEach(q => {
      const diff = q.difficulty || 'moderado';
      if (stats[diff]) {
        stats[diff].correct++;
        stats[diff].total++;
      }
    });

    wrongAnswers.forEach(q => {
      const diff = q.difficulty || 'moderado';
      if (stats[diff]) {
        stats[diff].total++;
      }
    });

    return stats;
  })();

  const answeredCount = answeredQuestions || (score + wrongAnswers.length);
  const percentage = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;

  const getGrade = () => {
    if (percentage >= 90) return { text: 'Excelente', color: 'text-emerald-700', ring: '#10b981' };
    if (percentage >= 70) return { text: 'Muy bien', color: 'text-blue-700', ring: '#3b82f6' };
    if (percentage >= 50) return { text: 'Aprobado', color: 'text-amber-700', ring: '#f59e0b' };
    return { text: 'A repasar', color: 'text-rose-700', ring: '#ef4444' };
  };

  const grade = getGrade();
  const hasDifficultyData = difficultyStats.fácil.total > 0 || difficultyStats.moderado.total > 0 || difficultyStats.difícil.total > 0;

  const circumference = 2 * Math.PI * 52;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">

      {/* Score section */}
      <div className="text-center mb-8">
        {isPartial && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200/60 mb-6">
            <AlertCircle className="w-3.5 h-3.5" />
            Parcial: {answeredCount} de {totalQuestions} respondidas
          </div>
        )}

        <div className="flex justify-center mb-5">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" stroke="hsl(210 20% 94%)" strokeWidth="8" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke={grade.ring}
                strokeWidth="8" fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{percentage}%</span>
            </div>
          </div>
        </div>

        <h2 className={`text-xl font-bold ${grade.color} mb-1`}>{grade.text}</h2>
        <p className="text-sm text-slate-500">{score} correctas de {answeredCount}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setShowCorrect(!showCorrect)}
          className="rounded-xl bg-white border border-slate-200/60 p-3 text-center hover:border-emerald-300 transition-colors"
        >
          <div className="text-xl font-bold text-emerald-600">{score}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Correctas</div>
        </button>

        <button
          onClick={() => setShowWrong(!showWrong)}
          className="rounded-xl bg-white border border-slate-200/60 p-3 text-center hover:border-rose-300 transition-colors"
        >
          <div className="text-xl font-bold text-rose-500">{wrongAnswers.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Incorrectas</div>
        </button>

        <div className="rounded-xl bg-white border border-slate-200/60 p-3 text-center">
          <div className="text-xl font-bold text-slate-700">{totalQuestions}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total</div>
        </div>
      </div>

      {/* Difficulty breakdown - shown by default when data exists */}
      {hasDifficultyData && (
        <div className="rounded-xl bg-white border border-slate-200/60 p-4 mb-6 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por dificultad</h3>
          {[
            { key: 'fácil', label: 'Fácil', color: 'bg-emerald-500' },
            { key: 'moderado', label: 'Moderado', color: 'bg-amber-500' },
            { key: 'difícil', label: 'Difícil', color: 'bg-rose-500' },
          ].map(({ key, label, color }) => {
            const stat = difficultyStats[key];
            if (stat.total === 0) return null;
            const pct = Math.round((stat.correct / stat.total) * 100);
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <span className="text-xs text-slate-500">{stat.correct}/{stat.total} ({pct}%)</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expandable correct answers */}
      {showCorrect && correctAnswers.length > 0 && (
        <div className="mb-4 max-h-80 overflow-y-auto rounded-xl border border-emerald-200/60 bg-emerald-50/50">
          <div className="p-3 border-b border-emerald-200/40 flex items-center justify-between sticky top-0 bg-emerald-50/90 backdrop-blur-sm">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Correctas
            </span>
            <button onClick={() => setShowCorrect(false)} className="text-emerald-600 hover:text-emerald-800">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {correctAnswers.map((q, idx) => {
              const justText = q.justificacion || q.explanation || q.feedback || q.rationale;
              return (
                <div key={idx} className="bg-white rounded-lg p-3 text-sm border border-emerald-100">
                  <p className="font-medium text-slate-800 mb-1.5 text-[13px] leading-relaxed">
                    <span className="text-slate-400 mr-1">{idx + 1}.</span>
                    <MathText text={q.question} />
                  </p>
                  <p className="text-emerald-700 text-xs">Tu respuesta: <MathText text={q.selected_answer} /></p>
                  {justText && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-slate-700 leading-relaxed">
                      <p className="font-semibold text-blue-800 mb-1">Justificación:</p>
                      <MathText text={justText} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable wrong answers */}
      {showWrong && wrongAnswers.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200/60 bg-rose-50/50">
          <div className="p-3 border-b border-rose-200/40 flex items-center justify-between sticky top-0 bg-rose-50/90 backdrop-blur-sm">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Incorrectas
            </span>
            <button onClick={() => setShowWrong(false)} className="text-rose-600 hover:text-rose-800">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {wrongAnswers.map((wq, idx) => {
              const justText = wq.justificacion || wq.explanation || wq.feedback || wq.rationale;
              return (
                <div key={idx} className="bg-white rounded-lg p-3 text-sm border border-rose-100">
                  <p className="font-medium text-slate-800 mb-1.5 text-[13px] leading-relaxed">
                    <span className="text-slate-400 mr-1">{idx + 1}.</span>
                    <MathText text={wq.question} />
                  </p>
                  <p className="text-rose-600 text-xs">Tu respuesta: <MathText text={wq.selected_answer} /></p>
                  <p className="text-emerald-700 text-xs mt-0.5">Correcta: <MathText text={wq.correct_answer} /></p>
                  {justText && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-slate-700 leading-relaxed">
                      <p className="font-semibold text-blue-800 mb-1">Justificación:</p>
                      <MathText text={justText} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2.5 mt-8">
        <Button
          onClick={onRetry}
          className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Intentar de nuevo
        </Button>

        {wrongAnswers.length > 0 && (
          <Button
            onClick={onRetryWrong}
            variant="outline"
            className="w-full h-11 rounded-xl font-semibold border-slate-200 hover:bg-slate-50"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Repasar incorrectas ({wrongAnswers.length})
          </Button>
        )}

        <Button
          onClick={onHome}
          variant="ghost"
          className="w-full h-11 rounded-xl text-slate-500 hover:text-slate-700"
        >
          <Home className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    </div>
  );
}
