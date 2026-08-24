import { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, FileJson, Wrench, FileDown, Settings, LayoutDashboard, Activity } from 'lucide-react';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminKpiCard from '../components/admin/AdminKpiCard';
import AdminDashboardCard from '../components/admin/AdminDashboardCard';
import { motion } from 'framer-motion';
import QuizExporter from '../components/admin/QuizExporter';
import MaintenanceToolsModal from '../components/admin/MaintenanceToolsModal';
import GlobalSettingsModal from '../components/admin/GlobalSettingsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminHome() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showQuizExporter, setShowQuizExporter] = useState(false);
  const [showMaintenanceTools, setShowMaintenanceTools] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await client.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => client.entities.Course.list('order')
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['all-folders'],
    queryFn: () => client.entities.Folder.list()
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => client.entities.Subject.list('order'),
    enabled: currentUser?.role === 'admin'
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => client.entities.Quiz.list('-created_date', 100)
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => client.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['admin-home-attempts'],
    queryFn: () => client.entities.QuizAttempt.list('-created_date', 5000),
    enabled: currentUser?.role === 'admin'
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: () => client.entities.CourseEnrollment.filter({ status: 'pending' }),
    enabled: currentUser?.role === 'admin'
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: async () => {
      const allSessions = await client.entities.QuizSession.filter({ is_active: true });
      return allSessions.slice(0, 5);
    },
    enabled: currentUser?.role === 'admin',
    refetchInterval: 5000
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  // Calculate stats for dashboard cards
  const contentStats = [
    { label: 'Cursos', value: courses.length },
    { label: 'Materias', value: subjects.length },
    { label: 'Carpetas', value: folders.length },
    { label: 'Quizzes', value: quizzes.length }
  ];

  const uniqueStudentKeys = new Set();
  allUsers.filter((u) => u.role === 'user').forEach((u) => {
    if (u.learner_id) uniqueStudentKeys.add(`lid:${u.learner_id}`);
    else if (u.email) uniqueStudentKeys.add(`email:${u.email}`);
  });
  attempts.forEach((a) => {
    if (a.learner_id) uniqueStudentKeys.add(`lid:${a.learner_id}`);
    else if (a.user_email) uniqueStudentKeys.add(`email:${a.user_email}`);
  });
  const totalStudents = uniqueStudentKeys.size;

  const studentStats = [
    { label: 'Total', value: totalStudents },
    { label: 'Admins', value: allUsers.filter(u => u.role === 'admin').length },
    { label: 'Solicitudes', value: enrollments.length },
    { label: 'Activos', value: sessions.length }
  ];

  const quizStats = [
    { label: 'Total Quizzes', value: quizzes.length },
    { label: 'Preguntas', value: quizzes.reduce((acc, q) => acc + (q.total_questions || q.questions?.length || 0), 0) },
    { label: 'Visibles', value: quizzes.filter(q => !q.is_hidden).length },
    { label: 'Ocultos', value: quizzes.filter(q => q.is_hidden).length }
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={`Bienvenido, ${currentUser.full_name || currentUser.email}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminKpiCard
          icon={BookOpen}
          label="Cursos"
          value={courses.length}
        />
        <AdminKpiCard
          icon={Users}
          label="Estudiantes"
          value={totalStudents}
        />
        <AdminKpiCard
          icon={FileJson}
          label="Quizzes"
          value={quizzes.length}
        />
        <AdminKpiCard
          icon={Activity}
          label="Sesiones Activas"
          value={sessions.length}
        />
      </div>

      <Card className="mb-8 border-white/70 bg-white/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">Ruta rápida de operación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link to={createPageUrl('AdminProgress')} className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 hover:shadow-md transition-shadow">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Seguimiento</p>
              <p className="mt-1 text-base font-semibold text-slate-900">Progreso y reportes PDF</p>
            </Link>
            <Link to={createPageUrl('AdminStudents')} className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 hover:shadow-md transition-shadow">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Usuarios</p>
              <p className="mt-1 text-base font-semibold text-slate-900">Ver estudiantes e intentos</p>
            </Link>
            <Link to={createPageUrl('AdminContent')} className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 hover:shadow-md transition-shadow">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Contenido</p>
              <p className="mt-1 text-base font-semibold text-slate-900">Gestionar cursos y estructura</p>
            </Link>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            Flujo recomendado: estructura el contenido en <strong>Cursos → Materias → Carpetas → Quizzes</strong>, luego revisa actividad en <strong>Progreso</strong>.
          </div>
        </CardContent>
      </Card>

      {/* Main Feature Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AdminDashboardCard
            title="Contenido"
            description="Cursos, materias, carpetas y quizzes"
            count={courses.length + subjects.length + folders.length + quizzes.length}
            stats={contentStats}
            variant="stats"
            primaryActionLabel="Gestionar"
            primaryActionTo="AdminContent"
            icon={BookOpen}
            iconColor="text-blue-600"
            countColor="text-blue-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <AdminDashboardCard
            title="Estudiantes"
            description="Usuarios, solicitudes y actividad"
            count={totalStudents}
            stats={studentStats}
            variant="stats"
            primaryActionLabel="Ver estudiantes"
            primaryActionTo="AdminStudents"
            icon={Users}
            iconColor="text-green-600"
            countColor="text-green-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <AdminDashboardCard
            title="JSON Manager"
            description="Importar, validar y convertir JSON"
            count={quizzes.length}
            stats={quizStats}
            variant="stats"
            primaryActionLabel="Administrar JSON"
            primaryActionTo="AdminJsonManager"
            icon={FileJson}
            iconColor="text-purple-600"
            countColor="text-purple-600"
          />
        </motion.div>
      </div>

      {/* Maintenance Tools Section */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-slate-500" />
          Herramientas de Mantenimiento y Gestión
        </h2>
        <div className="surface-panel p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-white/80 bg-white/75 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
              onClick={() => setShowQuizExporter(true)}
            >
              <FileDown className="w-6 h-6" />
              <span className="font-semibold">Exportar Quizzes</span>
              <span className="text-xs text-slate-500 font-normal">Descargar JSON organizados</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-white/80 bg-white/75 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all"
              onClick={() => setShowMaintenanceTools(true)}
            >
              <Settings className="w-6 h-6" />
              <span className="font-semibold">Herramientas de Reparación</span>
              <span className="text-xs text-slate-500 font-normal">Limpieza y mantenimiento</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-white/80 bg-white/75 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
              onClick={() => setShowGlobalSettings(true)}
            >
              <Wrench className="w-6 h-6" />
              <span className="font-semibold">Configuración Global</span>
              <span className="text-xs text-slate-500 font-normal">Vars. del Sistema (Tutor IA)</span>
            </Button>
          </div>

          <p className="text-sm text-slate-600 mt-4 bg-cyan-50/80 p-3 rounded-lg border border-cyan-100 flex items-start gap-2">
            <Wrench className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>Las herramientas de reparación están protegidas con confirmaciones adicionales para prevenir cambios accidentales.</span>
          </p>
        </div>
      </div>

      {/* Quiz Exporter Modal */}
      <Dialog open={showQuizExporter} onOpenChange={setShowQuizExporter}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exportar Quizzes</DialogTitle>
          </DialogHeader>
          <QuizExporter onClose={() => setShowQuizExporter(false)} />
        </DialogContent>
      </Dialog>

      {/* Maintenance Tools Modal */}
      <MaintenanceToolsModal
        open={showMaintenanceTools}
        onOpenChange={setShowMaintenanceTools}
      />

      {/* Global Settings Modal */}
      <GlobalSettingsModal
        open={showGlobalSettings}
        onOpenChange={setShowGlobalSettings}
      />
    </AdminShell>
  );
}
