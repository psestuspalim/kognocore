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
  const correctOption = options.find(o => o.isCorrect) || null;
  const incorrectOption = selectedOption && !selectedOption.isCorrect
    ? selectedOption
    : (options.find(o => !o.isCorrect) || null);

  const getCorrectFeedback = () => {
    if (!correctOption) return question.feedback || "Explicación correcta.";
    return correctOption.rationale || question.feedback || "Explicación correcta.";
  };

  const getIncorrectFeedback = () => {
    if (!incorrectOption) return null;
    return incorrectOption.rationale || "Esta opción no es la más adecuada.";
  };

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

  const answeredCount = correctAnswers + wrongAnswers;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="h-[100dvh] bg-[linear-gradient(165deg,#f4f7fb_0%,#eef3f9_52%,#e8eef6_100%)] flex flex-col overflow-hidden font-sans">
      <header className="flex-none z-20 px-3 pt-3 md:px-4">
        <div className="relative rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-3 shadow-sm backdrop-blur-sm">
          <button
            onClick={onBack}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="mx-auto flex max-w-4xl flex-col gap-2 px-10">
            <div className="text-center">
              <h1 className="text-[clamp(20px,1.6vw,30px)] font-bold leading-tight text-slate-900">
                {quizTitle || 'Quiz'}
              </h1>
              {subjectId && (
                <p className="mt-0.5 text-xs text-slate-500">{subjectId}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">{progressPercent}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Pregunta {questionNumber} de {totalQuestions}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-emerald-700">Aciertos: {correctAnswers}</span>
                <span className="font-semibold text-rose-700">Errores: {wrongAnswers}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Flexible Scroll Container */}
      {/* Mobile: overflow-y-auto (global scroll) */}
      {/* Desktop: overflow-hidden (panels scroll individually) */}
      <div className="relative z-10 flex-1 min-h-0 w-full overflow-hidden p-3 md:p-4">
        <div className="h-full gap-3 lg:grid lg:grid-cols-[1fr_1.06fr]">

          {/* LEFT COLUMN: Question Content & Analysis */}
          {/* Mobile: Block flow. Desktop: Scrollable Panel */}
          <div className="p-0 lg:h-full overflow-hidden flex flex-col">
            <div className="mx-auto h-full w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:p-6">

              {/* Question Number Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-900 text-indigo-50 uppercase tracking-[0.12em]">
                  Pregunta {questionNumber}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="mb-4 text-[clamp(23px,2vw,34px)] font-semibold leading-[1.2] text-slate-900">
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
              <div className="mx-auto h-full w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:p-5">

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
                          <div className="mt-[1px] flex-1 text-[clamp(16px,1.05vw,20px)] font-medium leading-snug text-slate-800">
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
                    <div className="space-y-2">
                      <div className="rounded-xl border border-emerald-600 bg-emerald-100 p-3">
                        <div className="flex items-center gap-2 mb-1.5 w-full">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-bold text-[12px] text-emerald-900 tracking-wide uppercase">Respuesta correcta</span>
                        </div>
                        <div className="text-[14px] leading-snug text-emerald-950">
                          <MathText text={getCorrectFeedback()} />
                        </div>
                      </div>

                      {getIncorrectFeedback() && (
                        <div className="rounded-xl border border-rose-600 bg-rose-100 p-3">
                          <div className="flex items-center gap-2 mb-1.5 w-full">
                            <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                            <span className="font-bold text-[12px] text-rose-900 tracking-wide uppercase">
                              {selectedOption.isCorrect ? 'Distractor a evitar' : 'Tu opción incorrecta'}
                            </span>
                          </div>
                          <div className="text-[14px] leading-snug text-rose-950">
                            <MathText text={getIncorrectFeedback()} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Navigation - Global Sticky/Fixed at Bottom */}
      <div className="relative z-[80] w-full flex-none bg-transparent px-3 pb-3 pointer-events-auto md:px-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm md:px-6 lg:px-8">
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
