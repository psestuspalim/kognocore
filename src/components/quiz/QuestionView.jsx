import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, Bookmark, Clock } from 'lucide-react';
import { client } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';

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

    const baseStyle = "relative p-3.5 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 w-full text-left group shadow-sm hover:shadow-md";

    if (isCorrectlySelected) {
      return `${baseStyle} border-emerald-500 bg-emerald-50 text-emerald-900 shadow-emerald-200/50`;
    }
    if (isIncorrectlySelected) {
      return `${baseStyle} border-red-500 bg-red-50 text-red-900 shadow-red-200/50`;
    }
    if (isMissedCorrect) {
      return `${baseStyle} border-emerald-500/50 bg-emerald-50/30 text-emerald-900`;
    }
    if (isSelected && !isRevealed) {
      return `${baseStyle} border-sky-600 bg-sky-50 shadow-md ring-1 ring-sky-200`;
    }

    return `${baseStyle} border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 text-gray-700`;
  };

  const getRadioIcon = (index) => {
    const isSelected = selectedAnswer === index;
    const option = options[index];
    const isCorrect = option.isCorrect;
    const isRevealed = showFeedback;

    if (isRevealed) {
      if (option.isCorrect) {
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />;
      }
      if (isSelected && !isCorrect) {
        return <XCircle className="w-5 h-5 text-red-500 fill-red-100" />;
      }
    }

    return (
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-sky-600' : 'border-gray-300 group-hover:border-gray-400'
        }`}>
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-sky-600" />}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHint(!showHint)}
                    className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 gap-2 pl-0 h-auto py-1"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showHint ? 'Ocultar Pista' : 'Ver Pista'}
                  </Button>
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg shadow-sm"
                      >
                        <div className="text-amber-800 text-sm leading-relaxed">
                          <MathText text={question.hint} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* FEEDBACK */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 pt-6 border-t border-gray-100 space-y-4"
                  >
                    {/* Correct Answer Explanation Block */}
                    <div className="bg-emerald-50/80 rounded-lg p-4 border border-emerald-200/70 shadow-md">
                      <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Respuesta Correcta
                      </h3>
                      <div className="text-emerald-900/90 leading-relaxed text-sm">
                        <MathText text={question.answerOptions?.find(o => o.isCorrect)?.rationale || question.feedback || "Explicación correcta."} />
                      </div>
                    </div>

                    {/* If user was wrong, clarify their selection */}
                    {selectedOption && !selectedOption.isCorrect && (
                      <div className="bg-red-50/80 rounded-lg p-4 border border-red-200/70 shadow-md">
                        <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2 text-sm">
                          <XCircle className="w-4 h-4" /> Tu Selección
                        </h3>
                        <div className="text-red-900/90 leading-relaxed text-sm">
                          <MathText text={selectedOption.rationale || "Esta opción no es la más adecuada."} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
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

                <div className="space-y-3">
                  {options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(index)}
                      disabled={showFeedback}
                      className={getOptionStyle(index)}
                    >
                      {/* Radio Icon */}
                      <div className="flex-shrink-0 pt-0.5">
                        {getRadioIcon(index)}
                      </div>

                      {/* Text */}
                      <div className="flex-1 font-medium text-base text-left">
                        <MathText text={option.text} />
                      </div>
                    </button>
                  ))}
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

    </div>
  );
}