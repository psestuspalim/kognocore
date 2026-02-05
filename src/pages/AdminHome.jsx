import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, FileJson, Activity, LayoutDashboard } from 'lucide-react';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminKpiCard from '../components/admin/AdminKpiCard';
import AdminDashboardCard from '../components/admin/AdminDashboardCard';
import { motion } from 'framer-motion';

export default function AdminHome() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('order')
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list('-created_date', 100)
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('order'),
    enabled: currentUser?.role === 'admin'
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: () => base44.entities.CourseEnrollment.filter({ status: 'pending' }),
    enabled: currentUser?.role === 'admin'
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: async () => {
      const allSessions = await base44.entities.QuizSession.filter({ is_active: true });
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    </AdminShell>
  );
}