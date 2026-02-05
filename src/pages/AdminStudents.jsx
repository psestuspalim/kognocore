import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Search, ChevronRight, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function AdminStudents() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const students = allUsers.filter(u => u.role === 'user');

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
              <Link to={createPageUrl(`AdminStudentDetail?id=${student.id}`)}>
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
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" />
                              {student.email}
                            </span>
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