import { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CourseCodesPanel from '../components/admin/CourseCodesPanel';
import EnrollmentRequests from '../components/admin/EnrollmentRequests';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function CourseManagementPage() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await client.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => client.entities.Course.list('name'),
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
    <AdminShell>
      <AdminPageHeader
        icon={KeyRound}
        title="Cursos y códigos"
        subtitle="Administra accesos e inscripciones desde un solo lugar."
      />

      <Tabs defaultValue="codes" className="w-full">
        <TabsList className="mb-6 grid h-auto w-full grid-cols-2 p-1 sm:inline-grid sm:w-auto">
          <TabsTrigger value="codes" className="px-3 py-2 text-xs sm:text-sm">Códigos</TabsTrigger>
          <TabsTrigger value="requests" className="px-3 py-2 text-xs sm:text-sm">Inscripciones</TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <CourseCodesPanel courses={courses} />
        </TabsContent>

        <TabsContent value="requests">
          <EnrollmentRequests currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
