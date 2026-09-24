import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motorAnatomia } from '@/lib/normalizador';
import { normalizeQuizQuestion } from '@/lib/quiz-normalization';
import { cleanQuizDisplayText } from '@/lib/quiz-display-text';
import MathText from './MathText';
import OpenEndedAnswerComparison from './OpenEndedAnswerComparison';
import {
  CheckCircle2, XCircle, AlertCircle, Sparkles,
  BookOpen, ArrowRight, CornerDownLeft, ChevronLeft, Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OpenEndedQuestionView({
  question: rawQuestion,
  questionNumber,
  totalQuestions,
  correctAnswers = 0,
  wrongAnswers = 0,
  onAnswer,
  onNext,
  showFeedback: externalShowFeedback = false,
  savedAnswer = null,
  onBack,
  onMarkForReview,
  initialIsMarked = false
}) {
  const question = useMemo(() => normalizeQuizQuestion(rawQuestion), [rawQuestion]);
  const [userInputs, setUserInputs] = useState({});
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isMarked, setIsMarked] = useState(initialIsMarked);

  useEffect(() => {
    setIsMarked(initialIsMarked);
  }, [initialIsMarked, questionNumber]);

  const handleToggleMark = () => {
    const nextState = !isMarked;
    setIsMarked(nextState);
    if (onMarkForReview) {
      onMarkForReview(question, nextState);
    }
  };

  const tipo = useMemo(() => {
    return String(question?.tipo || question?.type || 'respuesta_corta').toLowerCase();
  }, [question]);

  // Restore or reset inputs when question changes
  useEffect(() => {
    setSubmitted(false);
    setResult(null);

    if (savedAnswer) {
      setUserInputs(savedAnswer.inputs || {});
      if (savedAnswer.result) {
        setResult(savedAnswer.result);
        setSubmitted(true);
      }
    } else {
      if (tipo === 'cloze') {
        const blancos = question?.blancos || question?.respuesta?.blancos || {};
        const init = {};
        Object.keys(blancos).forEach((k) => { init[k] = ''; });
        setUserInputs(init);
      } else if (tipo === 'relacion') {
        const pares = question?.respuesta?.pares || [];
        const init = {};
        pares.forEach((p) => { init[p.clave] = ''; });
        setUserInputs(init);
      } else if (tipo === 'enumeracion' || tipo === 'secuencia') {
        const count = question?.respuesta?.elementos?.length || question?.respuesta?.pasos?.length || 3;
        const init = {};
        for (let i = 0; i < count; i++) { init[i] = ''; }
        setUserInputs(init);
      } else {
        setUserInputs({ text: '' });
      }
    }
  }, [question, questionNumber, savedAnswer, tipo]);

  const shuffleArray = useCallback((arr) => {
    const list = [...arr];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, []);

  // Candidate dropdown options for 'relacion' questions
  const candidateOptions = useMemo(() => {
    if (tipo !== 'relacion') return [];
    const pares = question?.respuesta?.pares || [];
    const canons = pares.map(p => p.canonico);
    return shuffleArray(canons);
  }, [question, tipo, shuffleArray]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;

    let payload;
    if (tipo === 'cloze' || tipo === 'relacion') {
      payload = userInputs;
    } else if (tipo === 'enumeracion' || tipo === 'secuencia') {
      payload = Object.values(userInputs);
    } else {
      payload = userInputs.text || '';
    }

    try {
      const evalResult = motorAnatomia.calificar(question, payload);
      setResult(evalResult);
      setSubmitted(true);

      const isCorrect = Boolean(evalResult.correcto);
      if (onAnswer) {
        onAnswer(isCorrect, {
          selected_answer: JSON.stringify(payload),
          score: evalResult.puntos,
          max_score: evalResult.max,
          result: evalResult,
          inputs: userInputs
        }, question);
      }
    } catch (err) {
      console.error('Error al calificar pregunta abierta:', err);
    }
  }, [submitted, tipo, userInputs, question, onAnswer]);

  const promptText = cleanQuizDisplayText(question?.prompt || question?.question || question?.enunciado || question?.texto || '');
  const headingText = tipo === 'cloze' && /\{\{c\d+\}\}|\[c\d+\]/i.test(promptText)
    ? 'Completa los espacios en blanco'
    : promptText;

  // Render text for 'cloze' questions with embedded input fields
  const renderClozeText = () => {
    const rawText = cleanQuizDisplayText(question?.texto || promptText);
    const parts = rawText.split(/(\{\{c\d+\}\})/g);

    return (
      <div className="leading-relaxed text-base sm:text-lg text-slate-800 my-4 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-inner break-words">
        {parts.map((part, idx) => {
          const match = part.match(/^\{\{(c\d+)\}\}$/);
          if (!match) {
            return <span key={idx}>{part}</span>;
          }
          const blankKey = match[1];
          const blankInfo = question?.blancos?.[blankKey] || question?.respuesta?.blancos?.[blankKey];
          const val = userInputs[blankKey] || '';

          const itemDet = result?.detalle?.find(d => d.blanco === blankKey);
          const isBlankOk = itemDet?.ok;

          return (
            <span key={idx} className="inline-block mx-1 my-1">
              <input
                type="text"
                disabled={submitted}
                value={val}
                onChange={(e) => setUserInputs(prev => ({ ...prev, [blankKey]: e.target.value }))}
                aria-label={`Espacio ${blankKey.slice(1)} para completar`}
                className={`px-3 py-1 text-sm sm:text-base font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 ${
                  submitted
                    ? isBlankOk
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold'
                      : 'bg-rose-50 text-rose-800 border-rose-400 font-semibold'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-200'
                }`}
                style={{ minWidth: '80px', width: `${Math.max(val.length + 3, 10)}ch`, maxWidth: '100%' }}
              />
              {submitted && !isBlankOk && (
                <span className="ml-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded break-all">
                  {blankInfo?.canonico}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const progressPercent = totalQuestions > 0 ? Math.round((questionNumber / totalQuestions) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-slate-100 font-sans">
      {/* Header */}
      <header className="z-20 shrink-0 border-b border-slate-300/80 bg-white px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
              title="Salir del cuestionario"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Salir</span>
            </button>
          ) : <div className="w-16" />}

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
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {onMarkForReview ? (
            <button
              onClick={handleToggleMark}
              title={isMarked ? 'Marcada para revisión' : 'Marcar para revisión'}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors shrink-0 ${
                isMarked ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-amber-400' : ''}`} />
            </button>
          ) : <div className="w-10" />}
        </div>
      </header>

      {/* Main Content Area - Fully Scrollable */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:py-6 pb-32 [scrollbar-gutter:stable]">
        <div className="w-full max-w-3xl mx-auto space-y-6">

          {/* Type Badge & Category */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 uppercase tracking-wider text-[11px]">
                {tipo.replace('_', ' ')}
              </span>
              {question?.categoria && (
                <span className="px-2.5 py-1 rounded-full bg-slate-200/70 text-slate-700 font-medium">
                  Categoría: {question.categoria}
                </span>
              )}
            </div>
          </div>

          {/* Main Question Card */}
          <Card className="p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xl bg-white">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug break-words">
                <MathText text={headingText} />
              </h2>
            </div>

            {/* Input Fields depending on Question Type */}
            <div className="mt-4 space-y-4">
              {/* 1. SHORT ANSWER */}
              {tipo === 'respuesta_corta' && (
                <div>
                  <Input
                    type="text"
                    disabled={submitted}
                    value={userInputs.text || ''}
                    onChange={(e) => setUserInputs({ text: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !submitted) handleSubmit(); }}
                    placeholder="Escribe el nombre o término canónico..."
                    className="text-base sm:text-lg py-3 px-4 rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
                  />
                </div>
              )}

              {/* 2. NUMERIC */}
              {tipo === 'numerico' && (
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    disabled={submitted}
                    value={userInputs.text || ''}
                    onChange={(e) => setUserInputs({ text: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !submitted) handleSubmit(); }}
                    placeholder="Ej. 25"
                    className="text-base sm:text-lg py-3 px-4 rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-200 max-w-[200px]"
                  />
                  {question?.respuesta?.unidad && (
                    <span className="text-sm sm:text-base font-semibold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                      {question.respuesta.unidad}
                    </span>
                  )}
                </div>
              )}

              {/* 3. ENUMERATION & SEQUENCE */}
              {(tipo === 'enumeracion' || tipo === 'secuencia') && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    {tipo === 'secuencia' ? 'Ingresa los elementos en el orden correcto:' : 'Escribe un elemento por campo o separa varios con comas, punto y coma o saltos de línea.'}
                  </p>
                  {Object.keys(userInputs).map((idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                        {parseInt(idx, 10) + 1}
                      </span>
                      <Input
                        type="text"
                        disabled={submitted}
                        value={userInputs[idx] || ''}
                        onChange={(e) => setUserInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                        placeholder={`Elemento ${parseInt(idx, 10) + 1}...`}
                        className="text-sm sm:text-base py-2.5 px-3.5 rounded-xl border-slate-300 focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 4. CLOZE */}
              {tipo === 'cloze' && renderClozeText()}

              {/* 5. RELATION / MATCHING */}
              {tipo === 'relacion' && (
                <div className="space-y-3">
                  {(question?.respuesta?.pares || []).map((par, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800 text-sm sm:text-base break-words">
                        {par.clave}
                      </span>
                      <div className="w-full sm:w-1/2">
                        <select
                          disabled={submitted}
                          value={userInputs[par.clave] || ''}
                          onChange={(e) => setUserInputs(prev => ({ ...prev, [par.clave]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm sm:text-base rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
                        >
                          <option value="">-- Selecciona corresponder --</option>
                          {candidateOptions.map((opt, optIdx) => (
                            <option key={optIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            {!submitted && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-7 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  Comprobar respuesta <CornerDownLeft className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </Card>

          {/* FEEDBACK & EVALUATION RESULTS CARD */}
          <AnimatePresence>
            {submitted && result && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-4"
              >
                {/* Score & Evaluation Header */}
                <div className={`p-5 rounded-3xl border shadow-lg ${
                  result.correcto
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : result.puntos > 0
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-rose-50/90 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      {result.correcto ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : result.puntos > 0 ? (
                        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-extrabold text-base sm:text-lg">
                        {result.correcto ? '¡Respuesta Correcta!' : result.puntos > 0 ? 'Respuesta Parcial' : 'Respuesta Incorrecta'}
                      </h3>
                    </div>
                    <span className="font-black text-sm sm:text-base px-3 py-1 rounded-full bg-white/80 border shadow-sm">
                      {result.puntos} / {result.max} pts
                    </span>
                  </div>

                  {/* Orthography Notice */}
                  {result.avisoOrtografia && (
                    <div className="mt-2 text-xs sm:text-sm bg-indigo-100/90 text-indigo-900 p-3 rounded-xl border border-indigo-300/60 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Nota de ortografía:</span> Se otorgó el punto, pero ten en cuenta la grafía canónica en Terminologia Anatomica.
                      </div>
                    </div>
                  )}

                  <OpenEndedAnswerComparison inputs={userInputs} result={result} type={tipo} />
                </div>

                {/* Justification & Book Source Card */}
                <Card className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-white shadow-md">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-sm sm:text-base">
                    <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" /> Justificación
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed mb-3 break-words">
                    {cleanQuizDisplayText(result.feedback || question?.feedback || question?.justificacion) || 'Sin justificación adicional.'}
                  </p>

                  {question?.fuente && (
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                      {cleanQuizDisplayText(question.fuente.obra) && <span><strong>Obra:</strong> {cleanQuizDisplayText(question.fuente.obra)}</span>}
                      {cleanQuizDisplayText(question.fuente.pag) && <span><strong>Pág:</strong> {cleanQuizDisplayText(question.fuente.pag)}</span>}
                      {(question.fuente.fig || question.fuente.tabla) && (
                        <span><strong>Ref:</strong> {cleanQuizDisplayText(question.fuente.fig) ? `Fig. ${cleanQuizDisplayText(question.fuente.fig)}` : cleanQuizDisplayText(question.fuente.tabla) ? `Tabla ${cleanQuizDisplayText(question.fuente.tabla)}` : 'No especificada'}</span>
                      )}
                    </div>
                  )}
                </Card>

                {/* Next Question Navigation Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={onNext}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-8 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 text-base cursor-pointer"
                  >
                    Siguiente pregunta <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
