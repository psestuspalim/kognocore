import { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, AlertCircle, Calendar, Trash2, Eye, Loader2, ChevronDown, ChevronUp, FileDown, BookOpen, ArrowLeft, LayoutDashboard, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MathText from '../components/quiz/MathText';
import { fromCompactFormat, isCompactFormat } from '../components/utils/quizFormats';
import AttemptDetailModal from '../components/admin/AttemptDetailModal';
import StudentProgressModal from '../components/admin/StudentProgressModal';
import QuizMasterDocs from '../components/admin/QuizMasterDocs';

export default function AdminProgress() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [isPurging, setIsPurging] = useState(false);
  const [expandedAttempts, setExpandedAttempts] = useState({});
  const [showProgressModal, setShowProgressModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: attempts = [] } = useQuery({
    queryKey: ['quiz-attempts'],
    queryFn: () => client.entities.QuizAttempt.list('-created_date', 2000),
  });

  // Filter out incomplete attempts (0 score with 0 answered)
  const validAttempts = attempts.filter(a =>
    a.answered_questions > 0 || a.score > 0 || a.is_completed
  );

  const deleteAttemptMutation = useMutation({
    mutationFn: (id) => client.entities.QuizAttempt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quiz-attempts']);
      toast.success('Intento eliminado');
      setSelectedAttempt(null);
    },
    onError: () => toast.error('Error al eliminar')
  });

  const purgeFailedAttempts = async () => {
    const failedAttempts = attempts.filter(a =>
      (a.answered_questions === 0 || !a.answered_questions) &&
      a.score === 0 &&
      !a.is_completed
    );

    if (failedAttempts.length === 0) {
      toast.info('No hay intentos fallidos para eliminar');
      return;
    }

    setIsPurging(true);
    try {
      for (const attempt of failedAttempts) {
        await client.entities.QuizAttempt.delete(attempt.id);
      }
      queryClient.invalidateQueries(['quiz-attempts']);
      toast.success(`${failedAttempts.length} intentos fallidos eliminados`);
    } catch (error) {
      toast.error('Error al purgar intentos');
    } finally {
      setIsPurging(false);
    }
  };

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => client.entities.Quiz.list(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => client.entities.Subject.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => client.entities.User.list('-created_date', 1000),
  });

  const { data: metacogAnalyses = [] } = useQuery({
    queryKey: ['metacog-analyses-admin'],
    queryFn: () => client.entities.MetacogAnalysis.list('-created_date'),
  });

  const { data: metacogAssignments = [] } = useQuery({
    queryKey: ['metacog-assignments-admin'],
    queryFn: () => client.entities.MetacogAssignment.list('-created_date'),
  });

  const buildStudentKey = (payload) => payload?.learner_id || payload?.email || payload?.user_email || payload?.id;

  // Crear índice de estudiantes usando usuarios y también intentos (si aún no existe el User).
  const studentStats = {};
  users
    .filter((u) => u?.role !== 'admin')
    .forEach((user) => {
      const key = buildStudentKey(user);
      if (!key) return;
      studentStats[key] = {
        key,
        learner_id: user.learner_id || null,
        email: user.email || null,
        username: user.username || user.full_name || 'Sin nombre',
        attempts: [],
        totalQuizzes: 0,
        totalCorrect: 0,
        totalQuestions: 0
      };
    });

  validAttempts.forEach((attempt) => {
    const key = buildStudentKey({ learner_id: attempt.learner_id, user_email: attempt.user_email });
    if (!key) return;

    if (!studentStats[key]) {
      studentStats[key] = {
        key,
        learner_id: attempt.learner_id || null,
        email: attempt.user_email || null,
        username: attempt.username || 'Sin nombre',
        attempts: [],
        totalQuizzes: 0,
        totalCorrect: 0,
        totalQuestions: 0
      };
    }

    studentStats[key].attempts.push(attempt);
    studentStats[key].totalQuizzes += 1;
    studentStats[key].totalCorrect += attempt.score || 0;
    studentStats[key].totalQuestions += attempt.total_questions || 0;
    if (!studentStats[key].email && attempt.user_email) studentStats[key].email = attempt.user_email;
    if ((!studentStats[key].username || studentStats[key].username === 'Sin nombre') && attempt.username) {
      studentStats[key].username = attempt.username;
    }
  });

  const failedAttemptsCount = attempts.length - validAttempts.length;

  const toggleAttemptExpand = (attemptId) => {
    setExpandedAttempts(prev => ({
      ...prev,
      [attemptId]: !prev[attemptId]
    }));
  };

  const students = Object.values(studentStats).filter((student) => {
    const search = searchTerm.toLowerCase();
    return (
      (student.username || '').toLowerCase().includes(search) ||
      (student.email || '').toLowerCase().includes(search) ||
      (student.learner_id || '').toLowerCase().includes(search)
    );
  });

  const getQuizTitle = (quizId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    return quiz?.title || 'Cuestionario eliminado';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Sin materia';
  };

  const getExpandedQuizQuestions = (quizId) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return [];
    if (Array.isArray(quiz.questions) && quiz.questions.length > 0) return quiz.questions;
    if (isCompactFormat(quiz)) {
      const expanded = fromCompactFormat(quiz);
      return expanded?.questions || [];
    }
    if (quiz?.q && Array.isArray(quiz.q) && quiz.q.length > 0) {
      const parsedQ = quiz.q.map((item) => (typeof item === 'string' ? JSON.parse(item) : item));
      const expanded = quiz.t
        ? fromCompactFormat({ t: quiz.t, q: parsedQ })
        : fromCompactFormat({ m: quiz.m || { t: quiz.title }, q: parsedQ });
      return expanded?.questions || [];
    }
    return [];
  };

  const normalizeOptionText = (opt) => {
    if (typeof opt === 'string') return opt;
    if (!opt || typeof opt !== 'object') return '';
    return String(opt.text ?? opt.value ?? opt.label ?? '').trim();
  };

  const normalizeAnswerOptions = (options = []) =>
    (Array.isArray(options) ? options : [])
      .map((opt, idx) => {
        const text = normalizeOptionText(opt);
        if (!text) return null;
        return {
          id: String(opt?.id ?? idx),
          text,
          isCorrect: Boolean(opt?.isCorrect ?? opt?.c)
        };
      })
      .filter(Boolean);

  const sameAnswerText = (left, right) =>
    String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();

  const escapeHtml = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const buildOptionsHtml = (row) => {
    const options = normalizeAnswerOptions(row.answerOptions || []);
    if (options.length === 0) return '<div class="muted">Opciones no disponibles.</div>';

    return `
      <div class="opts">
        ${options
          .map((opt, idx) => {
            const isSelected = sameAnswerText(opt.text, row.selected_answer);
            const isCorrect = opt.isCorrect || sameAnswerText(opt.text, row.correct_answer);
            const cls = isSelected && isCorrect
              ? 'opt selected-correct'
              : isSelected
                ? 'opt selected'
                : isCorrect
                  ? 'opt correct'
                  : 'opt';

            const badges = [
              isSelected ? '<span class="tag tag-selected">Seleccionada</span>' : '',
              isCorrect ? '<span class="tag tag-correct">Correcta</span>' : ''
            ].join('');

            return `
              <div class="${cls}">
                <span class="opt-letter">${String.fromCharCode(65 + idx)}.</span>
                <span class="opt-text">${escapeHtml(opt.text)}</span>
                <span class="opt-tags">${badges}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  };

  const getAttemptQuestionRows = (attempt) => {
    const quizQuestions = getExpandedQuizQuestions(attempt.quiz_id);
    const quizQuestionMap = new Map((quizQuestions || []).map((q) => [q.question, q]));

    if (Array.isArray(attempt.answer_log) && attempt.answer_log.length > 0) {
      return attempt.answer_log.map((entry, idx) => {
        const questionText = entry.question || 'Pregunta sin texto';
        const quizQuestion = quizQuestionMap.get(questionText);
        const rowOptions = normalizeAnswerOptions(
          entry.answerOptions?.length ? entry.answerOptions : (quizQuestion?.answerOptions || quizQuestion?.options || [])
        );
        const derivedCorrect = rowOptions.find((o) => o.isCorrect)?.text || '';

        return {
          id: `${attempt.id}-${idx}`,
          question: questionText,
          selected_answer: entry.selected_answer || '',
          correct_answer: entry.correct_answer || derivedCorrect,
          answerOptions: rowOptions,
          hint: entry.hint || quizQuestion?.hint || '',
          is_correct: entry.is_correct === true
        };
      });
    }

    const wrongMap = new Map();
    (attempt.wrong_questions || []).forEach((wq) => {
      wrongMap.set(wq.question, {
        question: wq.question || 'Pregunta sin texto',
        selected_answer: wq.selected_answer || '',
        correct_answer: wq.correct_answer || '',
        answerOptions: normalizeAnswerOptions(
          wq.answerOptions?.length ? wq.answerOptions : (quizQuestionMap.get(wq.question)?.answerOptions || quizQuestionMap.get(wq.question)?.options || [])
        ),
        hint: wq.hint || '',
        is_correct: false
      });
    });

    const recoveredCorrect = getExpandedQuizQuestions(attempt.quiz_id)
      .filter((q) => !wrongMap.has(q.question))
      .slice(0, attempt.score || 0)
      .map((q) => ({
        question: q.question || 'Pregunta sin texto',
        selected_answer: (q.answerOptions || q.options || []).find((o) => (o.isCorrect ?? o.c))?.text || '',
        correct_answer: (q.answerOptions || q.options || []).find((o) => (o.isCorrect ?? o.c))?.text || '',
        answerOptions: normalizeAnswerOptions(q.answerOptions || q.options || []),
        hint: q.hint || '',
        is_correct: true
      }));

    return [...recoveredCorrect, ...Array.from(wrongMap.values())];
  };

  const openPrintWindow = (title, bodyHtml) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; max-width: 920px; margin: 0 auto; color: #111827; }
          h1 { color: #0f172a; margin-bottom: 8px; }
          h2 { color: #1e293b; margin-top: 24px; margin-bottom: 8px; }
          .meta { color: #475569; margin-bottom: 20px; }
          .summary { display: flex; gap: 16px; margin-bottom: 20px; }
          .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; min-width: 140px; }
          .kpi strong { font-size: 20px; color: #0f172a; display: block; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid; }
          .ok { border-left: 4px solid #16a34a; background: #f0fdf4; }
          .ko { border-left: 4px solid #dc2626; background: #fef2f2; }
          .qa { margin-top: 8px; font-size: 14px; color: #334155; }
          .muted { color: #64748b; font-size: 12px; }
          .opts { margin-top: 8px; display: grid; gap: 6px; }
          .opt { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: start; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #ffffff; }
          .opt.correct { border-color: #86efac; background: #f0fdf4; }
          .opt.selected { border-color: #fca5a5; background: #fef2f2; }
          .opt.selected-correct { border-color: #34d399; background: #ecfdf5; }
          .opt-letter { color: #475569; font-weight: 700; }
          .opt-text { color: #0f172a; }
          .opt-tags { display: inline-flex; gap: 6px; flex-wrap: wrap; }
          .tag { border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
          .tag-selected { background: #fee2e2; color: #991b1b; }
          .tag-correct { background: #dcfce7; color: #166534; }
          .footer { margin-top: 26px; color: #94a3b8; font-size: 12px; text-align: center; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>${bodyHtml}</body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const generateQuizPDF = (student, quizStat) => {
    const rows = quizStat.attempts.flatMap((attempt) =>
      getAttemptQuestionRows(attempt).map((row) => ({
        ...row,
        attemptDate: attempt.completed_at || attempt.created_date
      }))
    );
    const correctRows = rows.filter((r) => r.is_correct);
    const wrongRows = rows.filter((r) => !r.is_correct);

    openPrintWindow(
      `Reporte ${quizStat.quizTitle}`,
      `
      <h1>Reporte por Quiz</h1>
      <p class="meta"><strong>Estudiante:</strong> ${student.username || 'Sin nombre'} · <strong>Email:</strong> ${student.email || 'N/A'} · <strong>Quiz:</strong> ${quizStat.quizTitle}</p>
      <div class="summary">
        <div class="kpi"><span>Total respuestas</span><strong>${rows.length}</strong></div>
        <div class="kpi"><span>Correctas</span><strong>${correctRows.length}</strong></div>
        <div class="kpi"><span>Incorrectas</span><strong>${wrongRows.length}</strong></div>
      </div>
      <h2>Preguntas Correctas</h2>
      ${correctRows.length === 0 ? '<p class="muted">Sin respuestas correctas registradas.</p>' : correctRows.map((row, idx) => `
        <div class="card ok">
          <strong>${idx + 1}. ${escapeHtml(row.question)}</strong>
          <div class="qa"><strong>Respondió:</strong> ${escapeHtml(row.selected_answer || row.correct_answer || 'N/A')}</div>
          <div class="qa"><strong>Correcta:</strong> ${escapeHtml(row.correct_answer || 'N/A')}</div>
          ${buildOptionsHtml(row)}
          <div class="muted">${format(new Date(row.attemptDate), 'dd/MM/yyyy HH:mm')}</div>
        </div>
      `).join('')}
      <h2>Preguntas Incorrectas</h2>
      ${wrongRows.length === 0 ? '<p class="muted">Sin respuestas incorrectas registradas.</p>' : wrongRows.map((row, idx) => `
        <div class="card ko">
          <strong>${idx + 1}. ${escapeHtml(row.question)}</strong>
          <div class="qa"><strong>Respondió:</strong> ${escapeHtml(row.selected_answer || 'N/A')}</div>
          <div class="qa"><strong>Correcta:</strong> ${escapeHtml(row.correct_answer || 'N/A')}</div>
          ${buildOptionsHtml(row)}
          <div class="muted">${format(new Date(row.attemptDate), 'dd/MM/yyyy HH:mm')}</div>
        </div>
      `).join('')}
      <div class="footer">Generado automáticamente · ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
    `
    );
  };

  const generatePerformancePDF = (student) => {
    const rows = student.attempts.flatMap((attempt) =>
      getAttemptQuestionRows(attempt).map((row) => ({
        ...row,
        quizTitle: getQuizTitle(attempt.quiz_id),
        attemptDate: attempt.completed_at || attempt.created_date
      }))
    );

    if (rows.length === 0) {
      toast.info('Este estudiante no tiene respuestas registradas');
      return;
    }

    const correctRows = rows.filter((r) => r.is_correct);
    const wrongRows = rows.filter((r) => !r.is_correct);

    openPrintWindow(
      `Reporte de rendimiento ${student.username || student.email || student.learner_id}`,
      `
      <h1>Reporte de Rendimiento del Estudiante</h1>
      <p class="meta"><strong>Estudiante:</strong> ${student.username || 'Sin nombre'} · <strong>Email:</strong> ${student.email || 'N/A'} · <strong>Learner ID:</strong> ${student.learner_id || 'N/A'}</p>
      <div class="summary">
        <div class="kpi"><span>Intentos</span><strong>${student.totalQuizzes}</strong></div>
        <div class="kpi"><span>Correctas</span><strong>${correctRows.length}</strong></div>
        <div class="kpi"><span>Incorrectas</span><strong>${wrongRows.length}</strong></div>
      </div>
      <h2>Preguntas Correctas</h2>
      ${correctRows.length === 0 ? '<p class="muted">No hay respuestas correctas registradas.</p>' : correctRows.map((row, idx) => `
        <div class="card ok">
          <strong>${idx + 1}. ${escapeHtml(row.question)}</strong>
          <div class="qa"><strong>Quiz:</strong> ${escapeHtml(row.quizTitle)}</div>
          <div class="qa"><strong>Respondió:</strong> ${escapeHtml(row.selected_answer || row.correct_answer || 'N/A')}</div>
          <div class="qa"><strong>Correcta:</strong> ${escapeHtml(row.correct_answer || 'N/A')}</div>
          ${buildOptionsHtml(row)}
          <div class="muted">${format(new Date(row.attemptDate), 'dd/MM/yyyy HH:mm')}</div>
        </div>
      `).join('')}
      <h2>Preguntas Incorrectas</h2>
      ${wrongRows.length === 0 ? '<p class="muted">No hay respuestas incorrectas registradas.</p>' : wrongRows.map((row, idx) => `
        <div class="card ko">
          <strong>${idx + 1}. ${escapeHtml(row.question)}</strong>
          <div class="qa"><strong>Quiz:</strong> ${escapeHtml(row.quizTitle)}</div>
          <div class="qa"><strong>Respondió:</strong> ${escapeHtml(row.selected_answer || 'N/A')}</div>
          <div class="qa"><strong>Correcta:</strong> ${escapeHtml(row.correct_answer || 'N/A')}</div>
          ${buildOptionsHtml(row)}
          <div class="muted">${format(new Date(row.attemptDate), 'dd/MM/yyyy HH:mm')}</div>
        </div>
      `).join('')}
      <div class="footer">Generado automáticamente · ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
    `
    );
  };

  // Calcular estadísticas por quiz para el estudiante seleccionado
  const getQuizStats = (student) => {
    const quizStats = {};
    student.attempts.forEach(attempt => {
      if (!quizStats[attempt.quiz_id]) {
        quizStats[attempt.quiz_id] = {
          quizId: attempt.quiz_id,
          quizTitle: getQuizTitle(attempt.quiz_id),
          subjectId: attempt.subject_id,
          attempts: [],
          bestScore: 0,
          avgScore: 0,
          totalAttempts: 0
        };
      }
      const percentage = attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0;
      quizStats[attempt.quiz_id].attempts.push(attempt);
      quizStats[attempt.quiz_id].bestScore = Math.max(quizStats[attempt.quiz_id].bestScore, percentage);
      quizStats[attempt.quiz_id].totalAttempts += 1;
    });

    // Calcular promedio por quiz
    Object.values(quizStats).forEach(stat => {
      const total = stat.attempts.reduce((sum, att) => {
        const percentage = att.total_questions > 0 ? (att.score / att.total_questions) * 100 : 0;
        return sum + percentage;
      }, 0);
      stat.avgScore = total / stat.attempts.length;
    });

    return Object.values(quizStats);
  };

  // Calcular estadísticas por tema
  const getSubjectStats = (student) => {
    const subjectStats = {};
    student.attempts.forEach(attempt => {
      const subjectId = attempt.subject_id || 'sin-materia';
      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = {
          subjectId,
          subjectName: getSubjectName(subjectId),
          totalCorrect: 0,
          totalQuestions: 0,
          attempts: []
        };
      }
      subjectStats[subjectId].totalCorrect += attempt.score;
      subjectStats[subjectId].totalQuestions += attempt.total_questions;
      subjectStats[subjectId].attempts.push(attempt);
    });

    return Object.values(subjectStats).map(stat => ({
      ...stat,
      avgPercentage: (stat.totalCorrect / stat.totalQuestions) * 100
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link to={createPageUrl('AdminHome')}>
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard admin
              </Button>
            </Link>
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Salir de esta sección
              </Button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
                Progreso de Estudiantes
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Panel administrativo para seguimiento de rendimiento
              </p>
            </div>
            <div className="flex items-center gap-3">
              {failedAttemptsCount > 0 && (
                <Button
                  variant="outline"
                  onClick={purgeFailedAttempts}
                  disabled={isPurging}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {isPurging ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Purgar {failedAttemptsCount} fallidos
                </Button>
              )}
              <Badge variant="outline" className="text-sm py-1 px-3">
                {validAttempts.length} intentos válidos
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="students" className="mb-6">
          <TabsList>
            <TabsTrigger value="students">Estudiantes</TabsTrigger>
            <TabsTrigger value="metacog">
              <Brain className="w-4 h-4 mr-2" />
              Metacog
            </TabsTrigger>
            <TabsTrigger value="docs">
              <BookOpen className="w-4 h-4 mr-2" />
              Documentación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">{/* Contenido de estudiantes */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Lista de estudiantes */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Estudiantes</CardTitle>
                    <div className="relative mt-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar estudiante..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-[400px] sm:max-h-[600px] overflow-y-auto space-y-2 p-3 sm:p-6">
                    {students.map((student) => {
                      const avgScore = student.totalQuestions > 0
                        ? Math.round((student.totalCorrect / student.totalQuestions) * 100)
                        : 0;

                      return (
                        <button
                          key={student.key}
                          onClick={() => setSelectedStudent(student)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedStudent?.key === student.key
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="font-semibold text-gray-900">
                            {student.username || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500 mb-2">
                            {student.email || student.learner_id || 'Sin email'}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              {student.totalQuizzes} intentos
                            </span>
                            <Badge
                              className={
                                avgScore >= 70 ? 'bg-green-100 text-green-800' :
                                  avgScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                              }
                            >
                              {avgScore}%
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                    {students.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No se encontraron estudiantes
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detalles del estudiante */}
              <div className="lg:col-span-2">
                {selectedStudent ? (
                  <div className="space-y-6">
                    {/* Resumen */}
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                          <CardTitle>
                            {selectedStudent.username || 'Sin nombre'}
                          </CardTitle>
                          <p className="text-sm text-gray-500">{selectedStudent.email || selectedStudent.learner_id || 'Sin email'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => generatePerformancePDF(selectedStudent)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            PDF Rendimiento
                          </Button>
                          <Button
                            onClick={() => setShowProgressModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Ver análisis
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                          <div className="text-center">
                            <div className="text-xl sm:text-3xl font-bold text-indigo-600">
                              {selectedStudent.totalQuizzes}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">Intentos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl sm:text-3xl font-bold text-green-600">
                              {selectedStudent.totalCorrect}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">Correctas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl sm:text-3xl font-bold text-gray-900">
                              {selectedStudent.totalQuestions > 0
                                ? Math.round((selectedStudent.totalCorrect / selectedStudent.totalQuestions) * 100)
                                : 0}%
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">Promedio</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Progreso por Tema */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Progreso por Tema</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {getSubjectStats(selectedStudent).map((subjectStat) => (
                            <div key={subjectStat.subjectId} className="border rounded-lg p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{subjectStat.subjectName}</h4>
                                <Badge className={
                                  subjectStat.avgPercentage >= 70 ? 'bg-green-100 text-green-800' :
                                    subjectStat.avgPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                }>
                                  {Math.round(subjectStat.avgPercentage)}%
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                {subjectStat.totalCorrect}/{subjectStat.totalQuestions} correctas • {subjectStat.attempts.length} intentos
                              </div>
                              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 transition-all"
                                  style={{ width: `${subjectStat.avgPercentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Progreso por Quiz */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Progreso por Cuestionario</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {getQuizStats(selectedStudent).map((quizStat) => (
                            <div key={quizStat.quizId} className="border rounded-lg p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <h4 className="font-medium text-gray-900 text-sm sm:text-base">{quizStat.quizTitle}</h4>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    Mejor: {Math.round(quizStat.bestScore)}%
                                  </Badge>
                                  <Badge className={`text-xs ${quizStat.avgScore >= 70 ? 'bg-green-100 text-green-800' :
                                      quizStat.avgScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    Prom: {Math.round(quizStat.avgScore)}%
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                  {quizStat.totalAttempts} {quizStat.totalAttempts === 1 ? 'intento' : 'intentos'}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => generateQuizPDF(selectedStudent, quizStat)}
                                  className="h-7 text-xs text-indigo-600 hover:bg-indigo-50"
                                >
                                  <FileDown className="w-3 h-3 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Historial de intentos */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Historial de Intentos ({selectedStudent.attempts.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto p-3 sm:p-6">
                        {(selectedStudent.attempts && Array.isArray(selectedStudent.attempts) ? [...selectedStudent.attempts].sort((a, b) =>
                          new Date(b.completed_at || b.created_date) - new Date(a.completed_at || a.created_date)
                        ) : []).map((attempt) => {
                          const percentage = Math.round(attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0);
                          const isPartial = !attempt.is_completed;
                          const isExpanded = expandedAttempts[attempt.id];
                          const quizTitle = getQuizTitle(attempt.quiz_id);

                          return (
                            <div key={attempt.id} className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                              {/* Header - Always visible */}
                              <div className="p-4 bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[200px]" title={quizTitle}>
                                        {quizTitle}
                                      </h4>
                                      {isPartial && (
                                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                          Parcial
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(attempt.completed_at || attempt.created_date), 'dd/MM/yy HH:mm')}
                                      </span>
                                      {attempt.wrong_questions?.length > 0 && (
                                        <span className="text-red-500">
                                          {attempt.wrong_questions.length} errores
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={`text-xs ${percentage >= 70 ? 'bg-green-100 text-green-800' :
                                        percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                      }`}>
                                      {attempt.score}/{attempt.total_questions} ({percentage}%)
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedAttempt({ attempt, quizTitle })}
                                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteAttemptMutation.mutate(attempt.id)}
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                    {attempt.wrong_questions?.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleAttemptExpand(attempt.id)}
                                        className="h-8 w-8 p-0"
                                      >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded wrong questions */}
                              {isExpanded && attempt.wrong_questions?.length > 0 && (
                                <div className="border-t bg-gray-50 p-4">
                                  <div className="flex items-center gap-2 text-sm font-medium text-red-600 mb-3">
                                    <AlertCircle className="w-4 h-4" />
                                    Preguntas incorrectas
                                  </div>
                                  <div className="space-y-3">
                                    {attempt.wrong_questions.slice(0, 5).map((wq, idx) => (
                                      <div key={idx} className="bg-white rounded-lg p-3 border text-sm">
                                        <p className="font-medium text-gray-900 mb-2">
                                          <MathText text={wq.question} />
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div className="flex items-start gap-2 text-red-700 bg-red-50 rounded p-2">
                                            <span className="shrink-0">❌</span>
                                            <MathText text={wq.selected_answer} />
                                          </div>
                                          <div className="flex items-start gap-2 text-green-700 bg-green-50 rounded p-2">
                                            <span className="shrink-0">✓</span>
                                            <MathText text={wq.correct_answer} />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {attempt.wrong_questions.length > 5 && (
                                      <Button
                                        variant="link"
                                        onClick={() => setSelectedAttempt({ attempt, quizTitle })}
                                        className="text-blue-600 p-0 h-auto"
                                      >
                                        Ver todas las {attempt.wrong_questions.length} preguntas incorrectas →
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {selectedStudent.attempts.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            Este estudiante no tiene intentos registrados
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="h-full">
                    <CardContent className="flex items-center justify-center h-full min-h-[400px]">
                      <div className="text-center text-gray-500">
                        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p>Selecciona un estudiante para ver sus detalles</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Attempt Detail Modal */}
            <AttemptDetailModal
              attempt={selectedAttempt?.attempt}
              quizTitle={selectedAttempt?.quizTitle}
              open={!!selectedAttempt}
              onClose={() => setSelectedAttempt(null)}
              onDelete={(id) => deleteAttemptMutation.mutate(id)}
            />

            {/* Student Progress Modal */}
            <StudentProgressModal
              open={showProgressModal}
              onClose={() => setShowProgressModal(false)}
              student={selectedStudent}
              subjects={subjects}
              quizzes={quizzes}
            />
          </TabsContent>

          <TabsContent value="metacog">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registros Metacognitivos</CardTitle>
                <p className="text-sm text-gray-500">
                  Análisis guardados por estudiante, sesión y pregunta.
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-2 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="text-slate-500">Asignaciones</div>
                    <div className="text-xl font-bold text-slate-900">{metacogAssignments.length}</div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <div className="text-amber-700">Pendientes / progreso</div>
                    <div className="text-xl font-bold text-amber-800">
                      {metacogAssignments.filter((a) => a.status === 'pending' || a.status === 'in_progress').length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                    <div className="text-emerald-700">Completadas</div>
                    <div className="text-xl font-bold text-emerald-800">
                      {metacogAssignments.filter((a) => a.status === 'completed').length}
                    </div>
                  </div>
                </div>

                {metacogAssignments.length > 0 && (
                  <div className="mb-5 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-800">Asignaciones recientes</p>
                    <div className="max-h-44 space-y-2 overflow-y-auto">
                      {metacogAssignments.slice(0, 8).map((a) => (
                        <div key={a.id} className="rounded-lg border border-slate-200 p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900">{a.session_name || a.session_code || 'Sesión'}</span>
                            <Badge variant="outline">{a.status || 'pending'}</Badge>
                          </div>
                          <div className="text-xs text-slate-500">
                            {a.assigned_to_name || a.assigned_to_email || a.assigned_to_learner_id || 'Sin estudiante'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {metacogAnalyses.length === 0 ? (
                  <p className="text-sm text-gray-500">Aún no hay registros de Metacog Lab.</p>
                ) : (
                  <div className="space-y-3 max-h-[650px] overflow-y-auto">
                    {metacogAnalyses.map((row) => (
                      <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{row.session_name || row.session_code || 'Sesión'}</p>
                            <p className="text-xs text-slate-500">
                              {row.user_email || row.learner_id || 'Sin usuario'} · {format(new Date(row.created_date || Date.now()), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          <Badge variant="outline">{row.source_quiz_title || row.source_quiz_id || 'Quiz'}</Badge>
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-900">{row.question_text || 'Pregunta sin texto'}</p>
                        <div className="mt-2 grid gap-2 text-xs text-slate-700 md:grid-cols-2">
                          <div><strong>Reformulación:</strong> {row.reformulation || '—'}</div>
                          <div><strong>Pivotes:</strong> {row.pivots || '—'}</div>
                          <div><strong>Errores anticipados:</strong> {row.anticipatedErrors || '—'}</div>
                          <div><strong>Predicción:</strong> {row.predictedAnswer || '—'}</div>
                          <div><strong>Opción elegida:</strong> {row.selectedOption || '—'}</div>
                          <div><strong>Justificación:</strong> {row.justification || '—'}</div>
                          <div><strong>ID intento:</strong> {row.quiz_attempt_id || row.quizAttemptId || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <QuizMasterDocs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
