import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Home, RotateCcw, TrendingUp, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';

export default function ResultsView({ 
  score, 
  totalQuestions, 
  wrongAnswers = [],
  correctAnswers = [],
  answeredQuestions = 0,
  isPartial = false,
  onRetry, 
  onRetryWrong,
  onHome 
}) {
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);

  // Calcular estadísticas por dificultad
  const difficultyStats = (() => {
    const stats = {
      fácil: { correct: 0, total: 0 },
      moderado: { correct: 0, total: 0 },
      difícil: { correct: 0, total: 0 }
    };
    
    correctAnswers.forEach(q => {
      const diff = q.difficulty || 'moderado';
      if (stats[diff]) {
        stats[diff].correct++;
        stats[diff].total++;
      }
    });
    
    wrongAnswers.forEach(q => {
      const diff = q.difficulty || 'moderado';
      if (stats[diff]) {
        stats[diff].total++;
      }
    });
    
    return stats;
  })();
  
  const answeredCount = answeredQuestions || (score + wrongAnswers.length);
  const remainingQuestions = totalQuestions - answeredCount;
  const percentage = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;
  
  const getGrade = () => {
    if (percentage >= 90) return { text: '¡Excelente!', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage >= 70) return { text: 'Muy bien', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 50) return { text: 'Bien', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Necesitas practicar', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const grade = getGrade();

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className={`bg-gradient-to-br ${isPartial ? 'from-orange-500 to-orange-700' : 'from-indigo-500 to-indigo-700'} p-8 text-white`}>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                {isPartial ? <AlertCircle className="w-10 h-10" /> : <Trophy className="w-10 h-10" />}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-2">
              {isPartial ? 'Cuestionario parcial' : 'Cuestionario completado'}
            </h2>
            <p className="text-center text-indigo-100">
              {isPartial ? `Respondiste ${answeredCount} de ${totalQuestions} preguntas` : 'Has terminado todas las preguntas'}
            </p>
          </div>

          <CardContent className="p-8">
            {/* Score Circle */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#4f46e5"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 552' }}
                    animate={{ strokeDasharray: `${(percentage / 100) * 552} 552` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-gray-900">
                    {percentage}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {score}/{totalQuestions}
                  </div>
                </div>
              </div>
            </div>

            {/* Grade Badge */}
            <div className="flex justify-center mb-8">
              <div className={`${grade.bg} px-6 py-3 rounded-full`}>
                <span className={`${grade.color} font-semibold text-lg`}>
                  {grade.text}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className={`grid ${isPartial ? 'grid-cols-4' : 'grid-cols-3'} gap-4 mb-8`}>
              <Button
                variant="outline"
                onClick={() => setShowCorrect(!showCorrect)}
                className="h-auto flex-col p-4 hover:bg-green-50"
              >
                <div className="text-2xl font-bold text-green-600">{score}</div>
                <div className="text-xs text-gray-500 mt-1">Correctas</div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowWrong(!showWrong)}
                className="h-auto flex-col p-4 hover:bg-red-50"
              >
                <div className="text-2xl font-bold text-red-600">
                  {wrongAnswers.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Incorrectas</div>
              </Button>
              
              {isPartial && (
                <Card className="bg-gray-50 border-0">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {remainingQuestions}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Faltantes</div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {totalQuestions}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Total</div>
                </CardContent>
              </Card>
            </div>

            {/* Correct Answers Expandable */}
            <AnimatePresence>
              {showCorrect && correctAnswers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 max-h-96 overflow-y-auto"
                >
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Preguntas correctas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {correctAnswers.map((q, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 text-sm">
                          <p className="font-medium text-gray-900 mb-2">
                            <MathText text={q.question} />
                          </p>
                          <p className="text-green-700">
                            ✓ Tu respuesta: <MathText text={q.selected_answer} />
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wrong Answers Expandable */}
            <AnimatePresence>
              {showWrong && wrongAnswers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 max-h-96 overflow-y-auto"
                >
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-red-800 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Preguntas incorrectas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {wrongAnswers.map((wq, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 text-sm">
                          <p className="font-medium text-gray-900 mb-2">
                            <MathText text={wq.question} />
                          </p>
                          <div className="space-y-1">
                            <p className="text-red-700">
                              ❌ Tu respuesta: <MathText text={wq.selected_answer} />
                            </p>
                            <p className="text-green-700">
                              ✓ Correcta: <MathText text={wq.correct_answer} />
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Difficulty Stats */}
            {(difficultyStats.fácil.total > 0 || difficultyStats.moderado.total > 0 || difficultyStats.difícil.total > 0) && (
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDifficulty(!showDifficulty)}
                  className="w-full mb-3"
                >
                  📊 {showDifficulty ? 'Ocultar' : 'Ver'} estadísticas por dificultad
                </Button>
                
                <AnimatePresence>
                  {showDifficulty && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Card className="bg-purple-50 border-purple-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-purple-800">
                            Rendimiento por dificultad
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Fácil */}
                          {difficultyStats.fácil.total > 0 && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-green-700">🟢 Fácil</span>
                                <span className="text-sm text-gray-600">
                                  {difficultyStats.fácil.correct}/{difficultyStats.fácil.total} ({Math.round((difficultyStats.fácil.correct / difficultyStats.fácil.total) * 100)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 transition-all duration-500"
                                  style={{ width: `${(difficultyStats.fácil.correct / difficultyStats.fácil.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Moderado */}
                          {difficultyStats.moderado.total > 0 && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-yellow-700">🟡 Moderado</span>
                                <span className="text-sm text-gray-600">
                                  {difficultyStats.moderado.correct}/{difficultyStats.moderado.total} ({Math.round((difficultyStats.moderado.correct / difficultyStats.moderado.total) * 100)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-500 transition-all duration-500"
                                  style={{ width: `${(difficultyStats.moderado.correct / difficultyStats.moderado.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Difícil */}
                          {difficultyStats.difícil.total > 0 && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-red-700">🔴 Difícil</span>
                                <span className="text-sm text-gray-600">
                                  {difficultyStats.difícil.correct}/{difficultyStats.difícil.total} ({Math.round((difficultyStats.difícil.correct / difficultyStats.difícil.total) * 100)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-red-500 transition-all duration-500"
                                  style={{ width: `${(difficultyStats.difícil.correct / difficultyStats.difícil.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onRetry}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Intentar de nuevo
              </Button>

              {wrongAnswers.length > 0 && (
                <Button
                  onClick={onRetryWrong}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Repasar preguntas incorrectas
                </Button>
              )}

              <Button
                onClick={onHome}
                variant="outline"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}