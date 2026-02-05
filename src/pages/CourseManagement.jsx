import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CourseCodesPanel from '../components/admin/CourseCodesPanel';
import EnrollmentRequests from '../components/admin/EnrollmentRequests';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CourseManagementPage() {
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
    queryFn: () => base44.entities.Course.list('name'),
    enabled: currentUser?.role === 'admin'
  });

  if (!currentUser) {
    return <div className="p-6">Cargando...</div>;
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-gray-500">No tienes permisos para ver esta página</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <Link to={createPageUrl('Quizzes')}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </Link>

      <Tabs defaultValue="codes" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="codes">Códigos de Acceso</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes de Inscripción</TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <CourseCodesPanel courses={courses} />
        </TabsContent>

        <TabsContent value="requests">
          <EnrollmentRequests currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}