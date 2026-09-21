import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, ChevronRight, ChevronLeft, Bookmark, ZoomIn, X } from 'lucide-react';
import { client } from '@/api/client';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';
import OpenEndedQuestionView from './OpenEndedQuestionView';

const OPEN_ENDED_TYPES = new Set(['enumeracion', 'numerico', 'respuesta_corta', 'cloze', 'relacion', 'secuencia']);

export default function QuestionView({
  question,
  questionNumber,
  totalQuestions,
  correctAnswers = 0,
  wrongAnswers = 0,
  onAnswer,
  onNext,
  savedAnswer,
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
  const answerLock = useRef(false);
  const scrollContainerRef = useRef(null);
  const feedbackContainerRef = useRef(null);

  // Restoring an answer must not move the question or collapse its hint.
  useEffect(() => {
    const savedIndex = (question?.answerOptions || question?.options || []).findIndex(o => o.text === savedAnswer?.selected_answer);
    setSelectedAnswer(savedIndex >= 0 ? savedIndex : null);
    setShowFeedback(savedIndex >= 0);
    answerLock.current = savedIndex >= 0;
  }, [questionNumber, question, savedAnswer]);

  useEffect(() => {
    setIsMarked(initialIsMarked);
  }, [initialIsMarked, questionNumber]);

  useEffect(() => {
    setShowHint(false);
    setIsImageZoomed(false);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    feedbackContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [questionNumber, question]);

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
    if (answerLock.current || showFeedback || index < 0 || index >= options.length) return;
    answerLock.current = true;
    setSelectedAnswer(index);
    setShowFeedback(true);
    if (onNext) onAnswer(Boolean(options[index].isCorrect), options[index], question);
  }, [showFeedback, options, onAnswer, onNext, question]);

  const selectedOption = selectedAnswer !== null ? options[selectedAnswer] : null;
  const correctOption = options.find(o => o.isCorrect) || null;

  const getJustificationText = () => {
    return (
      question?.justificacion ||
      question?.justificación ||
      question?.feedback ||
      question?.explanation ||
      correctOption?.rationale ||
      "El archivo no incluye una justificación general para esta pregunta."
    );
  };

  const handleNext = useCallback(() => {
    if (!showFeedback) return;
    if (onNext) onNext();
    else onAnswer(Boolean(selectedOption?.isCorrect), selectedOption, question);
  }, [showFeedback, onNext, onAnswer, selectedOption, question]);

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

  const qType = String(question?.tipo || question?.type || '').toLowerCase();
  if (OPEN_ENDED_TYPES.has(qType)) {
    return (
      <OpenEndedQuestionView
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onNext={onNext}
        onAnswer={onAnswer}
        savedAnswer={savedAnswer}
      />
    );
  }

  if (question?.type === 'image' && options.length === 0) {
    return (
      <ImageQuestionView
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onNext={onNext}
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

    const baseStyle = "group relative p-2 sm:p-3 rounded-xl border text-left transition-colors duration-150 motion-reduce:transition-none cursor-pointer select-none flex items-start gap-3 w-full";

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
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
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
                className="h-full bg-primary rounded-full"
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
        className="min-h-0 flex-1 w-full max-w-6xl mx-auto grid overflow-hidden grid-rows-[minmax(0,1fr)_minmax(0,0.7fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
      >
        <div ref={scrollContainerRef} className="mx-auto w-full max-w-3xl min-h-0 overflow-y-auto [scrollbar-gutter:stable] px-3 py-3 sm:px-5">

          {/* Question card */}
          <div className="space-y-2">

            {question?.serie && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                Serie: {question.serie}
              </span>
            )}

            {/* Question text */}
            <div className="text-sm sm:text-base font-medium leading-snug text-slate-900">
              <MathText text={question?.question || question?.text} />
            </div>

            {/* Clinical image */}
            {question?.imageUrl && (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[18dvh] flex items-center justify-center p-2">
                <img
                  src={question.imageUrl}
                  alt="Imagen clínica"
                  className="max-h-[16dvh] w-auto object-contain mx-auto rounded-lg cursor-pointer"
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
            {question?.hint && showHintSetting && (
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

          </div>
        </div>
          <section ref={feedbackContainerRef} aria-label="Explicación de la respuesta" aria-live="polite" className="min-h-0 overflow-y-auto [scrollbar-gutter:stable] border-t lg:border-t-0 lg:border-l border-slate-200 bg-white p-3 sm:p-5">
            {showFeedback ? (
            <div className="mx-auto max-w-3xl space-y-3 text-sm leading-snug">
              <h2 className={`font-bold ${selectedOption?.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                {selectedOption?.isCorrect ? 'Respuesta correcta' : 'Por qué tu respuesta es incorrecta'}
              </h2>
              {!selectedOption?.isCorrect && <MathText text={selectedOption?.rationale || selectedOption?.r || 'El archivo no incluye una explicación específica para esta opción.'} />}
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-950">
                <p className="font-semibold mb-1">Respuesta correcta</p>
                <MathText text={correctOption?.text || ''} />
              </div>
              <MathText text={getJustificationText()} />
            </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-500">Elige tu respuesta</p>
                <p className="max-w-xs text-xs leading-relaxed">Aquí verás la explicación al contestar.</p>
              </div>
            )}
          </section>
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
            className="ml-auto h-11 w-full rounded-xl bg-slate-900 px-8 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-30 sm:w-auto"
          >
            <span>{isLastQuestion ? 'Ver resultados' : 'Siguiente'}</span>
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
