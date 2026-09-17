import { summarizeQuizProgress } from '@/lib/quiz-progress';
import QuizProgressIndicator from './QuizProgressIndicator';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronRight, Smartphone, FolderInput } from 'lucide-react';

export default function QuizListItem({
  quiz,
  attempts = [],
  progress,
  isAdmin,
  onStart,
  onEdit,
  onDelete,
  onStartSwipe,
  onMove,
  isSelected = false,
  onSelect
}) {
  const totalQuestions = quiz.total_questions || quiz.questions?.length || quiz.q?.length || 0;
  const quizProgress = progress || summarizeQuizProgress(quiz, attempts);

  return (
    <div
      className={`group flex flex-wrap items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white border transition-colors duration-150 hover:shadow-sm cursor-pointer ${
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

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight break-words">
          {quiz.title}
        </h4>
        <QuizProgressIndicator progress={quizProgress} />
      </div>

      {/* Actions */}
      <div className="flex w-full sm:w-auto justify-end items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {onStartSwipe && (
          <Button
            variant="ghost" size="icon"
            onClick={() => onStartSwipe(quiz)}
            className="h-11 w-11 text-slate-400 hover:text-primary hover:bg-primary/5"
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
                className="h-9 w-9 text-slate-500 hover:text-amber-700 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                title="Mover"
              >
                <FolderInput className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={() => onEdit(quiz)}
              className="h-9 w-9 text-slate-500 hover:text-slate-800 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => onDelete(quiz.id)}
              className="h-9 w-9 text-slate-500 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              title="Eliminar"
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
