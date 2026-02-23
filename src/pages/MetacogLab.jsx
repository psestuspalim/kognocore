import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { client } from '@/api/client';
import { fromCompactFormat, isCompactFormat } from '../components/utils/quizFormats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Brain, CheckCircle2, Database, FileUp, Plus, Save, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const COMPONENT_STYLE = 'border border-slate-200 bg-white';

const parseQuizQuestions = (quiz) => {
  try {
    if (Array.isArray(quiz?.questions) && quiz.questions.length > 0) return quiz.questions;
    if (isCompactFormat(quiz)) return fromCompactFormat(quiz)?.questions || [];
    if (quiz?.q && Array.isArray(quiz.q)) {
      const parsedQ = quiz.q.map((item) => (typeof item === 'string' ? JSON.parse(item) : item));
      const expanded = quiz.t
        ? fromCompactFormat({ t: quiz.t, q: parsedQ })
        : fromCompactFormat({ m: quiz.m || { t: quiz.title }, q: parsedQ });
      return expanded?.questions || [];
    }
  } catch (_e) {
    return [];
  }
  return [];
};

const normalizeOptionText = (opt) => {
  if (typeof opt === 'string') return opt.trim();
  if (!opt || typeof opt !== 'object') return '';
  return String(opt.text ?? opt.value ?? opt.label ?? '').trim();
};

const normalizeQuestion = (q, fallbackId) => {
  const optionsRaw = Array.isArray(q.answerOptions) ? q.answerOptions : Array.isArray(q.options) ? q.options : [];
  const options = optionsRaw
    .map((opt, idx) => {
      const text = normalizeOptionText(opt);
      if (!text) return null;
      return {
        id: String(opt?.id ?? idx),
        text,
        isCorrect: Boolean(opt?.isCorrect ?? opt?.c),
        rationale: opt?.rationale ?? opt?.r ?? ''
      };
    })
    .filter(Boolean);

  return {
    id: String(q.id ?? fallbackId),
    text: String(q.question ?? q.text ?? '').trim(),
    hint: q.hint ?? '',
    options
  };
};

const initialAnalysis = {
  phase1SelectedOption: '',
  phase1Confidence: '',
  phase1Reasoning: '',
  phase1Completed: false,
  reformulation: '',
  pivots: '',
  anticipatedErrors: '',
  predictedAnswer: '',
  justification: '',
  phase2Completed: false
};

export default function MetacogLabPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [selectedQuizIds, setSelectedQuizIds] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [assignSessionId, setAssignSessionId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [analysis, setAnalysis] = useState({});
  const [phaseTab, setPhaseTab] = useState('fast');

  const { data: quizzes = [] } = useQuery({
    queryKey: ['metacog-lab-quizzes'],
    queryFn: () => client.entities.Quiz.list('-created_date')
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['metacog-users'],
    queryFn: () => client.entities.User.list('-created_date'),
    enabled: !!isAdmin
  });

  const studentUsers = useMemo(
    () => allUsers.filter((u) => u?.role !== 'admin' && (u?.email || u?.learner_id)),
    [allUsers]
  );

  const { data: bank = [] } = useQuery({
    queryKey: ['metacog-bank-all'],
    queryFn: () => client.entities.MetacogQuestion.list('-created_date'),
    enabled: !!user
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['metacog-sessions-all'],
    queryFn: () => client.entities.MetacogSession.list('-created_date'),
    enabled: !!user
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['metacog-assignments', user?.learner_id, user?.email, user?.role],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin) return client.entities.MetacogAssignment.list('-created_date');
      if (user.learner_id) {
        return client.entities.MetacogAssignment.filter({ assigned_to_learner_id: user.learner_id }, '-created_date');
      }
      if (user.email) {
        return client.entities.MetacogAssignment.filter({ assigned_to_email: user.email }, '-created_date');
      }
      return [];
    },
    enabled: !!user
  });

  const saveQuestionMutation = useMutation({
    mutationFn: (payload) => client.entities.MetacogQuestion.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-bank-all'] })
  });

  const createSessionMutation = useMutation({
    mutationFn: (payload) => client.entities.MetacogSession.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-sessions-all'] })
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id) => client.entities.MetacogSession.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-sessions-all'] })
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (payload) => client.entities.MetacogAssignment.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-assignments'] })
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.MetacogAssignment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-assignments'] })
  });

  const saveAnalysisMutation = useMutation({
    mutationFn: async (payload) => {
      const criteria = {
        session_id: payload.session_id,
        question_id: payload.question_id,
        learner_id: payload.learner_id || null,
        user_email: payload.user_email || null,
        assignment_id: payload.assignment_id || null
      };
      const existing = await client.entities.MetacogAnalysis.filter(criteria);
      if (existing.length > 0) {
        return client.entities.MetacogAnalysis.update(existing[0].id, payload);
      }
      return client.entities.MetacogAnalysis.create(payload);
    }
  });

  const pendingAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'pending' || a.status === 'in_progress'),
    [assignments]
  );

  useEffect(() => {
    if (isAdmin) return;
    if (!activeAssignmentId && pendingAssignments.length > 0) {
      setActiveAssignmentId(pendingAssignments[0].id);
    }
  }, [isAdmin, pendingAssignments, activeAssignmentId]);

  const activeAssignment = assignments.find((a) => a.id === activeAssignmentId) || null;
  const activeSession = useMemo(() => {
    if (activeAssignment?.session_id) {
      return sessions.find((s) => s.id === activeAssignment.session_id) || null;
    }
    return sessions.find((s) => s.id === activeSessionId) || null;
  }, [activeAssignment, activeSessionId, sessions]);

  const activeQuestions = useMemo(() => {
    if (!activeSession?.questionIds) return [];
    const idSet = new Set(activeSession.questionIds.map(String));
    return bank.filter((q) => idSet.has(String(q.id)));
  }, [activeSession, bank]);

  const currentQuestion = activeQuestions[qIndex] || null;

  const { data: sessionAnalyses = [] } = useQuery({
    queryKey: ['metacog-analyses', activeSession?.id, activeAssignment?.id, user?.learner_id, user?.email],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const criteria = { session_id: activeSession.id };
      if (activeAssignment?.id) criteria.assignment_id = activeAssignment.id;
      if (user?.learner_id) criteria.learner_id = user.learner_id;
      else if (user?.email) criteria.user_email = user.email;
      return client.entities.MetacogAnalysis.filter(criteria, '-created_date');
    },
    enabled: !!activeSession?.id && !!user
  });

  useEffect(() => {
    const next = {};
    (sessionAnalyses || []).forEach((row) => {
      next[row.question_id] = {
        phase1SelectedOption: row.phase1_selected_option || row.selectedOption || '',
        phase1Confidence: row.phase1_confidence || '',
        phase1Reasoning: row.phase1_reasoning || '',
        phase1Completed: Boolean(row.phase1_completed || row.phase1_selected_option || row.selectedOption),
        reformulation: row.reformulation || '',
        pivots: row.pivots || '',
        anticipatedErrors: row.anticipatedErrors || '',
        predictedAnswer: row.predictedAnswer || '',
        justification: row.justification || '',
        phase2Completed: Boolean(row.phase2_completed)
      };
    });
    setAnalysis(next);
    setQIndex(0);
    setPhaseTab('fast');
  }, [activeSession?.id, activeAssignment?.id, sessionAnalyses]);

  const currentAnalysis = currentQuestion ? (analysis[currentQuestion.id] || initialAnalysis) : null;

  const phaseProgress = useMemo(() => {
    if (activeQuestions.length === 0) return { quickDone: 0, phaseDone: 0 };
    let quickDone = 0;
    let phaseDone = 0;
    activeQuestions.forEach((q) => {
      const row = analysis[q.id] || initialAnalysis;
      if (row.phase1Completed || row.phase1SelectedOption) quickDone += 1;
      if (row.phase2Completed) phaseDone += 1;
    });
    return { quickDone, phaseDone };
  }, [activeQuestions, analysis]);

  const updateCurrentAnalysis = (field, value) => {
    if (!currentQuestion) return;
    setAnalysis((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || initialAnalysis),
        [field]: value
      }
    }));
  };

  const addSelectedQuizzesToBank = async () => {
    const selected = quizzes.filter((q) => selectedQuizIds.includes(q.id));
    const incoming = [];
    selected.forEach((quiz) => {
      const questions = parseQuizQuestions(quiz);
      questions.forEach((q, idx) => {
        const normalized = normalizeQuestion(q, `${quiz.id}_${idx}`);
        if (normalized.text && normalized.options.length > 0) {
          incoming.push({
            ...normalized,
            sourceQuizId: quiz.id,
            sourceQuizTitle: quiz.title || 'Quiz'
          });
        }
      });
    });

    const existing = new Set(bank.map((q) => `${q.text}::${q.sourceQuizId || q.source_quiz_id || 'manual'}`));
    const unique = incoming.filter((q) => !existing.has(`${q.text}::${q.sourceQuizId || 'manual'}`));
    if (unique.length === 0) {
      toast.info('No hay preguntas nuevas para agregar');
      return;
    }

    await Promise.all(
      unique.map((q) =>
        saveQuestionMutation.mutateAsync({
          ...q,
          source_quiz_id: q.sourceQuizId || null,
          source_quiz_title: q.sourceQuizTitle || null,
          source_question_id: q.id,
          user_email: user?.email || null,
          learner_id: user?.learner_id || null
        })
      )
    );

    toast.success(`Se agregaron ${unique.length} preguntas al banco metacog`);
  };

  const onUploadJson = (file) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const raw = JSON.parse(String(evt.target?.result || '{}'));
        const sourceQuestions = Array.isArray(raw?.quiz)
          ? raw.quiz
          : Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.questions)
              ? raw.questions
              : [];

        const mapped = sourceQuestions
          .map((q, idx) => normalizeQuestion(q, `up_${Date.now()}_${idx}`))
          .filter((q) => q.text && q.options.length > 0)
          .map((q) => ({ ...q, sourceQuizId: 'upload', sourceQuizTitle: 'Archivo JSON' }));

        const existing = new Set(bank.map((q) => `${q.text}::${q.sourceQuizId || q.source_quiz_id || 'manual'}`));
        const unique = mapped.filter((q) => !existing.has(`${q.text}::${q.sourceQuizId || 'manual'}`));

        if (unique.length === 0) {
          toast.info('El JSON no contiene preguntas nuevas');
          return;
        }

        await Promise.all(
          unique.map((q) =>
            saveQuestionMutation.mutateAsync({
              ...q,
              source_quiz_id: 'upload',
              source_quiz_title: 'Archivo JSON',
              source_question_id: q.id,
              user_email: user?.email || null,
              learner_id: user?.learner_id || null
            })
          )
        );
        toast.success(`Se cargaron ${unique.length} preguntas desde JSON`);
      } catch (_e) {
        toast.error('JSON inválido o no compatible');
      }
    };
    reader.readAsText(file);
  };

  const createSession = async () => {
    if (!sessionName.trim() || !sessionCode.trim() || selectedQuestionIds.length === 0) {
      toast.error('Completa nombre, código y al menos una pregunta');
      return;
    }

    await createSessionMutation.mutateAsync({
      name: sessionName.trim(),
      code: sessionCode.trim().toUpperCase(),
      questionIds: selectedQuestionIds,
      question_count: selectedQuestionIds.length,
      created_by_email: user?.email || null,
      created_by_learner_id: user?.learner_id || null,
      createdAt: Date.now()
    });

    setSessionName('');
    setSessionCode('');
    setSelectedQuestionIds([]);
    toast.success('Sesión metacognitiva creada');
  };

  const assignSessionToStudent = async () => {
    if (!assignSessionId || !assignUserId) {
      toast.error('Selecciona sesión y estudiante');
      return;
    }

    const session = sessions.find((s) => s.id === assignSessionId);
    const assignee = studentUsers.find((u) => u.id === assignUserId);
    if (!session || !assignee) {
      toast.error('Datos de asignación incompletos');
      return;
    }

    await createAssignmentMutation.mutateAsync({
      session_id: session.id,
      session_code: session.code,
      session_name: session.name,
      question_ids: session.questionIds || [],
      question_count: Array.isArray(session.questionIds) ? session.questionIds.length : 0,
      assigned_to_user_id: assignee.id,
      assigned_to_email: assignee.email || null,
      assigned_to_learner_id: assignee.learner_id || null,
      assigned_to_name: assignee.full_name || assignee.username || assignee.email || 'Estudiante',
      assigned_by_email: user?.email || null,
      assigned_by_learner_id: user?.learner_id || null,
      status: 'pending'
    });

    setAssignSessionId('');
    setAssignUserId('');
    toast.success('Sesión asignada. El estudiante ya la verá como pendiente.');
  };

  const saveFastPhase = async () => {
    if (!activeSession || !currentQuestion || !currentAnalysis) return;
    if (!currentAnalysis.phase1SelectedOption) {
      toast.error('Selecciona una opción para guardar la fase rápida');
      return;
    }

    const payload = {
      assignment_id: activeAssignment?.id || null,
      session_id: activeSession.id,
      session_code: activeSession.code,
      session_name: activeSession.name,
      question_id: currentQuestion.id,
      question_text: currentQuestion.text,
      source_quiz_id: currentQuestion.sourceQuizId || currentQuestion.source_quiz_id || null,
      source_quiz_title: currentQuestion.sourceQuizTitle || currentQuestion.source_quiz_title || null,
      phase1_selected_option: currentAnalysis.phase1SelectedOption,
      phase1_confidence: currentAnalysis.phase1Confidence || '',
      phase1_reasoning: currentAnalysis.phase1Reasoning || '',
      phase1_completed: true,
      selectedOption: currentAnalysis.phase1SelectedOption,
      reformulation: currentAnalysis.reformulation || '',
      pivots: currentAnalysis.pivots || '',
      anticipatedErrors: currentAnalysis.anticipatedErrors || '',
      predictedAnswer: currentAnalysis.predictedAnswer || '',
      justification: currentAnalysis.justification || '',
      phase2_completed: Boolean(currentAnalysis.phase2Completed),
      user_email: user?.email || null,
      learner_id: user?.learner_id || null
    };

    await saveAnalysisMutation.mutateAsync(payload);
    updateCurrentAnalysis('phase1Completed', true);

    if (activeAssignment?.status === 'pending') {
      await updateAssignmentMutation.mutateAsync({
        id: activeAssignment.id,
        data: {
          status: 'in_progress',
          started_date: new Date().toISOString()
        }
      });
    }

    toast.success('Fase 1 guardada');
    setPhaseTab('analysis');
  };

  const saveAnalysisPhase = async () => {
    if (!activeSession || !currentQuestion || !currentAnalysis) return;
    if (!currentAnalysis.phase1SelectedOption) {
      toast.error('Primero completa la respuesta rápida');
      return;
    }

    const payload = {
      assignment_id: activeAssignment?.id || null,
      session_id: activeSession.id,
      session_code: activeSession.code,
      session_name: activeSession.name,
      question_id: currentQuestion.id,
      question_text: currentQuestion.text,
      source_quiz_id: currentQuestion.sourceQuizId || currentQuestion.source_quiz_id || null,
      source_quiz_title: currentQuestion.sourceQuizTitle || currentQuestion.source_quiz_title || null,
      phase1_selected_option: currentAnalysis.phase1SelectedOption,
      phase1_confidence: currentAnalysis.phase1Confidence || '',
      phase1_reasoning: currentAnalysis.phase1Reasoning || '',
      phase1_completed: true,
      selectedOption: currentAnalysis.phase1SelectedOption,
      reformulation: currentAnalysis.reformulation || '',
      pivots: currentAnalysis.pivots || '',
      anticipatedErrors: currentAnalysis.anticipatedErrors || '',
      predictedAnswer: currentAnalysis.predictedAnswer || '',
      justification: currentAnalysis.justification || '',
      phase2_completed: true,
      user_email: user?.email || null,
      learner_id: user?.learner_id || null
    };

    await saveAnalysisMutation.mutateAsync(payload);
    updateCurrentAnalysis('phase2Completed', true);
    toast.success('Fase 2 guardada');
  };

  const completeAssignment = async () => {
    if (!activeAssignment?.id) return;
    if (phaseProgress.phaseDone < activeQuestions.length) {
      toast.error('Completa la fase 2 en todas las preguntas antes de finalizar');
      return;
    }

    await updateAssignmentMutation.mutateAsync({
      id: activeAssignment.id,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString()
      }
    });

    toast.success('Sesión metacognitiva completada');
  };

  const adminAssignments = useMemo(() => assignments.slice(0, 8), [assignments]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Metacog</h1>
            <p className="text-gray-600">Respuesta rápida primero, análisis secuencial después.</p>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && pendingAssignments.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                <Bell className="h-3.5 w-3.5 mr-1" />
                {pendingAssignments.length} pendiente(s)
              </Badge>
            )}
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver a Kognocore
              </Button>
            </Link>
          </div>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="catalogo" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="catalogo">Banco</TabsTrigger>
              <TabsTrigger value="subida">Subir JSON</TabsTrigger>
              <TabsTrigger value="ejecucion">Sesiones y Asignación</TabsTrigger>
            </TabsList>

            <TabsContent value="catalogo">
              <Card className={COMPONENT_STYLE}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5 text-indigo-700" />
                    Selección de quizzes para banco metacognitivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz) => (
                      <label key={quiz.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedQuizIds.includes(quiz.id)}
                          onChange={(e) => {
                            setSelectedQuizIds((prev) =>
                              e.target.checked ? [...prev, quiz.id] : prev.filter((id) => id !== quiz.id)
                            );
                          }}
                        />
                        <span className="line-clamp-2">{quiz.title || 'Quiz sin título'}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={addSelectedQuizzesToBank} className="gap-2 bg-indigo-700 hover:bg-indigo-800">
                      <Plus className="h-4 w-4" />
                      Agregar al banco
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">Preguntas en banco: <strong>{bank.length}</strong></p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subida">
              <Card className={COMPONENT_STYLE}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileUp className="h-5 w-5 text-cyan-700" />
                    Subir preguntas por JSON
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label htmlFor="metacog-json">Archivo JSON compatible</Label>
                  <Input
                    id="metacog-json"
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadJson(file);
                      e.target.value = '';
                    }}
                  />
                  <p className="text-xs text-slate-500">Acepta <code>{'{ quiz: [...] }'}</code> o array directo de preguntas.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ejecucion">
              <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                <Card className={COMPONENT_STYLE}>
                  <CardHeader>
                    <CardTitle className="text-lg">Crear sesión y asignar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre de sesión</Label>
                      <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Ej: Metacog Semana 3" />
                      <Label>Código</Label>
                      <Input value={sessionCode} onChange={(e) => setSessionCode(e.target.value.toUpperCase())} placeholder="Ej: META03" />
                    </div>

                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                      {bank.map((q) => (
                        <label key={q.id} className="flex items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={(e) => {
                              setSelectedQuestionIds((prev) =>
                                e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id)
                              );
                            }}
                          />
                          <span className="line-clamp-2">{q.text}</span>
                        </label>
                      ))}
                    </div>

                    <Button onClick={createSession} className="w-full gap-2 bg-slate-900 hover:bg-slate-800">
                      <Save className="h-4 w-4" />
                      Guardar sesión
                    </Button>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                      <Label>Asignar sesión a estudiante</Label>
                      <select
                        value={assignSessionId}
                        onChange={(e) => setAssignSessionId(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                      >
                        <option value="">Selecciona sesión</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                      <select
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                      >
                        <option value="">Selecciona estudiante</option>
                        {studentUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {(u.full_name || u.username || u.email)}{u.learner_id ? ` · ${u.learner_id}` : ''}
                          </option>
                        ))}
                      </select>
                      <Button onClick={assignSessionToStudent} className="w-full gap-2 bg-indigo-700 hover:bg-indigo-800">
                        <Send className="h-4 w-4" />
                        Asignar sesión
                      </Button>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Sesiones creadas</p>
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                          <button
                            onClick={() => { setActiveSessionId(session.id); setQIndex(0); }}
                            className="text-left"
                          >
                            <p className="text-sm font-semibold text-slate-900">{session.name}</p>
                            <p className="text-xs text-slate-500">{session.code} · {(session.questionIds || []).length} preguntas</p>
                          </button>
                          <button
                            onClick={() => deleteSessionMutation.mutate(session.id)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className={COMPONENT_STYLE}>
                  <CardHeader>
                    <CardTitle className="text-lg">Asignaciones recientes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {adminAssignments.length === 0 ? (
                      <p className="text-sm text-slate-500">Aún no hay asignaciones.</p>
                    ) : (
                      adminAssignments.map((a) => (
                        <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900">{a.session_name || a.session_code}</p>
                            <Badge variant="outline">{a.status || 'pending'}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{a.assigned_to_name || a.assigned_to_email || a.assigned_to_learner_id}</p>
                          <p className="text-xs text-slate-500">{a.question_count || 0} preguntas</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            <Card className={COMPONENT_STYLE}>
              <CardHeader>
                <CardTitle className="text-lg">Sesiones pendientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingAssignments.length === 0 && (
                  <p className="text-sm text-slate-500">No tienes sesiones metacognitivas pendientes.</p>
                )}
                {pendingAssignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() => {
                      setActiveAssignmentId(assignment.id);
                      setQIndex(0);
                      setPhaseTab('fast');
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      activeAssignmentId === assignment.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{assignment.session_name || assignment.session_code}</p>
                      <Badge className={assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                        {assignment.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{assignment.question_count || 0} preguntas</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className={COMPONENT_STYLE}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-indigo-700" />
                  Flujo metacognitivo por fases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!currentQuestion ? (
                  <p className="text-sm text-slate-500">Selecciona una sesión pendiente para comenzar.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Pregunta {qIndex + 1} / {activeQuestions.length}</Badge>
                        <Badge variant="outline">Fase 1: {phaseProgress.quickDone}/{activeQuestions.length}</Badge>
                        <Badge variant="outline">Fase 2: {phaseProgress.phaseDone}/{activeQuestions.length}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={qIndex === 0} onClick={() => setQIndex((v) => Math.max(0, v - 1))}>Anterior</Button>
                        <Button variant="outline" size="sm" disabled={qIndex >= activeQuestions.length - 1} onClick={() => setQIndex((v) => Math.min(activeQuestions.length - 1, v + 1))}>Siguiente</Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-semibold text-slate-900">{currentQuestion.text}</p>
                    </div>

                    <Tabs value={phaseTab} onValueChange={setPhaseTab} className="space-y-3">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="fast">1. Respuesta rápida</TabsTrigger>
                        <TabsTrigger value="analysis" disabled={!currentAnalysis?.phase1SelectedOption}>2. Análisis secuencial</TabsTrigger>
                      </TabsList>

                      <TabsContent value="fast" className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          {currentQuestion.options.map((opt, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isSelected = currentAnalysis?.phase1SelectedOption === letter;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => updateCurrentAnalysis('phase1SelectedOption', letter)}
                                className={`rounded-xl border p-3 text-left transition ${
                                  isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <p className="text-xs font-semibold text-indigo-700 mb-1">{letter}</p>
                                <p className="text-sm text-slate-800">{opt.text}</p>
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Confianza (0-100)</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={currentAnalysis?.phase1Confidence || ''}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/[^0-9]/g, '');
                                if (cleaned === '') return updateCurrentAnalysis('phase1Confidence', '');
                                const clamped = Math.max(0, Math.min(100, Number(cleaned)));
                                updateCurrentAnalysis('phase1Confidence', String(clamped));
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Razón rápida (opcional)</Label>
                            <Input
                              value={currentAnalysis?.phase1Reasoning || ''}
                              onChange={(e) => updateCurrentAnalysis('phase1Reasoning', e.target.value)}
                            />
                          </div>
                        </div>

                        <Button onClick={saveFastPhase} className="gap-2 bg-indigo-700 hover:bg-indigo-800">
                          <Save className="h-4 w-4" />
                          Guardar fase 1
                        </Button>
                      </TabsContent>

                      <TabsContent value="analysis" className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Reformulación</Label>
                            <Textarea value={currentAnalysis?.reformulation || ''} onChange={(e) => updateCurrentAnalysis('reformulation', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label>Pivotes de datos</Label>
                            <Textarea value={currentAnalysis?.pivots || ''} onChange={(e) => updateCurrentAnalysis('pivots', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label>Errores anticipados</Label>
                            <Textarea value={currentAnalysis?.anticipatedErrors || ''} onChange={(e) => updateCurrentAnalysis('anticipatedErrors', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label>Respuesta predicha</Label>
                            <Input value={currentAnalysis?.predictedAnswer || ''} onChange={(e) => updateCurrentAnalysis('predictedAnswer', e.target.value)} />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label>Justificación detallada</Label>
                            <Textarea value={currentAnalysis?.justification || ''} onChange={(e) => updateCurrentAnalysis('justification', e.target.value)} />
                          </div>
                        </div>

                        <Button onClick={saveAnalysisPhase} className="gap-2 bg-slate-900 hover:bg-slate-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Guardar fase 2
                        </Button>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end">
                      <Button
                        onClick={completeAssignment}
                        disabled={!activeAssignment || phaseProgress.phaseDone < activeQuestions.length}
                        className="gap-2 bg-emerald-700 hover:bg-emerald-800"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Finalizar sesión
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
