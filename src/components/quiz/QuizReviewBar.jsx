import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function QuizReviewBar({
  questionNumber,
  totalQuestions,
  correctAnswers = 0,
  wrongAnswers = 0,
  onBack,
  reviewDetails = {}
}) {
  const {
    studentName = 'Estudiante',
    quizTitle = 'Cuestionario',
    filter = 'all',
    onFilterChange,
    questionStatuses = [],
    onJumpToQuestion,
    onApprove,
    isApproved = false
  } = reviewDetails || {};

  const activePillRef = useRef(null);

  // Auto-scroll the active pill into view when questionNumber changes
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [questionNumber]);

  const currentIndex = questionNumber - 1;
  const currentStatus = questionStatuses[currentIndex];
  const isCurrentCorrect = currentStatus ? currentStatus.isCorrect : true;

  const wrongCount = questionStatuses.filter(s => !s.isCorrect && !s.isApproved).length;
  const correctCount = questionStatuses.filter(s => s.isCorrect || s.isApproved).length;

  return (
    <div className="z-20 shrink-0 border-b border-slate-300/80 bg-white shadow-xs">
      {/* Top Header Row */}
      <div className="px-3 py-2 sm:px-6 border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
            title="Volver"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          {/* Student & Quiz info */}
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {quizTitle}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              Intento de: <strong className="text-slate-700 font-semibold">{studentName}</strong>
            </p>
          </div>

          {/* Score Badge & Admin Action */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="hidden sm:inline-flex bg-slate-50 border-slate-300 text-slate-700 font-semibold text-xs py-1">
              {correctAnswers} / {totalQuestions} ({totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}%)
            </Badge>

            {onApprove && !isApproved && (
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-3 cursor-pointer shadow-xs"
                title="Aceptar esta respuesta como correcta"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Aceptar como correcta</span>
                <span className="sm:hidden">Validar</span>
              </Button>
            )}

            {isApproved && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                Validada por admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Question Selector Pills Strip */}
      <div className="px-3 py-2 sm:px-6 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 max-w-6xl mx-auto">
        {/* Filter buttons */}
        {onFilterChange && (
          <div className="flex flex-wrap items-center gap-1 shrink-0 text-xs">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Todas ({questionStatuses.length})
            </button>
            <button
              onClick={() => onFilterChange('wrong')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filter === 'wrong'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              Incorrectas ({wrongCount})
            </button>
            <button
              onClick={() => onFilterChange('correct')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filter === 'correct'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Correctas ({correctCount})
            </button>
          </div>
        )}

        {/* Scrollable Pills Strip */}
        <div className="flex-1 min-w-0 overflow-x-auto py-1 scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-max pr-2">
            {questionStatuses.map((status, idx) => {
              const isActive = status.index === currentIndex;
              const isFilteredOut =
                (filter === 'wrong' && (status.isCorrect || status.isApproved)) ||
                (filter === 'correct' && (!status.isCorrect && !status.isApproved));

              if (isFilteredOut) return null;

              let colorClasses = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100';
              if (status.isApproved) {
                colorClasses = 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200';
              } else if (status.isCorrect) {
                colorClasses = 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200';
              } else {
                colorClasses = 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200';
              }

              return (
                <button
                  key={status.index}
                  ref={isActive ? activePillRef : null}
                  onClick={() => onJumpToQuestion && onJumpToQuestion(status.index)}
                  className={`w-11 h-11 sm:w-8 sm:h-8 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center shrink-0 ${colorClasses} ${
                    isActive ? 'ring-2 ring-indigo-600 ring-offset-1 font-extrabold scale-110 shadow-sm' : ''
                  }`}
                  title={`Pregunta ${status.index + 1} (${status.isApproved ? 'Validada' : status.isCorrect ? 'Correcta' : 'Incorrecta'})`}
                >
                  {status.index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

