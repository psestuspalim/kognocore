import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react';
import { client } from '@/api/client';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';
import AIErrorFeedback from './AIErrorFeedback';
import { diagnoseError } from '@/services/mockAIService';

/**
 * @typedef {Object} QuestionViewProps
 * @property {any} question
 * @property {number} questionNumber
 * @property {number} totalQuestions
 * @property {number} [correctAnswers]
 * @property {number} [wrongAnswers]
 * @property {(isCorrect: boolean, selectedOption: any, question: any) => void} onAnswer
 * @property {() => void} [onBack]
 * @property {(question: any, isMarked: boolean) => void} [onMarkForReview]
 * @property {any[]} [previousAttempts]
 * @property {string} [quizId]
 * @property {string} [userEmail]
 * @property {Object} [settings]
 * @property {boolean} [settings.show_feedback]
 * @property {boolean} [settings.show_hint]
 * @property {boolean} [settings.enable_tutor]
 * @property {string} [quizTitle]
 * @property {string} [subjectId]
 * @property {string} [sessionId]
 * @property {boolean} [initialIsMarked]
 */

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
  const showFeedbackSetting = settings.show_feedback !== false;
  const showHintSetting = settings.show_hint !== false;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMarked, setIsMarked] = useState(initialIsMarked);
  const [answerStartTime, setAnswerStartTime] = useState(Date.now());
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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


  const handleSelectAnswer = async (index) => {
    if (showFeedback) return;

    const selected = options[index];
    setSelectedAnswer(index);
    setShowFeedback(true);

    if (!selected.isCorrect) {
      // Only run AI analysis if enabled in settings
      if (settings.enable_tutor) {
        setIsAnalyzing(true);
        try {
          const analysis = await diagnoseError(
            question.question,
            question.answerOptions?.find(o => o.isCorrect)?.rationale || "N/A",
            selected.text
          );
          setAiAnalysis(analysis);
        } catch (error) {
          console.error("Error analyzing answer:", error);
        } finally {
          setIsAnalyzing(false);
        }
      }
    }
  };

  const selectedOption = selectedAnswer !== null ? options[selectedAnswer] : null;

  const handleNext = () => {
    const isCorrect = selectedOption?.isCorrect;
    onAnswer(isCorrect, selectedOption, question);
  };

  const getOptionStyle = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option.isCorrect;

    // Logic for revealed state
    const isRevealed = showFeedback;
    const isCorrectlySelected = isRevealed && isSelected && isCorrect;
    const isIncorrectlySelected = isRevealed && isSelected && !isCorrect;
    const isMissedCorrect = isRevealed && !isSelected && isCorrect;

    const baseStyle = "relative p-3 md:p-3.5 rounded-xl border border-transparent flex flex-col w-full text-left group transition-all duration-150 ease-out";

    if (isCorrectlySelected) {
      return `${baseStyle} border-emerald-500 bg-emerald-100 shadow-sm`;
    }
    if (isIncorrectlySelected) {
      return `${baseStyle} border-rose-500 bg-rose-100 shadow-sm`;
    }
    if (isMissedCorrect) {
      return `${baseStyle} border-emerald-400 bg-emerald-50`;
    }
    if (isSelected && !isRevealed) {
      return `${baseStyle} border-indigo-600 bg-indigo-50 shadow-sm`;
    }

    return `${baseStyle} bg-white hover:-translate-y-[1px] hover:shadow-md text-slate-800`;
  };

  const getLetterPrefix = (index) => {
    const letters = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];
    return letters[index] || '';
  };

  const getLetterIcon = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option.isCorrect;
    const isRevealed = showFeedback;

    let textColor = "text-slate-500";

    if (isRevealed) {
      if (option.isCorrect) {
        textColor = "text-emerald-800";
      } else if (isSelected && !isCorrect) {
        textColor = "text-rose-800";
      }
    } else if (isSelected) {
      textColor = "text-blue-800";
    }

    return (
      <div className={`text-base font-medium mt-0.5 ${textColor}`}>
        {getLetterPrefix(index)}
      </div>
    );
  };

  // Calculate progress percentages
  const correctPercent = (correctAnswers / totalQuestions) * 100;
  const wrongPercent = (wrongAnswers / totalQuestions) * 100;

  return (
    <div className="h-[100dvh] bg-[linear-gradient(160deg,#edf2ff_0%,#f8fafc_45%,#e2e8f0_100%)] flex flex-col overflow-hidden font-sans">
      {/* Compact Centered Header */}
      <header className="bg-transparent flex-none z-20 py-2 px-3 md:px-4">
        <div className="px-3 py-2.5 relative rounded-xl border border-white/70 bg-white/80 backdrop-blur-sm shadow-sm">
          {/* Back Button - Vertically centered relative to entire header */}
          <button
            onClick={onBack}
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Top Row: Title */}
          <div className="flex items-center justify-center mb-2">
            {/* Quiz Title - Center */}
            <div className="text-center px-10">
              <h1 className="text-[clamp(20px,1.7vw,32px)] font-bold text-slate-900 leading-tight">
                {quizTitle || 'Quiz'}
              </h1>
              {subjectId && (
                <p className="text-xs text-slate-500 mt-0.5">{subjectId}</p>
              )}
            </div>
          </div>

          {/* Progress Bar Row - Divergent from Center */}
          <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
            {/* Wrong Count (Left) */}
            <span className="text-sm font-bold text-rose-700 w-6 text-right">
              {wrongAnswers}
            </span>

            {/* The Bar Container */}
            <div className="flex-1 h-3 rounded-full overflow-hidden flex bg-slate-200 relative">
              {/* Middle Marker (Optional, subtle) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white z-10" />

              {/* Left Side (Red/Wrong) - Flex End so it grows from right to left (visual center) */}
              <div className="flex-1 flex justify-end bg-slate-200">
                <div
                  className="bg-rose-600 h-full rounded-l-full shadow-[0_0_16px_rgba(225,29,72,0.35)]"
                  style={{ width: `${wrongPercent}%` }}
                />
              </div>

              {/* Right Side (Green/Correct) */}
              <div className="flex-1 flex justify-start bg-slate-200">
                <div
                  className="bg-emerald-600 h-full rounded-r-full shadow-[0_0_16px_rgba(5,150,105,0.35)]"
                  style={{ width: `${correctPercent}%` }}
                />
              </div>
            </div>

            {/* Correct Count (Right) */}
            <span className="text-sm font-bold text-emerald-700 w-6 text-left">
              {correctAnswers}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area - Flexible Scroll Container */}
      {/* Mobile: overflow-y-auto (global scroll) */}
      {/* Desktop: overflow-hidden (panels scroll individually) */}
      <div className="flex-1 w-full min-h-0 overflow-hidden relative z-10 p-3 md:p-4">
        <div className="h-full lg:grid lg:grid-cols-[1fr_1.08fr] gap-3">

          {/* LEFT COLUMN: Question Content & Analysis */}
          {/* Mobile: Block flow. Desktop: Scrollable Panel */}
          <div className="p-0 lg:h-full overflow-hidden flex flex-col">
            <div className="max-w-2xl mx-auto w-full h-full rounded-2xl border border-white/70 bg-white/90 shadow-sm p-5 md:p-6">

              {/* Question Number Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-900 text-indigo-50 uppercase tracking-[0.12em]">
                  Pregunta {questionNumber}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-[clamp(24px,2.2vw,40px)] font-semibold text-slate-900 leading-[1.15] mb-4">
                <MathText text={question.question} />
              </h2>

              {/* Image */}
              {question.imageUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={question.imageUrl}
                    alt="Pregunta"
                    className="w-full h-auto max-h-[220px] object-contain mx-auto"
                  />
                </div>
              )}

              {/* Hints */}
              {question.hint && !showFeedback && showHintSetting && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Mostrar pista
                    <ChevronRight className={`w-4 h-4 ${showHint ? 'rotate-[-90deg]' : 'rotate-90'}`} />
                  </button>
                  {showHint && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl">
                      <div className="flex gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-amber-900 text-[15px] leading-relaxed">
                          <MathText text={question.hint} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Analysis Feedback Only */}
              <AIErrorFeedback isLoading={isAnalyzing} analysis={aiAnalysis} />
            </div>
          </div>

          {/* RIGHT COLUMN: Options */}
          {/* Mobile: Block flow (below left col). Desktop: Scrollable Panel (Right side) */}
          <div className="flex flex-col lg:h-full overflow-hidden">
            <div className="h-full flex flex-col min-h-0">
              <div className="max-w-2xl mx-auto w-full h-full rounded-2xl border border-white/70 bg-slate-100/80 backdrop-blur-sm shadow-sm p-4 md:p-5">

                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.12em] text-slate-600 uppercase">Opciones</span>
                </div>

                <div className="space-y-2">
                  {options.map((option, index) => {
                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(index)}
                        disabled={showFeedback}
                        className={getOptionStyle(index)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          {/* Letter Prefix instead of Radio */}
                          <div className="flex-shrink-0 pt-0.5 w-[24px]">
                            {getLetterIcon(index)}
                          </div>

                          {/* Text Header */}
                          <div className="flex-1 font-medium text-[clamp(17px,1.15vw,24px)] text-slate-800 leading-tight mt-[1px]">
                            <MathText text={option.text} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Unified feedback panel (keeps option cards compact and visible) */}
                <div className="mt-3 min-h-[112px]">
                  {showFeedback && selectedOption && (
                    <div className={`rounded-xl border p-3 ${selectedOption.isCorrect ? 'border-emerald-600 bg-emerald-100' : 'border-rose-600 bg-rose-100'}`}>
                      <div className="flex items-center gap-2 mb-1.5 w-full">
                        {selectedOption.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="font-bold text-[12px] text-emerald-900 tracking-wide uppercase">Respuesta correcta</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                            <span className="font-bold text-[12px] text-rose-900 tracking-wide uppercase">No exactamente</span>
                          </>
                        )}
                      </div>
                      <div className={`text-[14px] leading-snug ${selectedOption.isCorrect ? 'text-emerald-950' : 'text-rose-950'}`}>
                        <MathText text={selectedOption.rationale || (selectedOption.isCorrect ? (question.feedback || "Explicación correcta.") : "Esta opción no es la más adecuada.")} />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Navigation - Global Sticky/Fixed at Bottom */}
      <div className="flex-none bg-transparent relative z-[80] w-full pointer-events-auto px-3 md:px-4 pb-3">
        <div className="p-3 md:px-6 lg:px-8 rounded-xl border border-white/70 bg-white/85 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => { /* Handle Previous if needed */ }}
              disabled={questionNumber <= 1}
              className="text-slate-600 hover:text-slate-900 h-10 px-4 relative z-[81] pointer-events-auto touch-manipulation rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <Button
              onClick={handleNext}
              disabled={!showFeedback && selectedAnswer === null}
              className={`h-11 min-w-[210px] w-full sm:w-auto rounded-lg font-semibold text-white shadow-md relative z-[81] pointer-events-auto touch-manipulation transition-all duration-150 ${showFeedback ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300/40' : 'bg-slate-900 hover:bg-black hover:shadow-slate-400/40'
                }`}
            >
              <span>{questionNumber === totalQuestions ? 'Finalizar' : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

    </div >
  );
}
