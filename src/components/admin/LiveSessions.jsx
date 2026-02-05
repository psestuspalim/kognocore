import React, { useEffect, useState } from 'react';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, User, BookOpen, Clock, CheckCircle2, XCircle, TrendingUp, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';

export default function LiveSessions() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await client.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['quiz-sessions'],
    queryFn: async () => {
      try {
        const allSessions = await client.entities.QuizSession.filter({ is_active: true }, '-last_activity');
        console.log('📡 Sesiones encontradas:', allSessions);
        // Filtrar sesiones activas en los últimos 10 minutos
        const now = new Date();
        return allSessions.filter(s => {
          if (!s.last_activity) return true;
          const lastActivity = new Date(s.last_activity);
          const diffMinutes = (now - lastActivity) / 1000 / 60;
          return diffMinutes < 10;
        });
      } catch (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }
    },
    refetchInterval: 3000,
    enabled: !!currentUser && currentUser.role === 'admin'
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => client.entities.Subject.list(),
    enabled: currentUser?.role === 'admin'
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-gray-500">No tienes permisos para ver esta página</p>
      </div>
    );
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Materia desconocida';
  };

  const getProgressPercent = (current, total) => {
    return total > 0 ? Math.round((current / total) * 100) : 0;
  };

  const getAccuracyPercent = (score, current) => {
    return current > 0 ? Math.round((score / current) * 100) : 0;
  };

  const getTimeElapsed = (startedAt) => {
    const start = new Date(startedAt);
    const now = new Date();
    const minutes = differenceInMinutes(now, start);
    const totalSeconds = differenceInSeconds(now, start);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-green-600 animate-pulse" />
            Sesiones en Vivo
          </h1>
          <p className="text-gray-600">Estudiantes haciendo quizzes ahora mismo</p>
        </div>
        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
          {sessions.length} activa{sessions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay sesiones activas</h3>
            <p className="text-gray-500">Cuando un estudiante comience un quiz, aparecerá aquí</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const progress = getProgressPercent(session.current_question, session.total_questions);
            const accuracy = getAccuracyPercent(session.score, session.current_question);

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                          <User className="w-5 h-5 text-green-700" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{session.username}</CardTitle>
                          <p className="text-xs text-gray-500">{session.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-green-700">En vivo</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Quiz info */}
                    <div className="bg-white/80 rounded-lg p-3 border">
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{session.quiz_title}</p>
                          <p className="text-xs text-gray-500">{getSubjectName(session.subject_id)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-700">Progreso</span>
                        <span className="text-xs font-semibold text-indigo-600">
                          {session.current_question}/{session.total_questions}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Correctas</span>
                        </div>
                        <p className="text-lg font-bold text-green-700">{session.score}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span className="text-xs font-medium text-red-700">Incorrectas</span>
                        </div>
                        <p className="text-lg font-bold text-red-700">{session.wrong_count}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Precisión</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700">{accuracy}%</p>
                      </div>
                    </div>

                    {/* Time elapsed */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Tiempo: {getTimeElapsed(session.started_at)}</span>
                      </div>
                      <span>{formatDistanceToNow(new Date(session.last_activity), { addSuffix: true, locale: es })}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}