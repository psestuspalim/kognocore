import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronRight, CheckCircle2, XCircle, HelpCircle, BarChart3, Smartphone, FolderInput } from 'lucide-react';

export default function QuizListItem({
  quiz,
  attempts = [],
  isAdmin,
  onStart,
  onEdit,
  onDelete,
  onStartSwipe,
  onMove,
  isSelected = false,
  onSelect
}) {
  const totalQuestions = quiz.total_questions || quiz.questions?.length || 0;
  const hasAttempts = attempts.length > 0;
  const getAnsweredCount = (attempt) => {
    const explicitAnswered = Number(attempt?.answered_questions ?? 0);
    const inferredAnswered = Number(attempt?.score ?? 0) + Number(attempt?.wrong_questions?.length ?? 0);
    return Math.max(explicitAnswered, inferredAnswered, 0);
  };

  // Calculate best and progress stats based on the smartest attempt
  let bestAttempt = null;
  let maxScore = -1;
  let maxAnswered = -1;
  let latestAttempt = null;

  if (attempts.length > 0) {
    // Ordenar intentos por fecha si es posible para tener el `latestAttempt`, pero la API
    // usualmente los envía ya ordenados por -created_date.
    latestAttempt = attempts[0];

    attempts.forEach(attempt => {
      const answered = getAnsweredCount(attempt);
      // Rendimiento real del intento: aciertos sobre preguntas respondidas
      const currentScore = answered > 0 ? (Number(attempt.score || 0) / answered) * 100 : 0;
      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestAttempt = attempt;
      }
      if (answered > maxAnswered) {
        maxAnswered = answered;
      }
    });

    // Handle edge case where scores are 0 but progress exists
    if (!bestAttempt) bestAttempt = latestAttempt;
  }

  // Calculate stats to display
  const uniqueCorrect = bestAttempt ? Number(bestAttempt.score || 0) : 0;
  const uniqueWrong = bestAttempt
    ? Math.max(0, getAnsweredCount(bestAttempt) - Number(bestAttempt.score || 0))
    : 0;

  const avgScore = attempts.length > 0
    ? Math.round(
      attempts.reduce((sum, a) => {
        const answered = getAnsweredCount(a);
        const accuracy = answered > 0 ? (Number(a.score || 0) / answered) * 100 : 0;
        return sum + accuracy;
      }, 0) / attempts.length
    )
    : 0;

  const bestScore = Math.max(0, Math.round(maxScore));

  // Progress is computed on the attempt that went the furthest
  let progressPercent = 0;
  if (totalQuestions > 0 && maxAnswered > -1) {
    progressPercent = Math.min(100, Math.round((maxAnswered / totalQuestions) * 100));
  }
  // Si algún intento fue marcado como completado, fuerza el 100%
  if (attempts.some(a => a.is_completed)) {
    progressPercent = 100;
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-700';
    if (score >= 50) return 'text-amber-700';
    return 'text-rose-700';
  };

  const getBorderColor = () => {
    if (!hasAttempts) return 'border-white/70 hover:border-indigo-300 bg-white/90';
    if (bestScore >= 80) return 'border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/80';
    if (bestScore >= 50) return 'border-amber-300/80 hover:border-amber-500 bg-amber-50/85';
    return 'border-rose-300/80 hover:border-rose-500 bg-rose-50/85';
  };

  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-2xl border shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md cursor-pointer ${getBorderColor()} ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/70' : ''}`}
      onClick={() => onStart(quiz, totalQuestions, 'all', attempts)}
    >
      {/* Checkbox para selección múltiple */}
      {isAdmin && onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(quiz.id)}
          className="w-4 h-4 text-indigo-600 rounded cursor-pointer flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Indicador de progreso circular */}
      <div className="relative flex-shrink-0">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#e5e7eb"
            strokeWidth="5"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke={bestScore >= 80 ? '#22c55e' : bestScore >= 50 ? '#eab308' : bestScore > 0 ? '#ef4444' : '#6366f1'}
            strokeWidth="5"
            fill="none"
            strokeDasharray={`${(bestScore / 100) * 125.6} 125.6`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${hasAttempts ? getScoreColor(bestScore) : 'text-slate-500'}`}>
          {hasAttempts ? `${bestScore}%` : 'Nuevo'}
        </span>
      </div>

      {/* Información del quiz */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-900 truncate">
            {quiz.title}
          </h4>
          {quiz.is_hidden && (
            <Badge variant="outline" className="text-xs bg-gray-100">🔒</Badge>
          )}
        </div>

        {/* Stats en línea */}
        <div className="flex items-center gap-3 mt-1 text-xs">
          <span className="flex items-center gap-1 text-slate-500">
            <HelpCircle className="w-3 h-3" />
            {totalQuestions}
          </span>

          {hasAttempts && (
            <>
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                {uniqueCorrect}
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <XCircle className="w-3 h-3" />
                {uniqueWrong}
              </span>
              <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                <BarChart3 className="w-3 h-3" />
                Acierto: {bestScore}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Badges de estado */}
      <div className="hidden sm:flex items-center gap-2">
        {hasAttempts ? (
          <>
            <Badge
              className={`text-xs ${avgScore >= 80
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : avgScore >= 50
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-rose-100 text-rose-700 border-rose-300'
                }`}
            >
              Avance: {progressPercent}%
            </Badge>
          </>
        ) : (
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs font-semibold">
            Sin intentar
          </Badge>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Botón de modo swipe */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onStartSwipe && onStartSwipe(quiz)}
          className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
          title="Modo V/F (deslizar)"
        >
          <Smartphone className="w-4 h-4" />
        </Button>

        {isAdmin && (
          <>
            {onMove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove(quiz)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600"
                title="Mover quiz"
              >
                <FolderInput className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(quiz)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(quiz.id)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </div>
    </div>
  );
}
