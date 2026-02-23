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
import { ArrowLeft, Brain, FileUp, Database, PlayCircle, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

export default function MetacogLabPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedQuizIds, setSelectedQuizIds] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [analysis, setAnalysis] = useState({});

  const { data: quizzes = [] } = useQuery({
    queryKey: ['metacog-lab-quizzes'],
    queryFn: () => client.entities.Quiz.list('-created_date')
  });

  const { data: bank = [] } = useQuery({
    queryKey: ['metacog-bank', user?.learner_id, user?.email, user?.role],
    queryFn: async () => {
      if (!user) return [];
      if (user.role === 'admin') return client.entities.MetacogQuestion.list('-created_date');
      const byLearner = user.learner_id
        ? await client.entities.MetacogQuestion.filter({ learner_id: user.learner_id }, '-created_date')
        : [];
      if (byLearner.length > 0) return byLearner;
      if (user.email) return client.entities.MetacogQuestion.filter({ user_email: user.email }, '-created_date');
      return [];
    },
    enabled: !!user
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['metacog-sessions', user?.learner_id, user?.email, user?.role],
    queryFn: async () => {
      if (!user) return [];
      if (user.role === 'admin') return client.entities.MetacogSession.list('-created_date');
      const byLearner = user.learner_id
        ? await client.entities.MetacogSession.filter({ learner_id: user.learner_id }, '-created_date')
        : [];
      if (byLearner.length > 0) return byLearner;
      if (user.email) return client.entities.MetacogSession.filter({ user_email: user.email }, '-created_date');
      return [];
    },
    enabled: !!user
  });

  const saveQuestionMutation = useMutation({
    mutationFn: (payload) => client.entities.MetacogQuestion.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-bank'] })
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id) => client.entities.MetacogSession.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-sessions'] })
  });

  const createSessionMutation = useMutation({
    mutationFn: (payload) => client.entities.MetacogSession.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metacog-sessions'] })
  });

  const saveAnalysisMutation = useMutation({
    mutationFn: async (payload) => {
      const criteria = {
        session_id: payload.session_id,
        question_id: payload.question_id,
        learner_id: payload.learner_id || null,
        user_email: payload.user_email || null
      };
      if (payload.quiz_attempt_id) criteria.quiz_attempt_id = payload.quiz_attempt_id;
      const existing = await client.entities.MetacogAnalysis.filter(criteria);
      if (existing.length > 0) {
        return client.entities.MetacogAnalysis.update(existing[0].id, payload);
      }
      return client.entities.MetacogAnalysis.create(payload);
    }
  });

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

    const existing = new Set(bank.map((q) => `${q.text}::${q.sourceQuizId || 'manual'}`));
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

        const existing = new Set(bank.map((q) => `${q.text}::${q.sourceQuizId || 'manual'}`));
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
        window.alert('JSON inválido o no compatible');
      }
    };
    reader.readAsText(file);
  };

  const createSession = async () => {
    if (!sessionName.trim() || !sessionCode.trim() || selectedQuestionIds.length === 0) return;
    await createSessionMutation.mutateAsync({
      name: sessionName.trim(),
      code: sessionCode.trim().toUpperCase(),
      questionIds: selectedQuestionIds,
      user_email: user?.email || null,
      learner_id: user?.learner_id || null,
      createdAt: Date.now()
    });
    setSessionName('');
    setSessionCode('');
    setSelectedQuestionIds([]);
    toast.success('Sesión metacognitiva creada');
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const activeQuestions = useMemo(
    () => (activeSession ? bank.filter((q) => activeSession.questionIds.includes(q.id)) : []),
    [activeSession, bank]
  );
  const currentQuestion = activeQuestions[qIndex] || null;

  const { data: sessionAnalyses = [] } = useQuery({
    queryKey: ['metacog-analyses', activeSessionId, user?.learner_id, user?.email],
    queryFn: async () => {
      if (!activeSessionId) return [];
      const criteria = { session_id: activeSessionId };
      if (user?.learner_id) {
        return client.entities.MetacogAnalysis.filter({ ...criteria, learner_id: user.learner_id }, '-created_date');
      }
      if (user?.email) {
        return client.entities.MetacogAnalysis.filter({ ...criteria, user_email: user.email }, '-created_date');
      }
      return client.entities.MetacogAnalysis.filter(criteria, '-created_date');
    },
    enabled: !!activeSessionId
  });

  useEffect(() => {
    const map = {};
    (sessionAnalyses || []).forEach((row) => {
      map[row.question_id] = {
        reformulation: row.reformulation || '',
        pivots: row.pivots || '',
        anticipatedErrors: row.anticipatedErrors || '',
        predictedAnswer: row.predictedAnswer || '',
        selectedOption: row.selectedOption || '',
        justification: row.justification || '',
        quizAttemptId: row.quiz_attempt_id || row.quizAttemptId || ''
      };
    });
    setAnalysis(map);
  }, [activeSessionId, sessionAnalyses]);

  const currentAnalysis = currentQuestion ? (analysis[currentQuestion.id] || {
    reformulation: '',
    pivots: '',
    anticipatedErrors: '',
    predictedAnswer: '',
    selectedOption: '',
    justification: '',
    quizAttemptId: ''
  }) : null;

  const updateCurrentAnalysis = (field, value) => {
    if (!currentQuestion) return;
    setAnalysis((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || {}),
        [field]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Metacog Lab</h1>
            <p className="text-sm text-slate-600">Rama aislada para personalizar, cargar y analizar quizzes sistemáticamente.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-100 text-indigo-700">Beta aislado</Badge>
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver a Kognocore
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="catalogo" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="catalogo">1. Catálogo</TabsTrigger>
            <TabsTrigger value="subida">2. Subir JSON</TabsTrigger>
            <TabsTrigger value="analisis">3. Análisis</TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo">
            <Card className="border-white/70 bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5 text-indigo-700" />
                  Personalizar quizzes a abordar
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
                    Agregar seleccionados al banco
                  </Button>
                </div>
                <p className="text-sm text-slate-600">Banco metacog actual: <strong>{bank.length}</strong> preguntas.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subida">
            <Card className="border-white/70 bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileUp className="h-5 w-5 text-cyan-700" />
                  Subir nuevos quizzes para análisis sistemático
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
                <p className="text-xs text-slate-500">Acepta `{`quiz:[...]`}` o array directo de preguntas.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analisis">
            <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
              <Card className="border-white/70 bg-white/90">
                <CardHeader>
                  <CardTitle className="text-lg">Sesiones de análisis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
                    <Label>Código</Label>
                    <Input value={sessionCode} onChange={(e) => setSessionCode(e.target.value.toUpperCase())} />
                  </div>
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
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

                  <div className="space-y-2 border-t pt-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                        <button onClick={() => { setActiveSessionId(session.id); setQIndex(0); }} className="text-left">
                          <p className="text-sm font-semibold text-slate-900">{session.name}</p>
                          <p className="text-xs text-slate-500">{session.code} · {session.questionIds.length} preguntas</p>
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

              <Card className="border-white/70 bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5 text-indigo-700" />
                    Análisis sistemático por pregunta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!currentQuestion ? (
                    <p className="text-sm text-slate-500">Selecciona una sesión para comenzar.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Pregunta {qIndex + 1} / {activeQuestions.length}</Badge>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={qIndex === 0} onClick={() => setQIndex((v) => Math.max(0, v - 1))}>
                            Anterior
                          </Button>
                          <Button variant="outline" size="sm" disabled={qIndex >= activeQuestions.length - 1} onClick={() => setQIndex((v) => Math.min(activeQuestions.length - 1, v + 1))}>
                            Siguiente
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="font-semibold text-slate-900">{currentQuestion.text}</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {currentQuestion.options.map((opt, idx) => (
                            <li key={opt.id}>
                              {String.fromCharCode(65 + idx)}. {opt.text}
                            </li>
                          ))}
                        </ul>
                      </div>

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
                        <div className="space-y-1">
                          <Label>Opción seleccionada (A/B/C...)</Label>
                          <Input value={currentAnalysis?.selectedOption || ''} onChange={(e) => updateCurrentAnalysis('selectedOption', e.target.value.toUpperCase())} />
                        </div>
                        <div className="space-y-1">
                          <Label>ID de intento (opcional)</Label>
                          <Input value={currentAnalysis?.quizAttemptId || ''} onChange={(e) => updateCurrentAnalysis('quizAttemptId', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Justificación</Label>
                          <Textarea value={currentAnalysis?.justification || ''} onChange={(e) => updateCurrentAnalysis('justification', e.target.value)} />
                        </div>
                      </div>

                      <Button
                        onClick={async () => {
                          if (!activeSession || !currentQuestion || !currentAnalysis) return;
                          await saveAnalysisMutation.mutateAsync({
                            session_id: activeSession.id,
                            session_code: activeSession.code,
                            session_name: activeSession.name,
                            question_id: currentQuestion.id,
                            question_text: currentQuestion.text,
                            source_quiz_id: currentQuestion.sourceQuizId || currentQuestion.source_quiz_id || null,
                            source_quiz_title: currentQuestion.sourceQuizTitle || currentQuestion.source_quiz_title || null,
                            reformulation: currentAnalysis.reformulation || '',
                            pivots: currentAnalysis.pivots || '',
                            anticipatedErrors: currentAnalysis.anticipatedErrors || '',
                            predictedAnswer: currentAnalysis.predictedAnswer || '',
                            selectedOption: currentAnalysis.selectedOption || '',
                            justification: currentAnalysis.justification || '',
                            quiz_attempt_id: currentAnalysis.quizAttemptId?.trim() || null,
                            user_email: user?.email || null,
                            learner_id: user?.learner_id || null
                          });
                          toast.success('Análisis guardado y asociado al estudiante');
                        }}
                        className="gap-2 bg-indigo-700 hover:bg-indigo-800"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Guardar análisis sistemático
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
