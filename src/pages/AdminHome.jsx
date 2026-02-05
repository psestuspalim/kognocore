import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Users, FileJson, Activity, LayoutDashboard, Wrench, FileDown, Layers } from 'lucide-react';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminKpiCard from '../components/admin/AdminKpiCard';
import AdminDashboardCard from '../components/admin/AdminDashboardCard';
import { motion } from 'framer-motion';
import FixQuizzesButton from '../components/admin/FixQuizzesButton';
import RemoveDuplicatesButton from '../components/admin/RemoveDuplicatesButton';
import RemoveDuplicateQuestionsButton from '../components/admin/RemoveDuplicateQuestionsButton';
import GenerateStructureButton from '../components/admin/GenerateStructureButton';
import ContentManager from '../components/admin/ContentManager';
import QuizExporter from '../components/admin/QuizExporter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminHome() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showContentManager, setShowContentManager] = useState(false);
  const [showQuizExporter, setShowQuizExporter] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await client.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const queryClient = useQueryClient();
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

  // Mutations for ContentManager
  const deleteCourseMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => client.entities.Course.delete(id))),
    onSuccess: () => queryClient.invalidateQueries(['courses'])
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => client.entities.Folder.delete(id))),
    onSuccess: () => queryClient.invalidateQueries(['all-folders'])
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => client.entities.Subject.delete(id))),
    onSuccess: () => queryClient.invalidateQueries(['subjects'])
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Course.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['courses'])
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Folder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['all-folders'])
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Subject.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['subjects'])
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const recentCourses = courses.slice(0, 5).map(c => ({
    primary: c.name,
    secondary: c.description,
    badge: `${c.icon || '📚'}`
  }));

  const recentStudents = allUsers
    .filter(u => u.role === 'user')
    .slice(0, 5)
    .map(u => ({
      primary: u.username || u.full_name || u.email,
      secondary: u.email,
      badge: u.role
    }));

  const jsonStats = quizzes.slice(0, 5).map(q => ({
    primary: q.title,
    secondary: `${q.total_questions || q.questions?.length || 0} preguntas`,
    badge: q.subject_id ? '📚' : '📄'
  }));

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
          value={allUsers.filter(u => u.role === 'user').length}
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

      {/* Main Feature Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AdminDashboardCard
            title="Contenido"
            description="Gestiona cursos, materias y quizzes"
            count={courses.length + subjects.length}
            items={recentCourses}
            primaryActionLabel="Gestionar contenido"
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
            description="Ver perfil y progreso"
            count={allUsers.filter(u => u.role === 'user').length}
            items={recentStudents}
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
            description="Gestionar archivos JSON"
            count={quizzes.length}
            items={jsonStats}
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
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-gray-500" />
          Herramientas de Mantenimiento y Gestión
        </h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all" onClick={() => setShowContentManager(true)}>
              <Layers className="w-6 h-6" />
              <span className="font-semibold">Gestor de Contenido</span>
              <span className="text-xs text-gray-500 font-normal">Organizar estructura</span>
            </Button>

            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all" onClick={() => setShowQuizExporter(true)}>
              <FileDown className="w-6 h-6" />
              <span className="font-semibold">Exportar Quizzes</span>
              <span className="text-xs text-gray-500 font-normal">Descargar JSON</span>
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Acciones Destructivas / Reparación</h3>
            <div className="flex flex-wrap gap-4">
              <GenerateStructureButton />
              <RemoveDuplicatesButton />
              <RemoveDuplicateQuestionsButton />
              <FixQuizzesButton />
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex items-start gap-2">
            <Wrench className="w-4 h-4 text-yellow-600 mt-0.5" />
            <span>Utiliza las herramientas de reparación con precaución. Algunas acciones son irreversibles y afectarán a la estructura de la base de datos.</span>
          </p>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={showContentManager} onOpenChange={setShowContentManager}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestor de Contenido</DialogTitle>
          </DialogHeader>
          <ContentManager
            courses={courses}
            folders={folders}
            subjects={subjects}
            quizzes={quizzes}
            onDeleteCourses={(ids) => deleteCourseMutation.mutateAsync(ids)}
            onDeleteFolders={(ids) => deleteFolderMutation.mutateAsync(ids)}
            onDeleteSubjects={(ids) => deleteSubjectMutation.mutateAsync(ids)}
            onUpdateCourse={(id, data) => updateCourseMutation.mutateAsync({ id, data })}
            onUpdateFolder={(id, data) => updateFolderMutation.mutateAsync({ id, data })}
            onUpdateSubject={(id, data) => updateSubjectMutation.mutateAsync({ id, data })}
            onClose={() => setShowContentManager(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQuizExporter} onOpenChange={setShowQuizExporter}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exportar Quizzes</DialogTitle>
          </DialogHeader>
          <QuizExporter onClose={() => setShowQuizExporter(false)} />
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}