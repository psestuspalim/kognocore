import React, { useMemo } from 'react';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  TrendingUp, Users, BookOpen, Settings, Clock, MousePointer, AlertTriangle,
  CheckCircle2, Activity, X, Trash2, Download
} from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  { name: 'Gestión de Cursos', category: 'admin', route: 'CourseManagement', icon: BookOpen },
  { name: 'Códigos de Acceso', category: 'admin', route: 'CourseManagement', icon: BookOpen },
  { name: 'Solicitudes de Inscripción', category: 'admin', route: 'CourseManagement', icon: Users },
  { name: 'Sesiones en Vivo', category: 'admin', route: 'LiveSessions', icon: Activity },
  { name: 'Progreso Estudiantes', category: 'admin', route: 'AdminProgress', icon: TrendingUp },
  { name: 'Tareas Asignadas', category: 'admin', route: 'AdminTasks', icon: CheckCircle2 },
  { name: 'Gestionar Contenido', category: 'admin', route: 'ContentManager', icon: Settings },
  { name: 'Exportar Quizzes', category: 'admin', route: 'QuizExporter', icon: Download },
  { name: 'Reparar Quizzes', category: 'admin', route: 'FixQuizzes', icon: Settings },
  { name: 'Eliminar Duplicados', category: 'admin', route: 'RemoveDuplicates', icon: Trash2 },
  { name: 'Explorador de Archivos', category: 'admin', route: 'FileExplorer', icon: BookOpen },
  { name: 'Crear Quiz con IA', category: 'quiz', route: 'AIQuizGenerator', icon: BookOpen },
  { name: 'Subir Quiz JSON', category: 'quiz', route: 'FileUploader', icon: BookOpen },
  { name: 'Crear Quiz de Texto', category: 'quiz', route: 'TextQuizCreator', icon: BookOpen },
  { name: 'Crear Quiz de Imagen', category: 'quiz', route: 'ImageQuizCreator', icon: BookOpen },
  { name: 'Crear Quiz de Tejidos', category: 'quiz', route: 'TissueQuizCreator', icon: BookOpen },
  { name: 'Editar Quiz', category: 'quiz', route: 'QuizEditor', icon: Settings },
  { name: 'Modo Swipe', category: 'student', route: 'SwipeQuizMode', icon: Activity },
  { name: 'Juego Multijugador', category: 'student', route: 'GameLobby', icon: Users },
  { name: 'Torneo', category: 'student', route: 'TournamentLobby', icon: Users },
  { name: 'Desafío 1v1', category: 'student', route: 'ChallengePlay', icon: Users },
  { name: 'Ranking', category: 'student', route: 'Leaderboard', icon: TrendingUp },
  { name: 'Mi Progreso', category: 'student', route: 'Progress', icon: TrendingUp }
];

export default function FeatureAnalytics({ onClose }) {
  const { data: usageData = [], isLoading } = useQuery({
    queryKey: ['feature-usage'],
    queryFn: () => client.entities.FeatureUsage.list('-created_date', 1000)
  });

  const analytics = useMemo(() => {
    if (!usageData.length) return null;

    const featureStats = {};
    let totalClicks = 0;
    let totalTime = 0;

    // Calcular estadísticas por feature
    usageData.forEach(usage => {
      if (!featureStats[usage.feature_name]) {
        featureStats[usage.feature_name] = {
          clicks: 0,
          totalTime: 0,
          users: new Set(),
          lastUsed: usage.created_date,
          category: usage.feature_category
        };
      }

      featureStats[usage.feature_name].clicks++;
      featureStats[usage.feature_name].totalTime += usage.session_duration || 0;
      featureStats[usage.feature_name].users.add(usage.user_email);

      totalClicks++;
      totalTime += usage.session_duration || 0;

      if (new Date(usage.created_date) > new Date(featureStats[usage.feature_name].lastUsed)) {
        featureStats[usage.feature_name].lastUsed = usage.created_date;
      }
    });

    // Agregar features sin uso
    FEATURES.forEach(feature => {
      if (!featureStats[feature.name]) {
        featureStats[feature.name] = {
          clicks: 0,
          totalTime: 0,
          users: new Set(),
          lastUsed: null,
          category: feature.category
        };
      }
    });

    // Convertir a array y calcular porcentajes
    const statsArray = Object.entries(featureStats).map(([name, stats]) => ({
      name,
      clicks: stats.clicks,
      clickPercentage: totalClicks > 0 ? ((stats.clicks / totalClicks) * 100).toFixed(1) : 0,
      totalTime: stats.totalTime,
      timePercentage: totalTime > 0 ? ((stats.totalTime / totalTime) * 100).toFixed(1) : 0,
      avgTimePerClick: stats.clicks > 0 ? Math.round(stats.totalTime / stats.clicks) : 0,
      uniqueUsers: stats.users.size,
      lastUsed: stats.lastUsed,
      category: stats.category,
      icon: FEATURES.find(f => f.name === name)?.icon || Activity
    }));

    // Ordenar por clicks descendente
    statsArray.sort((a, b) => b.clicks - a.clicks);

    // Separar usadas y no usadas
    const used = statsArray.filter(s => s.clicks > 0);
    const unused = statsArray.filter(s => s.clicks === 0);

    // Agrupar por categoría
    const byCategory = statsArray.reduce((acc, stat) => {
      if (!acc[stat.category]) {
        acc[stat.category] = { clicks: 0, time: 0, features: 0 };
      }
      acc[stat.category].clicks += stat.clicks;
      acc[stat.category].time += stat.totalTime;
      acc[stat.category].features++;
      return acc;
    }, {});

    const categoryData = Object.entries(byCategory).map(([name, data]) => ({
      name,
      value: data.clicks,
      percentage: totalClicks > 0 ? ((data.clicks / totalClicks) * 100).toFixed(1) : 0
    }));

    return {
      all: statsArray,
      used,
      unused,
      totalClicks,
      totalTime,
      categoryData,
      usageRate: ((used.length / statsArray.length) * 100).toFixed(1)
    };
  }, [usageData]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="py-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Cargando estadísticas...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500">No hay datos de uso disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                Analytics de Funcionalidades
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Análisis de uso de todas las funcionalidades del sistema
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <MousePointer className="w-4 h-4" />
                    <span className="text-xs font-medium">Total Clics</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-800">{analytics.totalClicks}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Usadas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {analytics.used.length}/{analytics.all.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">Sin uso</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-800">{analytics.unused.length}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Tiempo total</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-800">
                    {Math.round(analytics.totalTime / 60)}m
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 10 features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 10 - Más Usadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.used.slice(0, 10)} margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
                        <YAxis fontSize={11} />
                        <Tooltip
                          contentStyle={{ fontSize: '12px' }}
                          formatter={(value, name) => [value, name === 'clicks' ? 'Clics' : 'Porcentaje']}
                        />
                        <Bar dataKey="clicks" fill="#6366f1">
                          {analytics.used.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* By category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Uso por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analytics.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle de Funcionalidades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analytics.all.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.name}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${feature.clicks === 0
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                          }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${feature.clicks === 0 ? 'bg-red-100' : 'bg-indigo-100'
                            }`}
                        >
                          <Icon className={`w-4 h-4 ${feature.clicks === 0 ? 'text-red-600' : 'text-indigo-600'
                            }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{feature.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MousePointer className="w-3 h-3" />
                              {feature.clicks} clics ({feature.clickPercentage}%)
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.round(feature.totalTime / 60)}m ({feature.timePercentage}%)
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {feature.uniqueUsers} usuarios
                            </span>
                          </div>
                        </div>

                        <Badge variant={feature.clicks === 0 ? 'destructive' : 'default'}>
                          {feature.clicks === 0 ? 'Sin uso' : `${feature.clickPercentage}%`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}