import { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { getAuthorizationHeaders } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Search, ChevronRight, Mail, Clock, BookOpen, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import { toast } from 'sonner';

export default function AdminStudents() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await client.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => client.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin-students-enrollments'],
    queryFn: () => client.entities.CourseEnrollment.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['admin-students-attempts'],
    queryFn: () => client.entities.QuizAttempt.list('-created_date', 5000),
    enabled: currentUser?.role === 'admin'
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const usersByKey = new Map();

  // 1. All non-admin users
  allUsers
    .filter((u) => u.role !== 'admin' && !u.is_admin)
    .forEach((u) => {
      const key = u.learner_id ? `lid:${u.learner_id}` : (u.email ? `email:${u.email}` : `user:${u.id}`);
      usersByKey.set(key, {
        ...u,
        key,
        id: u.id || `user:${key}`,
        role: u.role || 'user',
        learner_id: u.learner_id || null,
        email: u.email || null,
        username: u.username || u.full_name || 'Estudiante',
        full_name: u.full_name || u.username || 'Estudiante'
      });
    });

  // 2. Course Enrollments
  enrollments.forEach((e) => {
    const key = e.learner_id ? `lid:${e.learner_id}` : (e.user_email ? `email:${e.user_email}` : null);
    if (!key) return;
    if (!usersByKey.has(key)) {
      usersByKey.set(key, {
        id: `enrollment:${key}`,
        key,
        role: 'user',
        learner_id: e.learner_id || null,
        email: e.user_email || null,
        username: e.username || 'Estudiante',
        full_name: e.username || 'Estudiante',
        created_date: e.created_date,
        course_name: e.course_name,
        access_code: e.access_code
      });
    } else {
      const existing = usersByKey.get(key);
      if (e.username && (!existing.username || existing.username === 'Estudiante' || existing.username === 'Usuario')) {
        existing.username = e.username;
        existing.full_name = e.username;
      }
      if (e.course_name && !existing.course_name) existing.course_name = e.course_name;
      if (e.access_code && !existing.access_code) existing.access_code = e.access_code;
    }
  });

  // 3. Quiz Attempts
  attempts.forEach((a) => {
    const key = a.learner_id ? `lid:${a.learner_id}` : (a.user_email ? `email:${a.user_email}` : null);
    if (!key) return;
    if (!usersByKey.has(key)) {
      usersByKey.set(key, {
        id: `virtual:${key}`,
        key,
        role: 'user',
        learner_id: a.learner_id || null,
        email: a.user_email || null,
        username: a.username || 'Estudiante',
        full_name: a.username || 'Estudiante',
        created_date: a.created_date
      });
    } else {
      const existing = usersByKey.get(key);
      if (a.username && (!existing.username || existing.username === 'Estudiante' || existing.username === 'Usuario')) {
        existing.username = a.username;
        existing.full_name = a.username;
      }
      if (!existing.created_date && a.created_date) {
        existing.created_date = a.created_date;
      }
    }
  });

  const students = Array.from(usersByKey.values());

  const handleResetStudents = async () => {
    if (!window.confirm('¿Estás seguro? Se eliminarán TODAS las inscripciones de estudiantes. Esta acción no se puede deshacer.')) return;
    setIsResetting(true);
    try {
      // Clear remote enrollments
      try {
        await fetch('/api/enrollments?purge_all=true', {
          method: 'DELETE',
          headers: await getAuthorizationHeaders()
        });
      } catch (_err) {
        // remote may not be configured
      }
      // Clear local enrollments
      localStorage.removeItem('app_course_enrollments');
      queryClient.invalidateQueries(['admin-students-enrollments']);
      queryClient.invalidateQueries(['all-enrollments']);
      queryClient.invalidateQueries(['admin-shell-enrollments']);
      toast.success('Todas las inscripciones han sido eliminadas');
    } catch (_err) {
      toast.error('Error al resetear estudiantes');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const search = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(search) ||
      student.username?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search)
    );
  });

  return (
    <AdminShell>
      <AdminPageHeader
        icon={Users}
        title="Estudiantes"
        subtitle={`${filteredStudents.length} estudiantes registrados`}
        badge={<Badge variant="secondary">{filteredStudents.length}</Badge>}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetStudents}
              disabled={isResetting || filteredStudents.length === 0}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              {isResetting ? 'Eliminando...' : 'Resetear Estudiantes'}
            </Button>
          </div>
        }
      />

      {/* Students List */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron estudiantes
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay estudiantes registrados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map((student, idx) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
            >
              <Link
                to={createPageUrl(
                  `AdminStudentDetail?id=${encodeURIComponent(student.id)}&learner_id=${encodeURIComponent(student.learner_id || '')}&email=${encodeURIComponent(student.email || '')}`
                )}
              >
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg flex-shrink-0">
                          {(student.username || student.full_name || student.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">
                              {student.username || student.full_name || 'Sin nombre'}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {student.role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {student.course_name && (
                              <span className="flex items-center gap-1 truncate">
                                <BookOpen className="w-3 h-3" />
                                {student.course_name}
                              </span>
                            )}
                            {student.email && !student.email.includes('@kognocore.local') && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3" />
                                {student.email}
                              </span>
                            )}
                            {student.access_code && (
                              <span className="flex items-center gap-1 text-xs font-mono">
                                {student.access_code}
                              </span>
                            )}
                            {student.created_date && (
                              <span className="hidden sm:flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(student.created_date), { addSuffix: true, locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
