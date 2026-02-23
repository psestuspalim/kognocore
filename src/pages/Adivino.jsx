import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

const COMPONENTS = [
  { key: 'ponderacion_maestro', label: 'Ponderación maestro' },
  { key: 'ponderacion_trabajos', label: 'Ponderación trabajos' },
  { key: 'parcial_1', label: 'Parcial 1' },
  { key: 'parcial_2', label: 'Parcial 2' },
  { key: 'parcial_3', label: 'Parcial 3' },
  { key: 'parcial_4', label: 'Parcial 4' },
  { key: 'examen_final', label: 'Examen final' },
];

const baseComponents = () =>
  COMPONENTS.reduce((acc, comp) => {
    acc[comp.key] = { percentage: 0, grade: '' };
    return acc;
  }, {});

const emptySubject = () => ({
  id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  grupo: '',
  source_subject_id: null,
  course_id: null,
  minimum_passing_grade: 7,
  components: baseComponents(),
});

const storageKeyFor = (user) => {
  const identity = user?.learner_id || user?.email || 'guest';
  return `kognocore_adivino_${identity}`;
};

const loadSubjects = (user) => {
  try {
    const raw = localStorage.getItem(storageKeyFor(user));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
};

const saveSubjects = (user, subjects) => {
  localStorage.setItem(storageKeyFor(user), JSON.stringify(subjects));
};

const parseNum = (value) => {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? num : 0;
};

const sanitizeDecimalInput = (raw, { min, max, decimals = 2, allowEmpty = true }) => {
  const value = String(raw ?? '').replace(',', '.').trim();
  if (allowEmpty && value === '') return '';
  if (!/^\d*(\.\d*)?$/.test(value)) return null;
  if (value === '.') return '0.';

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;

  const parts = value.split('.');
  if (parts[1] && parts[1].length > decimals) return null;
  return value;
};

const normalizeBlurNumber = (raw, { min, max, decimals = 2, allowEmpty = true }) => {
  const value = String(raw ?? '').trim();
  if (allowEmpty && value === '') return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return allowEmpty ? '' : min.toFixed(decimals);
  const clamped = Math.max(min, Math.min(max, parsed));
  return clamped.toFixed(decimals);
};

export default function AdivinoPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState(() => loadSubjects(user));
  const [selectedId, setSelectedId] = useState(subjects[0]?.id || null);
  const [selectedCatalogSubjectId, setSelectedCatalogSubjectId] = useState('');

  useEffect(() => {
    const loaded = loadSubjects(user);
    setSubjects(loaded);
    setSelectedId(loaded[0]?.id || null);
  }, [user?.learner_id, user?.email]);

  const { data: enrolledSubjects = [] } = useQuery({
    queryKey: ['adivino-enrolled-subjects', user?.role, user?.email, user?.courseId],
    queryFn: async () => {
      const allSubjects = await client.entities.Subject.list('order');
      if (user?.role === 'admin') return allSubjects;

      const enrollments = await client.entities.CourseEnrollment.filter({
        user_email: user?.email,
        status: 'approved'
      });

      const allowedCourseIds = new Set((enrollments || []).map((e) => String(e.course_id)));
      if (user?.courseId) allowedCourseIds.add(String(user.courseId));

      return allSubjects.filter((s) => s?.course_id && allowedCourseIds.has(String(s.course_id)));
    },
    enabled: !!user
  });

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedId) || null,
    [subjects, selectedId]
  );

  const updateSubject = (patcher) => {
    if (!selectedSubject) return;
    const updated = subjects.map((s) => (s.id === selectedSubject.id ? patcher(s) : s));
    setSubjects(updated);
    saveSubjects(user, updated);
  };

  const addSubject = () => {
    const created = emptySubject();
    const updated = [created, ...subjects];
    setSubjects(updated);
    setSelectedId(created.id);
    saveSubjects(user, updated);
  };

  const addSubjectFromEnrollment = () => {
    if (!selectedCatalogSubjectId) return;
    const selectedCatalog = enrolledSubjects.find((s) => String(s.id) === String(selectedCatalogSubjectId));
    if (!selectedCatalog) return;

    const existing = subjects.find((s) => String(s.source_subject_id) === String(selectedCatalog.id));
    if (existing) {
      setSelectedId(existing.id);
      return;
    }

    const created = {
      ...emptySubject(),
      name: selectedCatalog.name || '',
      source_subject_id: selectedCatalog.id,
      course_id: selectedCatalog.course_id || null
    };

    const updated = [created, ...subjects];
    setSubjects(updated);
    setSelectedId(created.id);
    saveSubjects(user, updated);
  };

  const removeSubject = (id) => {
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    if (selectedId === id) {
      setSelectedId(updated[0]?.id || null);
    }
    saveSubjects(user, updated);
  };

  const stats = useMemo(() => {
    if (!selectedSubject) {
      return {
        currentGrade: 0,
        evaluatedPct: 0,
        pendingPct: 0,
        requiredAverage: 0,
      };
    }

    const rows = COMPONENTS.map((c) => selectedSubject.components?.[c.key] || { percentage: 0, grade: '' });
    const currentGrade = rows.reduce((sum, row) => {
      const pct = parseNum(row.percentage);
      const grade = row.grade === '' ? null : parseNum(row.grade);
      if (grade === null) return sum;
      return sum + (grade * pct) / 100;
    }, 0);

    const evaluatedPct = rows.reduce((sum, row) => sum + (row.grade === '' ? 0 : parseNum(row.percentage)), 0);
    const pendingPct = Math.max(0, 100 - evaluatedPct);
    const requiredAverage =
      pendingPct > 0
        ? ((selectedSubject.minimum_passing_grade - currentGrade) * 100) / pendingPct
        : 0;

    return { currentGrade, evaluatedPct, pendingPct, requiredAverage };
  }, [selectedSubject]);

  const risk = useMemo(() => {
    if (!selectedSubject) return { label: 'Sin datos', tone: 'bg-slate-100 text-slate-700' };
    if (stats.currentGrade >= selectedSubject.minimum_passing_grade) return { label: 'Bajo riesgo', tone: 'bg-emerald-100 text-emerald-700' };
    if (stats.requiredAverage > 10) return { label: 'No alcanzable', tone: 'bg-rose-100 text-rose-700' };
    if (stats.requiredAverage > 8) return { label: 'Riesgo alto', tone: 'bg-orange-100 text-orange-700' };
    return { label: 'Riesgo moderado', tone: 'bg-amber-100 text-amber-700' };
  }, [selectedSubject, stats]);

  const persistCurrent = () => {
    saveSubjects(user, subjects);
  };

  const handleSelectAll = (e) => {
    e.target.select();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Adivino</h1>
            <p className="text-sm text-slate-600">Módulo aislado de diagnóstico y simulación por materia.</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver a Kognocore
              </Button>
            </Link>
            <Button onClick={addSubject} className="gap-2 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              Nueva materia
            </Button>
          </div>
        </div>

        <Card className="border-white/70 bg-white/85">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-1.5">
                <Label>Agregar materia desde tus inscripciones</Label>
                <select
                  value={selectedCatalogSubjectId}
                  onChange={(e) => setSelectedCatalogSubjectId(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Selecciona una materia inscrita</option>
                  {enrolledSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={addSubjectFromEnrollment}
                disabled={!selectedCatalogSubjectId}
                className="gap-2 bg-cyan-700 hover:bg-cyan-800"
              >
                <Plus className="h-4 w-4" />
                Agregar desde inscripción
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle className="text-lg">Materias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subjects.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  No hay materias creadas aún.
                </p>
              )}
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => {
                    setSelectedId(subject.id);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === subject.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{subject.name || 'Materia sin nombre'}</p>
                      <p className="text-xs text-slate-500">{subject.grupo ? `Grupo ${subject.grupo}` : 'Sin grupo'}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSubject(subject.id);
                      }}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90">
            {!selectedSubject ? (
              <CardContent className="p-8 text-center text-slate-500">
                Crea o selecciona una materia para usar Adivino.
              </CardContent>
            ) : (
              <>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl">Configuración de diagnóstico</CardTitle>
                  <Badge className={risk.tone}>{risk.label}</Badge>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Materia</Label>
                      <Input
                        value={selectedSubject.name}
                        onChange={(e) => updateSubject((s) => ({ ...s, name: e.target.value }))}
                        placeholder="Ej: Fisiología I"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Grupo</Label>
                      <Input
                        value={selectedSubject.grupo}
                        onChange={(e) => updateSubject((s) => ({ ...s, grupo: e.target.value }))}
                        placeholder="Ej: 3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mínima aprobatoria</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={selectedSubject.minimum_passing_grade}
                        onFocus={handleSelectAll}
                        onChange={(e) => {
                          const next = sanitizeDecimalInput(e.target.value, { min: 0, max: 10, decimals: 2, allowEmpty: false });
                          if (next === null) return;
                          updateSubject((s) => ({ ...s, minimum_passing_grade: next }));
                        }}
                        onBlur={(e) => {
                          const fixed = normalizeBlurNumber(e.target.value, { min: 0, max: 10, decimals: 2, allowEmpty: false });
                          updateSubject((s) => ({ ...s, minimum_passing_grade: fixed }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200">
                    <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <span>Componente</span>
                      <span>%</span>
                      <span>Nota</span>
                    </div>
                    <div className="divide-y">
                      {COMPONENTS.map((component) => {
                        const row = selectedSubject.components?.[component.key] || { percentage: 0, grade: '' };
                        return (
                          <div key={component.key} className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-2 px-3 py-2">
                            <div className="text-sm text-slate-800">{component.label}</div>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={row.percentage}
                              onFocus={handleSelectAll}
                              onChange={(e) => {
                                const next = sanitizeDecimalInput(e.target.value, { min: 0, max: 100, decimals: 2, allowEmpty: false });
                                if (next === null) return;
                                updateSubject((s) => ({
                                  ...s,
                                  components: {
                                    ...s.components,
                                    [component.key]: {
                                      ...s.components[component.key],
                                      percentage: next,
                                    },
                                  },
                                }));
                              }}
                              onBlur={(e) => {
                                const fixed = normalizeBlurNumber(e.target.value, { min: 0, max: 100, decimals: 2, allowEmpty: false });
                                updateSubject((s) => ({
                                  ...s,
                                  components: {
                                    ...s.components,
                                    [component.key]: {
                                      ...s.components[component.key],
                                      percentage: fixed,
                                    },
                                  },
                                }));
                              }}
                            />
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={row.grade}
                              onFocus={handleSelectAll}
                              onChange={(e) => {
                                const next = sanitizeDecimalInput(e.target.value, { min: 0, max: 10, decimals: 2, allowEmpty: true });
                                if (next === null) return;
                                updateSubject((s) => ({
                                  ...s,
                                  components: {
                                    ...s.components,
                                    [component.key]: {
                                      ...s.components[component.key],
                                      grade: next,
                                    },
                                  },
                                }));
                              }}
                              onBlur={(e) => {
                                const fixed = normalizeBlurNumber(e.target.value, { min: 0, max: 10, decimals: 2, allowEmpty: true });
                                updateSubject((s) => ({
                                  ...s,
                                  components: {
                                    ...s.components,
                                    [component.key]: {
                                      ...s.components[component.key],
                                      grade: fixed,
                                    },
                                  },
                                }));
                              }}
                              placeholder="-"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <Card className="bg-slate-50">
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-500">Calificación actual</p>
                        <p className="text-xl font-bold text-slate-900">{stats.currentGrade.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-500">% evaluado</p>
                        <p className="text-xl font-bold text-slate-900">{stats.evaluatedPct.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-500">% pendiente</p>
                        <p className="text-xl font-bold text-slate-900">{stats.pendingPct.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-500">Promedio requerido</p>
                        <p className="text-xl font-bold text-slate-900">{stats.requiredAverage.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button className="gap-2 bg-cyan-700 hover:bg-cyan-800" onClick={persistCurrent}>
                      <Save className="h-4 w-4" />
                      Guardar
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
