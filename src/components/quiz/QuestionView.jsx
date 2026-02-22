import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react';
import { client } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
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

    const baseStyle = "relative p-4 rounded-xl border transition-all duration-200 flex flex-col w-full text-left group";

    // Contenedor interno para la flexbox de layout
    const contentInner = "flex items-start gap-4 w-full";

    if (isCorrectlySelected) {
      return `${baseStyle} border-emerald-200 bg-[#e6f4ea]`; // Pastel green from screenshot
    }
    if (isIncorrectlySelected) {
      return `${baseStyle} border-rose-100 bg-[#fff0f0]`; // Pastel red from screenshot
    }
    if (isMissedCorrect) {
      return `${baseStyle} border-emerald-200 bg-[#e6f4ea]`; // Highlight missed correct answer too
    }
    if (isSelected && !isRevealed) {
      return `${baseStyle} border-indigo-200 bg-indigo-50 shadow-sm`;
    }

    return `${baseStyle} border-gray-100 bg-[#f8f9fa] hover:border-gray-200 hover:bg-gray-100 text-gray-700`;
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

    let textColor = "text-gray-500 group-hover:text-gray-700";

    if (isRevealed) {
      if (option.isCorrect) {
        textColor = "text-emerald-700";
      } else if (isSelected && !isCorrect) {
        textColor = "text-rose-700";
      }
    } else if (isSelected) {
      textColor = "text-indigo-700";
    }

    return (
      <div className={`text-base font-medium mt-0.5 ${textColor}`}>
        {getLetterPrefix(index)}
      </div>
    );
  };

  // Calculate progress percentages
  const totalAnswered = correctAnswers + wrongAnswers;
  const correctPercent = (correctAnswers / totalQuestions) * 100;
  const wrongPercent = (wrongAnswers / totalQuestions) * 100;

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden font-sans">
      {/* Compact Centered Header */}
      <header className="bg-white border-b border-gray-200 flex-none z-20 shadow-sm py-4">
        <div className="px-4 relative">
          {/* Back Button - Vertically centered relative to entire header */}
          <button
            onClick={onBack}
            className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Top Row: Title */}
          <div className="flex items-center justify-center mb-3">
            {/* Quiz Title - Center */}
            <div className="text-center px-10">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">
                {quizTitle || 'Quiz'}
              </h1>
              {subjectId && (
                <p className="text-xs text-gray-400 mt-0.5">{subjectId}</p>
              )}
            </div>
          </div>

          {/* Progress Bar Row - Divergent from Center */}
          <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
            {/* Wrong Count (Left) */}
            <span className="text-sm font-bold text-rose-600 w-6 text-right">
              {wrongAnswers}
            </span>

            {/* The Bar Container */}
            <div className="flex-1 h-3 rounded-full overflow-hidden flex bg-gray-100 relative">
              {/* Middle Marker (Optional, subtle) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50 z-10" />

              {/* Left Side (Red/Wrong) - Flex End so it grows from right to left (visual center) */}
              <div className="flex-1 flex justify-end bg-gray-100">
                <div
                  className="bg-rose-500 transition-all duration-500 ease-out h-full rounded-l-full"
                  style={{ width: `${wrongPercent}%` }}
                />
              </div>

              {/* Right Side (Green/Correct) */}
              <div className="flex-1 flex justify-start bg-gray-100">
                <div
                  className="bg-emerald-500 transition-all duration-500 ease-out h-full rounded-r-full"
                  style={{ width: `${correctPercent}%` }}
                />
              </div>
            </div>

            {/* Correct Count (Right) */}
            <span className="text-sm font-bold text-emerald-600 w-6 text-left">
              {correctAnswers}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area - Flexible Scroll Container */}
      {/* Mobile: overflow-y-auto (global scroll) */}
      {/* Desktop: overflow-hidden (panels scroll individually) */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto lg:overflow-hidden">
        <div className="h-full lg:grid lg:grid-cols-2">

          {/* LEFT COLUMN: Question Content & Analysis */}
          {/* Mobile: Block flow. Desktop: Scrollable Panel */}
          <div className="bg-white p-5 md:p-6 lg:p-7 border-r border-gray-200 lg:h-full lg:overflow-y-auto scrollbar-hide flex flex-col lg:justify-center">
            <div className="max-w-xl mx-auto w-full">

              {/* Question Number Badge */}
              <div className="mb-5">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 uppercase tracking-wider shadow-sm border border-slate-200">
                  Pregunta {questionNumber}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-lg font-medium text-gray-900 leading-relaxed mb-5 font-serif">
                <MathText text={question.question} />
              </h2>

              {/* Image */}
              {question.imageUrl && (
                <div className="mb-6 rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                  <img
                    src={question.imageUrl}
                    alt="Pregunta"
                    className="w-full h-auto max-h-[300px] object-contain mx-auto"
                  />
                </div>
              )}

              {/* Hints */}
              {question.hint && !showFeedback && showHintSetting && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Mostrar pista
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showHint ? 'rotate-[-90deg]' : 'rotate-90'}`} />
                  </button>
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-[#f8f9fa] border border-gray-100 rounded-xl"
                      >
                        <div className="flex gap-3">
                          <Lightbulb className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                          <div className="text-gray-600 text-[15px] leading-relaxed">
                            <MathText text={question.hint} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* AI Analysis Feedback Only */}
              <AnimatePresence>
                {/* AI Analysis Feedback */}
                <AIErrorFeedback isLoading={isAnalyzing} analysis={aiAnalysis} />
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT COLUMN: Options */}
          {/* Mobile: Block flow (below left col). Desktop: Scrollable Panel (Right side) */}
          <div className="bg-gray-50/50 flex flex-col border-l border-white lg:h-full lg:overflow-y-auto scrollbar-hide lg:justify-center">
            <div className="p-5 md:p-6 lg:p-7">
              <div className="max-w-lg mx-auto w-full">

                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Opciones</span>
                </div>

                <div className="space-y-4">
                  {options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isRevealed = showFeedback;
                    const isCorrect = option.isCorrect;

                    const isCorrectRevealed = isRevealed && isCorrect;
                    const isIncorrectSelected = isRevealed && isSelected && !isCorrect;

                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(index)}
                        disabled={showFeedback}
                        className={getOptionStyle(index)}
                      >
                        <div className="flex items-start gap-4 w-full">
                          {/* Letter Prefix instead of Radio */}
                          <div className="flex-shrink-0 pt-0.5 w-[24px]">
                            {getLetterIcon(index)}
                          </div>

                          {/* Text Header */}
                          <div className="flex-1 font-medium text-[15px] text-gray-800 mt-[3px]">
                            <MathText text={option.text} />

                            {/* Inline Feedback Rendering (matches screenshot) */}
                            {isRevealed && (isCorrectRevealed || isIncorrectSelected) && (
                              <div className="mt-4 flex flex-col items-start min-w-0 pointer-events-none">
                                <div className="flex items-center gap-2 mb-2 w-full">
                                  {isCorrectRevealed ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span className="font-bold text-[13px] text-emerald-800 tracking-wide uppercase">Respuesta correcta</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                      <span className="font-bold text-[13px] text-rose-800 tracking-wide uppercase">No exactamente</span>
                                    </>
                                  )}
                                </div>

                                <div className={`text-[15px] ${isCorrectRevealed ? 'text-emerald-900' : 'text-rose-900'} leading-relaxed font-normal`}>
                                  <MathText text={option.rationale || (isCorrectRevealed ? (question.feedback || "Explicación correcta.") : "Esta opción no es la más adecuada.")} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add Spacer for mobile scroll to avoid hitting bottom directly */}
                <div className="h-4 lg:hidden"></div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Navigation - Global Sticky/Fixed at Bottom */}
      <div className="flex-none bg-white border-t border-gray-200 z-30 w-full">
        <div className="p-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => { /* Handle Previous if needed */ }}
              disabled={questionNumber <= 1}
              className="text-gray-500 hover:text-gray-900 h-10 px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <Button
              onClick={handleNext}
              disabled={!showFeedback && selectedAnswer === null}
              className={`px-6 h-10 rounded-lg font-semibold text-white shadow-md transition-all ${showFeedback ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-900 hover:bg-gray-800'
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