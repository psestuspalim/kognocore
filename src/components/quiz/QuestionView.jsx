import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react';
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

  // Reiniciar estado y hacer scroll al inicio cuando cambia el número de pregunta
  useEffect(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setShowHint(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [questionNumber]);

  // Actualizar sesión cuando cambia la pregunta
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

  const handleSelectAnswer = (index) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
  };

  const selectedOption = selectedAnswer !== null ? options[selectedAnswer] : null;
  const correctOption = options.find(o => o.isCorrect) || null;

  const getJustificationText = () => {
    return (
      question.justificacion ||
      question.justificación ||
      question.feedback ||
      question.explanation ||
      correctOption?.rationale ||
      "Respuesta correcta."
    );
  };

  const handleNext = () => {
    const isCorrect = selectedOption?.isCorrect;
    onAnswer(isCorrect, selectedOption, question);
  };

  const getOptionStyle = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option.isCorrect;
    const isRevealed = showFeedback;

    const isCorrectlySelected = isRevealed && isSelected && isCorrect;
    const isIncorrectlySelected = isRevealed && isSelected && !isCorrect;
    const isMissedCorrect = isRevealed && !isSelected && isCorrect;

    const baseStyle = "relative p-3.5 md:p-4 rounded-xl border flex flex-col w-full text-left transition-all duration-150 ease-out cursor-pointer select-none";

    if (isCorrectlySelected) {
      return `${baseStyle} border-emerald-500 bg-emerald-50 text-emerald-950 font-medium shadow-sm ring-2 ring-emerald-400`;
    }
    if (isIncorrectlySelected) {
      return `${baseStyle} border-rose-400 bg-rose-50 text-rose-950 shadow-sm ring-2 ring-rose-300`;
    }
    if (isMissedCorrect) {
      return `${baseStyle} border-emerald-400 bg-emerald-50/80 text-emerald-950 font-medium`;
    }
    if (isSelected && !isRevealed) {
      return `${baseStyle} border-indigo-600 bg-indigo-50 shadow-sm text-slate-900`;
    }

    return `${baseStyle} border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80 text-slate-800 shadow-sm`;
  };

  const getLetterPrefix = (index) => {
    const letters = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];
    return letters[index] || `${index + 1}.`;
  };

  const getLetterBadge = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option.isCorrect;
    const isRevealed = showFeedback;

    let badgeClass = "text-slate-600 bg-slate-100";

    if (isRevealed) {
      if (isCorrect) {
        badgeClass = "text-emerald-900 bg-emerald-200 font-bold";
      } else if (isSelected && !isCorrect) {
        badgeClass = "text-rose-900 bg-rose-200 font-bold";
      }
    } else if (isSelected) {
      badgeClass = "text-indigo-900 bg-indigo-200 font-bold";
    }

    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-semibold shrink-0 ${badgeClass}`}>
        {getLetterPrefix(index).replace('.', '')}
      </span>
    );
  };

  const answeredCount = correctAnswers + wrongAnswers;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="relative w-full min-h-screen pb-32 bg-[linear-gradient(160deg,#f8fafc_0%,#f1f5f9_50%,#e2e8f0_100%)] font-sans">
      {/* Top Bar */}
      <header className="px-4 pt-4 md:px-6">
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Salir</span>
            </button>

            <div className="text-center flex-1 truncate px-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {quizTitle || 'Cuestionario'}
              </h1>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✓ {correctAnswers}</span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">✗ {wrongAnswers}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {questionNumber} / {totalQuestions} ({progressPercent}%)
            </span>
          </div>
        </div>
      </header>

      {/* Main Question Card */}
      <main className="w-full max-w-4xl mx-auto p-4 md:p-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 md:p-8 shadow-sm space-y-6">
          
          {/* Question Header & Serie Tag */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wide">
              Pregunta {questionNumber} de {totalQuestions}
            </span>
            {question.serie && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Serie: {question.serie}
              </span>
            )}
          </div>

          {/* Question Text */}
          <h2 className="text-lg sm:text-xl md:text-[22px] font-semibold leading-relaxed text-slate-900">
            <MathText text={question.question} />
          </h2>

          {/* Image (if any) */}
          {question.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[280px] flex items-center justify-center p-2">
              <img
                src={question.imageUrl}
                alt="Imagen del reactivo"
                className="max-h-[260px] w-auto object-contain mx-auto rounded-lg"
              />
            </div>
          )}

          {/* Optional Hint */}
          {question.hint && !showFeedback && showHintSetting && (
            <div>
              <button
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Ocultar pista' : 'Ver pista'}</span>
              </button>
              {showHint && (
                <div className="mt-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <MathText text={question.hint} />
                </div>
              )}
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-3 pt-2">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                disabled={showFeedback}
                className={getOptionStyle(index)}
              >
                <div className="flex items-start gap-3.5 w-full">
                  {getLetterBadge(index)}
                  <div className="pt-0.5 flex-1 text-sm sm:text-base font-normal leading-snug">
                    <MathText text={option.text} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Single Clean Justification Box (When Answered) */}
          {showFeedback && (
            <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50/95 p-4 sm:p-5 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-xs text-emerald-900 uppercase tracking-wide">
                  Justificación
                </span>
              </div>
              <div className="text-sm sm:text-[15px] leading-relaxed text-emerald-950 font-normal">
                <MathText text={getJustificationText()} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Permanently Sticky / Fixed Bottom Navigation Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 text-sm h-11 px-4 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>Salir</span>
          </Button>

          <Button
            onClick={handleNext}
            disabled={!showFeedback && selectedAnswer === null}
            className={`h-11 px-6 sm:px-8 rounded-xl font-semibold text-white shadow-md transition-all duration-150 ${
              showFeedback
                ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300/40'
                : 'bg-slate-900 hover:bg-black'
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
