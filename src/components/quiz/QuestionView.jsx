import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, Bookmark, ChevronDown } from 'lucide-react';
import { client } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';
import ImageQuestionView from './ImageQuestionView';
import ErrorAnalysis from './ErrorAnalysis';


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
 * @property {boolean} [settings.show_reflection]
 * @property {boolean} [settings.show_error_analysis]
 * @property {boolean} [settings.show_schema]
 * @property {boolean} [settings.show_notes]
 * @property {boolean} [settings.show_hint]
 * @property {string} [quizTitle]
 * @property {string} [subjectId]
 * @property {string} [sessionId]
 */

/**
 * @param {QuestionViewProps} props
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
  sessionId = null
}) {
  // Configuraciones con valores por defecto
  const showFeedbackSetting = settings.show_feedback !== false;
  const showReflection = settings.show_reflection !== false;
  const showErrorAnalysis = settings.show_error_analysis !== false;
  const showSchema = settings.show_schema !== false;
  const showNotes = settings.show_notes !== false;
  const showHintSetting = settings.show_hint !== false;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  // removed rephrasing state
  // removed loadingEtymology state
  // removed etymology state and logic
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schema, setSchema] = useState(null);
  const [showNotesField, setShowNotesField] = useState(false);
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

  // handleRephrase removed

  // handleEtymology removed

  const handleGenerateSchema = async () => {
    setLoadingSchema(true);
    try {
      const result = await client.integrations.Core.InvokeLLM({
        prompt: `Genera una representación gráfica esquemática usando emojis y texto del proceso o concepto al que se refiere esta pregunta. Usa flechas (→, ↓), viñetas, y emojis relevantes para crear un diagrama visual de texto que ayude al estudiante a entender el proceso.

Pregunta: "${question.question}"
Respuesta correcta: "${question.answerOptions?.find(opt => opt.isCorrect)?.text || ''}"

Crea un esquema visual claro y educativo en español. Usa saltos de línea para organizar la información.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título breve del proceso/concepto" },
            schema: { type: "string", description: "El esquema visual con emojis y flechas" },
            summary: { type: "string", description: "Resumen de una línea del concepto clave" }
          }
        }
      });
      setSchema(result);
    } catch (error) {
      console.error('Error generating schema:', error);
    } finally {
      setLoadingSchema(false);
    }
  };

  // Normalize options
  const options = question.answerOptions || question.options || [];

  // Si es pregunta de imagen (sin answerOptions), usar el componente especializado
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

  const responseTime = showFeedback ? Math.round((Date.now() - answerStartTime) / 1000) : null;

  const selectedOption = selectedAnswer !== null ? options[selectedAnswer] : null;

  const handleNext = () => {
    const isCorrect = selectedOption.isCorrect;
    onAnswer(isCorrect, selectedOption, question);
    setUserNote('');
    setReflectionText('');
  };

  const canProceed = selectedOption?.isCorrect || !showReflection || reflectionText.trim().length >= 10;
  const answeredQuestions = correctAnswers + wrongAnswers;
  const progressPercent = (questionNumber / totalQuestions) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-0 pb-10">
      {/* Header Styled as Card */}
      <Card className="mb-4 border-gray-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3 sm:gap-6">

            {/* Left: Incorrect Counter */}
            <div className="flex items-center gap-1.5 min-w-[3.5rem] justify-end">
              <span className="text-sm font-bold text-red-600 tabular-nums">{wrongAnswers}</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>

            {/* Center: Progress Bar */}
            <div className="flex-1 flex flex-col items-center gap-1 max-w-sm">
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Right: Correct Counter */}
            <div className="flex items-center gap-1.5 min-w-[3.5rem]">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold text-green-600 tabular-nums">{correctAnswers}</span>
            </div>

            {/* End: Bookmark & Count */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-100 ml-auto">
              <span className="text-xs font-medium text-gray-400">
                {questionNumber}/{totalQuestions}
              </span>
              {onMarkForReview && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsMarked(!isMarked);
                    onMarkForReview(question, !isMarked);
                  }}
                  className={`h-7 w-7 text-gray-300 hover:text-indigo-600 hover:bg-transparent ${isMarked ? 'text-yellow-500 hover:text-yellow-600' : ''}`}
                >
                  <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-yellow-500' : ''}`} />
                </Button>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Main Question Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex gap-4">
          {/* Question Number */}
          <div className="shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md shadow-indigo-200">
              {questionNumber}
            </div>
          </div>

          {/* Question and Media */}
          <div className="flex-1 pt-0.5 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-3">
              <MathText text={question.question} />
            </h2>

            {question.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={question.imageUrl}
                  alt="Pregunta"
                  className="w-full h-auto max-h-[200px] object-contain mx-auto"
                />
              </div>
            )}

            {/* Inline Helpers - Minimal */}
            <div className="flex flex-wrap gap-2">
              {/* Etymology removed as requested */}

              {question.hint && !showFeedback && showHintSetting && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50"
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Pista
                </Button>
              )}
            </div>
            {/* Dynamic Helper Content */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 text-sm"
                >
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                    <span className="font-medium text-amber-800">💡 Pista: </span>
                    <span className="text-amber-900"><MathText text={question.hint} /></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Options Stack */}
      <div className="space-y-2.5">
        <AnimatePresence mode='popLayout'>
          {options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = option.isCorrect;

            const isRevealed = showFeedback;
            const isCorrectlySelected = isRevealed && isSelected && isCorrect;
            const isIncorrectlySelected = isRevealed && isSelected && !isCorrect;

            let cardStyle = "bg-white border-gray-300 shadow-sm hover:border-gray-400 hover:shadow-md";
            let letterStyle = "bg-gray-50 border-gray-300 text-gray-500 font-semibold";

            if (isRevealed) {
              if (isCorrect) {
                cardStyle = "bg-green-50 border-green-500 ring-1 ring-green-500 shadow-sm";
                letterStyle = "bg-green-100 border-green-500 text-green-700";
              } else if (isIncorrectlySelected) {
                cardStyle = "bg-red-50 border-red-500 ring-1 ring-red-500 shadow-sm";
                letterStyle = "bg-red-50 border-red-500 text-red-700";
              } else {
                cardStyle = "bg-white border-gray-200 opacity-50";
              }
            } else if (isSelected) {
              cardStyle = "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-md";
              letterStyle = "bg-indigo-100 border-indigo-500 text-indigo-700";
            }

            return (
              <motion.div
                layout
                key={index}
                initial={false}
                animate={{
                  scale: isSelected && !isRevealed ? 1.02 : 1, // Subtle scale up when selected
                  backgroundColor: isRevealed
                    ? (isCorrect ? '#f0fdf4' : (isIncorrectlySelected ? '#fef2f2' : '#ffffff'))
                    : (isSelected ? '#eef2ff' : '#ffffff'),
                  borderColor: isRevealed
                    ? (isCorrect ? '#22c55e' : (isIncorrectlySelected ? '#ef4444' : '#e5e7eb'))
                    : (isSelected ? '#6366f1' : '#e5e7eb'),
                  opacity: isRevealed && !isCorrect && !isIncorrectlySelected ? 0.6 : 1
                }}
                transition={{
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                  backgroundColor: { duration: 0.3 },
                  borderColor: { duration: 0.3 },
                  scale: { duration: 0.2 }
                }}
                className={`
                relative rounded-xl border p-3 cursor-pointer overflow-hidden
                ${isRevealed && (isCorrect || isIncorrectlySelected) ? 'shadow-sm' : isSelected ? 'shadow-md' : 'shadow-sm hover:shadow-md hover:border-gray-300'}
              `}
                onClick={() => !showFeedback && handleSelectAnswer(index)}
              >
                <div className="flex items-start gap-3.5">
                  <motion.div
                    layout="position"
                    className={`
                   w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-xs transition-colors mt-0.5
                   ${letterStyle}
                `}>
                    {isRevealed && isCorrect ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isRevealed && isIncorrectlySelected ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className={`text-base ${isRevealed && isCorrect ? 'font-medium text-green-900' : isRevealed && isIncorrectlySelected ? 'text-red-900' : 'text-gray-900'}`}>
                      <MathText text={option.text} />
                    </div>

                    <AnimatePresence>
                      {isRevealed && (isCorrect || isIncorrectlySelected) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }} // Smooth easeOutQuart-ish
                          className="pt-2 border-t border-black/5 overflow-hidden"
                        >
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            )}

                            <div>
                              <p className={`font-bold text-xs ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                {isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta'}
                              </p>

                              {isCorrect && option.rationale && (
                                <p className="text-xs text-green-800 mt-1 leading-relaxed">
                                  {option.rationale}
                                </p>
                              )}
                              {!isCorrect && (
                                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                                  {question.feedback || option.rationale || "Respuesta incorrecta."}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer / Next Button */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            {/* Error Reflection if needed */}
            {!selectedOption?.isCorrect && showReflection && (
              <div className="mb-4 bg-amber-50 rounded-xl p-4 border border-amber-200">
                <label className="text-amber-900 font-medium text-sm block mb-2">
                  ¿Por qué crees que fue un error? (Para reforzar tu memoria)
                </label>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  className="w-full rounded-lg border-amber-300 bg-white p-3 text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="Escribe brevemente tu razonamiento..."
                  rows={2}
                />
              </div>
            )}

            <Button
              size="lg"
              onClick={handleNext}
              disabled={(!selectedOption?.isCorrect && showReflection && reflectionText.length < 5)}
              className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl"
            >
              Siguiente
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Removed old feedback block */}
    </div>
  );
}