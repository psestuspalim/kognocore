import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronRight, CheckCircle2, XCircle, HelpCircle, BarChart3, Smartphone, FolderInput } from 'lucide-react';


import { motion } from 'framer-motion';

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
      const currentScore = attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0;
      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestAttempt = attempt;
      }
      if ((attempt.answered_questions || 0) > maxAnswered) {
        maxAnswered = attempt.answered_questions || 0;
      }
    });

    // Handle edge case where scores are 0 but progress exists
    if (!bestAttempt) bestAttempt = latestAttempt;
  }

  // Calculate stats to display
  const uniqueCorrect = bestAttempt ? bestAttempt.score : 0;
  const uniqueWrong = bestAttempt ? (bestAttempt.wrong_questions?.length || (bestAttempt.answered_questions - bestAttempt.score)) : 0;

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0), 0) / attempts.length)
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
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBorderColor = () => {
    if (!hasAttempts) return 'border-gray-200 hover:border-indigo-300';
    if (bestScore >= 80) return 'border-green-200 hover:border-green-400 bg-green-50/30';
    if (bestScore >= 50) return 'border-yellow-200 hover:border-yellow-400 bg-yellow-50/30';
    return 'border-red-200 hover:border-red-400 bg-red-50/30';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${getBorderColor()} ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : ''}`}
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
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke={bestScore >= 80 ? '#22c55e' : bestScore >= 50 ? '#eab308' : bestScore > 0 ? '#ef4444' : '#6366f1'}
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${(bestScore / 100) * 125.6} 125.6`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${hasAttempts ? getScoreColor(bestScore) : 'text-gray-400'}`}>
          {hasAttempts ? `${bestScore}%` : 'Nuevo'}
        </span>
      </div>

      {/* Información del quiz */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">
            {quiz.title}
          </h4>
          {quiz.is_hidden && (
            <Badge variant="outline" className="text-xs bg-gray-100">🔒</Badge>
          )}
        </div>

        {/* Stats en línea */}
        <div className="flex items-center gap-3 mt-1 text-xs">
          <span className="flex items-center gap-1 text-gray-500">
            <HelpCircle className="w-3 h-3" />
            {totalQuestions}
          </span>

          {hasAttempts && (
            <>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                {uniqueCorrect}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="w-3 h-3" />
                {uniqueWrong}
              </span>
              <span className="flex items-center gap-1 text-indigo-600">
                <BarChart3 className="w-3 h-3" />
                Mejor: {bestScore}%
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
                ? 'bg-green-100 text-green-700 border-green-300'
                : avgScore >= 50
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                  : 'bg-red-100 text-red-700 border-red-300'
                }`}
            >
              {progressPercent}% completado
            </Badge>
          </>
        ) : (
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs">
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
          className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
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
                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-amber-600"
                title="Mover quiz"
              >
                <FolderInput className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(quiz)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(quiz.id)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
      </div>
    </motion.div>
  );
}