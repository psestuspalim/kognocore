import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, Bookmark, ZoomIn, X } from 'lucide-react';
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

  // Reiniciar estado y hacer scroll al inicio al cambiar pregunta
  useEffect(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setShowHint(false);
    setIsImageZoomed(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [questionNumber]);

  // Scroll suave al aparecer justificación
  useEffect(() => {
    if (showFeedback && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
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
  const options = question.answerOptions || question.options || [];

  if (question.type === 'image' && options.length === 0) {
    return (
      <ImageQuestionView
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onAnswer={(isCorrect, details) => onAnswer(isCorrect, details, question)}
      />
    );
  }

  const handleSelectAnswer = useCallback((index) => {
    if (showFeedback || index < 0 || index >= options.length) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
  }, [showFeedback, options.length]);

  const selectedOption = selectedAnswer !== null ? options[selectedAnswer] : null;
  const correctOption = options.find(o => o.isCorrect) || null;

  const getJustificationText = () => {
    return (
      question.justificacion ||
      question.justificación ||
      question.feedback ||
      question.explanation ||
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

  // Soporte para atajos de teclado (A, B, C, D, 1, 2, 3, 4, Enter, Espacio)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar si el usuario está escribiendo en algún input
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

  const getOptionStyle = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option.isCorrect;
    const isRevealed = showFeedback;

    const isCorrectlySelected = isRevealed && isSelected && isCorrect;
    const isIncorrectlySelected = isRevealed && isSelected && !isCorrect;
    const isMissedCorrect = isRevealed && !isSelected && isCorrect;

    const baseStyle = "group relative p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-150 ease-out cursor-pointer select-none flex items-start gap-3 w-full";

    if (isCorrectlySelected) {
      return `${baseStyle} border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm ring-1.5 ring-emerald-500`;
    }
    if (isIncorrectlySelected) {
      return `${baseStyle} border-rose-400 bg-rose-50/90 text-rose-950 shadow-sm ring-1.5 ring-rose-400`;
    }
    if (isMissedCorrect) {
      return `${baseStyle} border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-400`;
    }
    if (isSelected && !isRevealed) {
      return `${baseStyle} border-indigo-600 bg-indigo-50 shadow-sm text-indigo-950 ring-1.5 ring-indigo-500`;
    }

    return `${baseStyle} border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-800 shadow-2xs`;
  };

  const getLetterPrefix = (index) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return letters[index] || String(index + 1);
  };

  const getLetterBadge = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option.isCorrect;
    const isRevealed = showFeedback;

    let badgeClass = "text-slate-600 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 border border-slate-200/80";

    if (isRevealed) {
      if (isCorrect) {
        badgeClass = "text-white bg-emerald-600 border-emerald-600 font-bold shadow-xs";
      } else if (isSelected && !isCorrect) {
        badgeClass = "text-white bg-rose-600 border-rose-600 font-bold shadow-xs";
      }
    } else if (isSelected) {
      badgeClass = "text-white bg-indigo-600 border-indigo-600 font-bold shadow-xs";
    }

    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs sm:text-sm font-bold shrink-0 transition-colors ${badgeClass}`}>
        {getLetterPrefix(index)}
      </span>
    );
  };

  const answeredCount = correctAnswers + wrongAnswers;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="relative w-full min-h-screen pb-36 bg-slate-50/60 font-sans">
      {/* Top Bar - Compact, Sticky & Clean */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs px-3 py-2.5 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          {/* Title & Question Progress Indicator */}
          <div className="flex-1 text-center px-2 min-w-0">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md">
                {quizTitle || 'Cuestionario'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
                {questionNumber} / {totalQuestions}
              </span>
            </div>
            {/* Slim Progress Bar */}
            <div className="w-full max-w-xs mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200/50">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Score Badges & Mark Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                ✓ {correctAnswers}
              </span>
              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                ✗ {wrongAnswers}
              </span>
            </div>

            <button
              onClick={handleToggleMark}
              title={isMarked ? 'Pregunta marcada' : 'Marcar para revisar'}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMarked
                  ? 'bg-amber-50 text-amber-600 border-amber-300'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-transparent'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Question Container */}
      <main className="w-full max-w-3xl mx-auto p-3 sm:p-5 md:p-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 md:p-7 shadow-sm space-y-4">
          
          {/* Question Meta Tags (Serie / Category) */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wide text-[11px]">
              Pregunta #{questionNumber}
            </span>
            {question.serie && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                Serie: {question.serie}
              </span>
            )}
          </div>

          {/* Question Text / Clinical Vignette */}
          <div className="text-[15px] sm:text-[17px] font-semibold leading-relaxed text-slate-900 pt-1">
            <MathText text={question.question} />
          </div>

          {/* Image Thumbnail with Zoom Modal */}
          {question.imageUrl && (
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[220px] flex items-center justify-center p-2">
              <img
                src={question.imageUrl}
                alt="Imagen clínica"
                className="max-h-[200px] w-auto object-contain mx-auto rounded-lg cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => setIsImageZoomed(true)}
              />
              <button
                type="button"
                onClick={() => setIsImageZoomed(true)}
                className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm transition-opacity opacity-90 hover:opacity-100"
              >
                <ZoomIn className="w-3 h-3" />
                <span>Ampliar imagen</span>
              </button>
            </div>
          )}

          {/* Modal de Imagen Ampliada */}
          {isImageZoomed && question.imageUrl && (
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

          {/* Optional Hint Toggle */}
          {question.hint && !showFeedback && showHintSetting && (
            <div>
              <button
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Ocultar pista' : 'Ver pista médica'}</span>
              </button>
              {showHint && (
                <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <MathText text={question.hint} />
                </div>
              )}
            </div>
          )}

          {/* Answer Options List */}
          <div className="space-y-2 sm:space-y-2.5 pt-1">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                disabled={showFeedback}
                className={getOptionStyle(index)}
              >
                {getLetterBadge(index)}
                <div className="pt-0.5 flex-1 text-xs sm:text-[14.5px] font-normal leading-snug text-slate-800">
                  <MathText text={option.text} />
                </div>
              </button>
            ))}
          </div>

          {/* Clean Justification Box (When Answered) */}
          {showFeedback && (
            <div
              ref={feedbackRef}
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-2xs animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-xs text-emerald-900 uppercase tracking-wide">
                  Justificación
                </span>
              </div>
              <div className="text-xs sm:text-[14px] leading-relaxed text-emerald-950 font-normal">
                <MathText text={getJustificationText()} />
              </div>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="hidden sm:inline">Atajos: Teclas A, B, C, D o 1, 2, 3, 4</span>
            {showFeedback && <span className="hidden sm:inline">Presiona [Enter] o [Espacio] para avanzar</span>}
          </div>
        </div>
      </main>

      {/* Permanently Docked Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_15px_rgba(0,0,0,0.06)] py-2.5 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm h-10 px-3.5 rounded-xl font-medium"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>Salir</span>
          </Button>

          <Button
            onClick={handleNext}
            disabled={!showFeedback && selectedAnswer === null}
            className={`h-10 px-6 sm:px-8 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
              showFeedback
                ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300/40'
                : 'bg-slate-900 hover:bg-black opacity-90'
            }`}
          >
            <span>{questionNumber === totalQuestions ? 'Finalizar Cuestionario' : 'Siguiente Reactivo'}</span>
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
