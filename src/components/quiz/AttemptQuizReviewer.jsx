import { useState, useMemo, useCallback, useEffect } from 'react';
import QuestionView from './QuestionView';
import { normalizeQuizQuestion, normalizeExpandedQuiz } from '@/lib/quiz-normalization';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AttemptQuizReviewer({
  attempt,
  quizTitle = '',
  quizzes = [],
  initialIndex = 0,
  isAdmin = false,
  onClose,
  onApprove
}) {
  if (!attempt) return null;

  // 1. Reconstruct full quiz questions list
  const fallbackQuiz = useMemo(() => {
    return quizzes.find(q => q.id === attempt.quiz_id);
  }, [quizzes, attempt.quiz_id]);

  const rawQuestions = useMemo(() => {
    const snapshotQuestions = attempt.quiz_snapshot?.questions || attempt.quiz_snapshot?.items;
    if (Array.isArray(snapshotQuestions) && snapshotQuestions.length > 0) {
      return snapshotQuestions;
    }
    if (fallbackQuiz) {
      const expanded = normalizeExpandedQuiz(fallbackQuiz);
      if (Array.isArray(expanded.questions) && expanded.questions.length > 0) {
        return expanded.questions;
      }
    }
    return [];
  }, [attempt.quiz_snapshot, fallbackQuiz]);

  const questions = useMemo(() => {
    return rawQuestions.map((q, idx) => normalizeQuizQuestion(q, idx));
  }, [rawQuestions]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const start = Number.isInteger(initialIndex) ? initialIndex : 0;
    return Math.max(0, Math.min(start, Math.max(0, questions.length - 1)));
  });

  // When initialIndex changes, jump to it
  useEffect(() => {
    if (Number.isInteger(initialIndex) && initialIndex >= 0 && initialIndex < questions.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, questions.length]);

  const [filter, setFilter] = useState('all'); // 'all' | 'wrong' | 'correct'
  const [localApproved, setLocalApproved] = useState(new Map());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveReason, setApproveReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Map answers by question index
  const answersByIndex = useMemo(() => {
    const map = new Map();
    if (Array.isArray(attempt.answer_log) && attempt.answer_log.length > 0) {
      attempt.answer_log.forEach((entry, idx) => {
        const index = Number.isInteger(entry.answer_index) ? entry.answer_index : idx;
        map.set(index, entry);
      });
    }
    if (Array.isArray(attempt.wrong_questions)) {
      attempt.wrong_questions.forEach((wq, idx) => {
        const index = Number.isInteger(wq.answer_index) ? wq.answer_index : idx;
        if (!map.has(index)) {
          map.set(index, { ...wq, is_correct: false });
        }
      });
    }
    if (Array.isArray(attempt.admin_reviewed_answers)) {
      attempt.admin_reviewed_answers.forEach((ra) => {
        const index = ra.answer_index ?? ra.reviewIndex;
        if (Number.isInteger(index)) {
          map.set(index, { ...(map.get(index) || {}), ...ra, is_correct: true, admin_review: true });
        }
      });
    }
    return map;
  }, [attempt]);

  // Status list for question pills
  const questionStatuses = useMemo(() => {
    return questions.map((_, idx) => {
      const ans = answersByIndex.get(idx);
      const isApproved = localApproved.has(idx) || Boolean(ans?.admin_review);
      const isCorrect = ans ? ans.is_correct === true : true;
      return {
        index: idx,
        isCorrect,
        isApproved
      };
    });
  }, [questions, answersByIndex, localApproved]);

  const filteredIndices = useMemo(() => {
    return questionStatuses
      .filter(s => {
        if (filter === 'wrong') return !s.isCorrect && !s.isApproved;
        if (filter === 'correct') return s.isCorrect || s.isApproved;
        return true;
      })
      .map(s => s.index);
  }, [questionStatuses, filter]);

  const currentPosInFilter = filteredIndices.indexOf(currentIndex);
  const safeIndex = currentPosInFilter >= 0 ? currentIndex : (filteredIndices[0] ?? currentIndex);

  const canGoPrev = currentPosInFilter > 0;
  const canGoNext = currentPosInFilter >= 0 && currentPosInFilter < filteredIndices.length - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex(filteredIndices[currentPosInFilter - 1]);
    }
  }, [canGoPrev, currentPosInFilter, filteredIndices]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex(filteredIndices[currentPosInFilter + 1]);
    }
  }, [canGoNext, currentPosInFilter, filteredIndices]);

  // Current question data
  const currentQuestion = questions[safeIndex];
  const currentAnswer = answersByIndex.get(safeIndex);
  const isCurrentApproved = localApproved.has(safeIndex) || Boolean(currentAnswer?.admin_review);
  const isCurrentCorrect = currentAnswer ? currentAnswer.is_correct === true : true;

  const dynamicScore = useMemo(() => {
    const base = Number(attempt.score || 0);
    return base + localApproved.size;
  }, [attempt.score, localApproved]);

  const effectiveQuizTitle = quizTitle || attempt.quiz_snapshot?.title || fallbackQuiz?.title || 'Cuestionario';

  const handleConfirmApprove = async () => {
    if (!approveReason.trim() || isApproving) return;
    setIsApproving(true);
    try {
      const row = {
        attempt,
        reviewSource: currentAnswer?.reviewSource || (attempt.answer_log?.length ? 'answer_log' : 'wrong_questions'),
        reviewIndex: Number.isInteger(currentAnswer?.reviewIndex) ? currentAnswer.reviewIndex : safeIndex,
        question: currentQuestion.question,
        rawSelectedAnswer: currentAnswer?.selected_answer,
        attemptScore: dynamicScore
      };
      if (onApprove) {
        await onApprove(row, approveReason);
      }
      setLocalApproved(prev => new Map(prev).set(safeIndex, { ok: true, reason: approveReason }));
      setShowApproveModal(false);
      setApproveReason('');
      toast.success('Respuesta validada como correcta. Calificación actualizada.');
    } catch (err) {
      toast.error(err.message || 'No se pudo validar la respuesta.');
    } finally {
      setIsApproving(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="bg-white p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
          <p className="text-slate-700">No se encontraron preguntas en este intento.</p>
          <Button onClick={onClose}>Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <QuestionView
        key={safeIndex}
        question={currentQuestion}
        questionNumber={safeIndex + 1}
        totalQuestions={questions.length}
        correctAnswers={dynamicScore}
        wrongAnswers={Math.max(0, questions.length - dynamicScore)}
        savedAnswer={currentAnswer}
        onBack={onClose}
        onNext={canGoNext ? handleNext : null}
        onPrev={canGoPrev ? handlePrev : null}
        isReviewMode={true}
        reviewDetails={{
          studentName: attempt.username || attempt.user_email || 'Estudiante',
          quizTitle: effectiveQuizTitle,
          attemptDate: attempt.completed_at || attempt.created_date,
          filter,
          onFilterChange: setFilter,
          questionStatuses,
          onJumpToQuestion: (idx) => setCurrentIndex(idx),
          onApprove: isAdmin && !isCurrentCorrect && !isCurrentApproved ? () => setShowApproveModal(true) : null,
          isApproved: isCurrentApproved
        }}
      />

      {/* Admin Approval Dialog */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Validar respuesta como correcta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Esta acción otorgará el acierto al estudiante para esta pregunta y actualizará la calificación en su historial.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motivo de la validación
              </label>
              <Input
                value={approveReason}
                onChange={e => setApproveReason(e.target.value)}
                placeholder="Ej: Sinónimo anatómico válido o error tipográfico menor"
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap mt-2">
                {['Sinónimo anatómico válido', 'Concepto correcto', 'Error tipográfico leve'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setApproveReason(suggestion)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancelar
            </Button>
            <Button
              disabled={isApproving || !approveReason.trim()}
              onClick={handleConfirmApprove}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isApproving ? 'Guardando...' : 'Confirmar y sumar acierto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
