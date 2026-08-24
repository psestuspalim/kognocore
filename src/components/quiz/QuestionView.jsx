import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lightbulb, ChevronRight, ChevronLeft, Bookmark, ZoomIn, X, Sparkles } from 'lucide-react';
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
      return `${baseStyle} border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-500 font-medium`;
    }
    if (isIncorrectlySelected) {
      return `${baseStyle} border-rose-400 bg-rose-50 text-rose-950 shadow-sm ring-2 ring-rose-400 font-medium`;
    }
    if (isMissedCorrect) {
      return `${baseStyle} border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1.5 ring-emerald-400 font-medium`;
    }
    if (isSelected && !isRevealed) {
      return `${baseStyle} border-indigo-600 bg-indigo-50 shadow-sm text-indigo-950 ring-2 ring-indigo-500`;
    }

    return `${baseStyle} border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80 text-slate-800 shadow-2xs`;
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

    let badgeClass = "text-slate-600 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 border border-slate-200";

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
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs sm:text-sm font-bold shrink-0 transition-colors ${badgeClass}`}>
        {getLetterPrefix(index)}
      </span>
    );
  };

  const answeredCount = correctAnswers + wrongAnswers;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isLastQuestion = questionNumber === totalQuestions;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100/90 overflow-hidden font-sans">
      
      {/* 1. Header Fijo Superior (shrink-0) */}
      <header className="shrink-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shadow-2xs">
        {/* Botón Volver */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Salir</span>
        </button>

        {/* Título y Barra de Progreso */}
        <div className="flex-1 max-w-md mx-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
              {quizTitle || 'Cuestionario'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
              {questionNumber} / {totalQuestions}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200/50">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Contadores y Marcador */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              ✓ {correctAnswers}
            </span>
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              ✗ {wrongAnswers}
            </span>
          </div>

          <button
            onClick={handleToggleMark}
            title={isMarked ? 'Pregunta marcada para revisión' : 'Marcar pregunta'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMarked
                ? 'bg-amber-50 text-amber-600 border-amber-300'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-transparent'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. Área de Contenido con Scroll Independiente (flex-1 overflow-y-auto) */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto w-full p-3 sm:p-6 md:p-8 overscroll-contain"
      >
        <div className="max-w-3xl mx-auto space-y-4 pb-8">
          
          {/* Tarjeta Principal del Reactivo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 md:p-8 shadow-sm space-y-5">
            
            {/* Meta tags: Número de pregunta y Serie */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center px-3 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide text-xs">
                Pregunta #{questionNumber}
              </span>
              {question?.serie && (
                <span className="inline-flex items-center px-3 py-1 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                  Serie: {question.serie}
                </span>
              )}
            </div>

            {/* Enunciado / Caso Clínico */}
            <div className="text-[16px] sm:text-[17.5px] font-semibold leading-relaxed text-slate-900 pt-1">
              <MathText text={question?.question || question?.text} />
            </div>

            {/* Imagen médica con Zoom (si existe) */}
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
                  className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm transition-opacity opacity-90 hover:opacity-100"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Ampliar imagen</span>
                </button>
              </div>
            )}

            {/* Modal de Imagen Ampliada */}
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

            {/* Pista Médica Opcional */}
            {question?.hint && !showFeedback && showHintSetting && (
              <div>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{showHint ? 'Ocultar pista' : 'Ver pista clínica'}</span>
                </button>
                {showHint && (
                  <div className="mt-2 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                    <MathText text={question.hint} />
                  </div>
                )}
              </div>
            )}

            {/* Lista de Opciones */}
            <div className="space-y-2.5 pt-1">
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

            {/* Cuadro de Justificación (Al Responder) */}
            {showFeedback && (
              <div
                ref={feedbackRef}
                className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50/95 p-5 shadow-xs animate-in fade-in slide-in-from-bottom-3 duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm text-emerald-900 uppercase tracking-wide">
                    Justificación Clínica
                  </span>
                </div>
                <div className="text-sm sm:text-[15px] leading-relaxed text-emerald-950 font-normal">
                  <MathText text={getJustificationText()} />
                </div>

                {/* Botón de Siguiente Reactivo Integrado al Final de la Justificación */}
                <div className="mt-5 pt-4 border-t border-emerald-200 flex justify-end">
                  <Button
                    onClick={handleNext}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 px-6 sm:px-8 rounded-xl shadow-md flex items-center gap-2 transition-transform hover:scale-[1.02]"
                  >
                    <span>{isLastQuestion ? 'Finalizar y Ver Resultados' : 'Siguiente Reactivo'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 3. Footer Fijo Inferior (shrink-0) - Cero Empalmes Garantizado */}
      <footer className="shrink-0 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shadow-md">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm h-10 px-3.5 rounded-xl font-medium"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span>Salir</span>
        </Button>

        <div className="text-xs text-slate-500 hidden md:block">
          {showFeedback ? (
            <span className="text-indigo-600 font-medium">Presiona [Enter] o [Espacio] para avanzar</span>
          ) : (
            <span>Selecciona con teclas [A, B, C, D] o haz clic en la opción</span>
          )}
        </div>

        <Button
          onClick={handleNext}
          disabled={!showFeedback && selectedAnswer === null}
          className={`h-10 px-6 sm:px-7 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
            showFeedback
              ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300/40'
              : 'bg-slate-900 hover:bg-black opacity-90'
          }`}
        >
          <span>{isLastQuestion ? 'Finalizar' : 'Siguiente Reactivo'}</span>
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </footer>
    </div>
  );
}
