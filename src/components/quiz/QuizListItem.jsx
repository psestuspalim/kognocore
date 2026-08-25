import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronRight, Smartphone, FolderInput } from 'lucide-react';

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

  let bestAttempt = null;
  let maxScore = -1;

  if (attempts.length > 0) {
    attempts.forEach(attempt => {
      const answered = getAnsweredCount(attempt);
      const currentScore = answered > 0 ? (Number(attempt.score || 0) / answered) * 100 : 0;
      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestAttempt = attempt;
      }
    });
    if (!bestAttempt) bestAttempt = attempts[0];
  }

  const bestScore = Math.max(0, Math.round(maxScore));
  let progressPercent = 0;
  if (totalQuestions > 0 && bestAttempt) {
    const maxAnswered = Math.max(...attempts.map(a => getAnsweredCount(a)));
    progressPercent = Math.min(100, Math.round((maxAnswered / totalQuestions) * 100));
  }
  if (attempts.some(a => a.is_completed)) progressPercent = 100;

  const getScoreColor = () => {
    if (bestScore >= 80) return 'text-emerald-600';
    if (bestScore >= 50) return 'text-amber-600';
    return 'text-rose-500';
  };

  const getProgressBarColor = () => {
    if (!hasAttempts) return 'bg-slate-200';
    if (bestScore >= 80) return 'bg-emerald-500';
    if (bestScore >= 50) return 'bg-amber-500';
    return 'bg-rose-400';
  };

  const inProgressAttempt = attempts.find(a => !a.is_completed && getAnsweredCount(a) > 0);
  const inProgressAnswered = inProgressAttempt ? getAnsweredCount(inProgressAttempt) : 0;

  return (
    <div
      className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white border transition-all duration-150 hover:shadow-sm cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary/30' : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => onStart(quiz, totalQuestions, 'all', attempts)}
    >
      {isAdmin && onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(quiz.id)}
          className="w-4 h-4 text-primary rounded cursor-pointer flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Score or status indicator */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${hasAttempts ? 'border-slate-200 bg-slate-50' : 'border-primary/20 bg-primary/5'}`}>
        {inProgressAttempt ? (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1 text-center">EN PROGRESO</span>
        ) : hasAttempts ? (
          <span className={`text-sm font-bold ${getScoreColor()}`}>{bestScore}%</span>
        ) : (
          <span className="text-[10px] font-bold text-primary uppercase">Nuevo</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate leading-tight">
            {quiz.title}
          </h4>
          {inProgressAttempt && (
            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 shrink-0">
              ⚡ Pregunta {inProgressAnswered + 1}/{totalQuestions}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-slate-400">{totalQuestions} preguntas</span>
          {hasAttempts && (
            <>
              <div className="flex-1 max-w-[120px] h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getProgressBarColor()} rounded-full transition-all`} style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-xs text-slate-400">{progressPercent}%</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {onStartSwipe && (
          <Button
            variant="ghost" size="icon"
            onClick={() => onStartSwipe(quiz)}
            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
            title="Modo V/F"
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        )}

        {isAdmin && (
          <>
            {onMove && (
              <Button
                variant="ghost" size="icon"
                onClick={() => onMove(quiz)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600"
                title="Mover"
              >
                <FolderInput className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={() => onEdit(quiz)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => onDelete(quiz.id)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors ml-1" />
      </div>
    </div>
  );
}
