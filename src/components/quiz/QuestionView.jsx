import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lightbulb, ChevronRight, ChevronLeft, Bookmark, ZoomIn, X } from 'lucide-react';
import { client } from '@/api/client';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';

export default function QuestionView({
  question,
  questionNumber,
  totalQuestions,
  correctAnswers = 0,
  wrongAnswers = 0,
  onAnswer,
  onBack,
  onMarkForReview,
  previousAttempts = [],
  quizId,
  userEmail,
  settings = {},
  quizTitle = '',
  subjectId = null,
  sessionId = null,
  initialIsMarked = false
}) {
  const showHintSetting = settings.show_hint !== false;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMarked, setIsMarked] = useState(initialIsMarked);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const feedbackRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Reiniciar estado y hacer scroll al inicio de la pregunta
  useEffect(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setShowHint(false);
    setIsImageZoomed(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [questionNumber]);

  // Al responder, hacer scroll suave dentro del contenedor para mostrar la justificación completa
  useEffect(() => {
    if (showFeedback && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [showFeedback]);

  // Actualizar sesión en vivo
  useEffect(() => {
    const updateSession = async () => {
      if (sessionId) {
        try {
          await client.entities.QuizSession.update(sessionId, {
            current_question: questionNumber,
            score: correctAnswers,
            wrong_count: wrongAnswers,
            last_activity: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }
    };
    updateSession();
  }, [sessionId, questionNumber, correctAnswers, wrongAnswers]);

  // Normalize options
  const options = question?.answerOptions || question?.options || [];

  const handleSelectAnswer = useCallback((index) => {
    if (showFeedback || index < 0 || index >= options.length) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
  }, [showFeedback, options.length]);

  const selectedOption = selectedAnswer !== null ? options[selectedAnswer] : null;
  const correctOption = options.find(o => o.isCorrect) || null;

  const getJustificationText = () => {
    return (
      question?.justificacion ||
      question?.justificación ||
      question?.feedback ||
      question?.explanation ||
      correctOption?.rationale ||
      "Opción correcta según los criterios clínicos establecidos."
    );
  };

  const handleNext = useCallback(() => {
    const isCorrect = selectedOption?.isCorrect;
    onAnswer(isCorrect, selectedOption, question);
  }, [selectedOption, onAnswer, question]);

  const handleToggleMark = () => {
    const nextState = !isMarked;
    setIsMarked(nextState);
    if (onMarkForReview) {
      onMarkForReview(question, nextState);
    }
  };

  // Soporte para atajos de teclado (A, B, C, D, 1, 2, 3, 4, Enter, Espacio, Flecha)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();

      if (!showFeedback) {
        if (key === 'a' || key === '1') handleSelectAnswer(0);
        else if (key === 'b' || key === '2') handleSelectAnswer(1);
        else if (key === 'c' || key === '3') handleSelectAnswer(2);
        else if (key === 'd' || key === '4') handleSelectAnswer(3);
        else if (key === 'e' || key === '5') handleSelectAnswer(4);
      } else {
        if (key === 'enter' || key === ' ' || key === 'arrowright') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFeedback, handleSelectAnswer, handleNext]);

  if (question?.type === 'image' && options.length === 0) {
    return (
      <ImageQuestionView
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onAnswer={(isCorrect, details) => onAnswer(isCorrect, details, question)}
      />
    );
  }

  const getOptionStyle = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option?.isCorrect;
    const isRevealed = showFeedback;

    const isCorrectlySelected = isRevealed && isSelected && isCorrect;
    const isIncorrectlySelected = isRevealed && isSelected && !isCorrect;
    const isMissedCorrect = isRevealed && !isSelected && isCorrect;

    const baseStyle = "group relative p-3 sm:p-4 rounded-xl border text-left transition-all duration-150 ease-out cursor-pointer select-none flex items-start gap-3 w-full";

    if (isCorrectlySelected) {
      return `${baseStyle} border-emerald-400 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-400`;
    }
    if (isIncorrectlySelected) {
      return `${baseStyle} border-rose-300 bg-rose-50 text-rose-950 ring-2 ring-rose-300`;
    }
    if (isMissedCorrect) {
      return `${baseStyle} border-emerald-400 bg-emerald-50/60 text-emerald-950 ring-1 ring-emerald-300`;
    }
    if (isSelected && !isRevealed) {
      return `${baseStyle} border-slate-900 bg-slate-50 text-slate-900 ring-2 ring-slate-900`;
    }

    return `${baseStyle} border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-900`;
  };

  const getLetterPrefix = (index) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return letters[index] || String(index + 1);
  };

  const getLetterBadge = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option?.isCorrect;
    const isRevealed = showFeedback;

    let badgeClass = "text-slate-500 bg-slate-100 group-hover:bg-slate-200 group-hover:text-slate-700 border border-slate-200/60";

    if (isRevealed) {
      if (isCorrect) {
        badgeClass = "text-white bg-emerald-500 border-emerald-500 font-bold";
      } else if (isSelected && !isCorrect) {
        badgeClass = "text-white bg-rose-500 border-rose-500 font-bold";
      }
    } else if (isSelected) {
      badgeClass = "text-white bg-slate-900 border-slate-900 font-bold";
    }

    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs sm:text-sm font-bold shrink-0 transition-colors ${badgeClass}`}>
        {getLetterPrefix(index)}
      </span>
    );
  };

  const answeredCount = correctAnswers + wrongAnswers;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isLastQuestion = questionNumber === totalQuestions;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-slate-100 font-sans">

      {/* Header */}
      <header className="z-20 shrink-0 border-b border-slate-300/80 bg-white px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Salir del cuestionario"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Salir</span>
          </button>

          <div className="flex-1 max-w-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-600 truncate">
                {questionNumber} de {totalQuestions}
              </span>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-emerald-600 font-semibold">{correctAnswers}</span>
                <span className="text-slate-300">/</span>
                <span className="text-rose-500 font-semibold">{wrongAnswers}</span>
              </div>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleToggleMark}
            title={isMarked ? 'Marcada para revisión' : 'Marcar para revisión'}
            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors shrink-0 ${
              isMarked
                ? 'text-amber-500'
                : 'text-slate-300 hover:text-slate-500'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto w-full overscroll-contain"
      >
        <div className="mx-auto max-w-3xl space-y-5 px-3 py-5 pb-8 sm:px-6 sm:py-8">

          {/* Question card */}
          <div className="space-y-5">

            {question?.serie && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                Serie: {question.serie}
              </span>
            )}

            {/* Question text */}
            <div className="text-base sm:text-[17px] font-medium leading-[1.65] text-slate-900">
              <MathText text={question?.question || question?.text} />
            </div>

            {/* Clinical image */}
            {question?.imageUrl && (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[240px] flex items-center justify-center p-2">
                <img
                  src={question.imageUrl}
                  alt="Imagen clínica"
                  className="max-h-[220px] w-auto object-contain mx-auto rounded-lg cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={() => setIsImageZoomed(true)}
                />
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Ampliar</span>
                </button>
              </div>
            )}

            {/* Image zoom modal */}
            {isImageZoomed && question?.imageUrl && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setIsImageZoomed(false)}
              >
                <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setIsImageZoomed(false)}
                    className="absolute top-3 right-3 z-10 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full p-1.5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <img
                    src={question.imageUrl}
                    alt="Imagen ampliada"
                    className="max-h-[85vh] w-auto object-contain mx-auto rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Hint */}
            {question?.hint && !showFeedback && showHintSetting && (
              <div>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Ocultar pista' : 'Ver pista'}</span>
                </button>
                {showHint && (
                  <div className="mt-2 p-3.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-sm text-amber-900 leading-relaxed">
                    <MathText text={question.hint} />
                  </div>
                )}
              </div>
            )}

            {/* Answer options */}
            <div className="space-y-2 pt-1">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showFeedback}
                  className={getOptionStyle(index)}
                >
                  {getLetterBadge(index)}
                  <div className="pt-0.5 flex-1 text-sm sm:text-[15px] font-normal leading-snug text-slate-800">
                    <MathText text={option.text} />
                  </div>
                </button>
              ))}
            </div>

            {/* Feedback / Justification */}
            {showFeedback && (
              <div
                ref={feedbackRef}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Justificación
                    </span>
                    <div className="mt-2 text-sm sm:text-[15px] leading-relaxed text-slate-700">
                      <MathText text={getJustificationText()} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer - single source of truth for navigation */}
      <footer className="z-20 shrink-0 border-t border-slate-300/80 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-xs text-slate-400 hidden md:block">
            {showFeedback ? (
              <span>[Enter] siguiente</span>
            ) : (
              <span>[A-D] seleccionar</span>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={!showFeedback}
            className="ml-auto h-11 w-full rounded-xl bg-slate-900 px-8 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-30 sm:w-auto"
          >
            <span>{isLastQuestion ? 'Ver resultados' : 'Siguiente'}</span>
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
