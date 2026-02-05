import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Search, Trash2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import FileExplorer from '../components/explorer/FileExplorer';
import { buildContainers } from '../components/utils/contentTree';
import { moveItemsInBackend } from '../components/utils/moveItems';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [deleteDialog, setDeleteDialog] = useState({ open: false, items: [] });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await client.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => client.entities.Course.list('order'),
    enabled: currentUser?.role === 'admin'
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => client.entities.Folder.list('order'),
    enabled: currentUser?.role === 'admin'
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => client.entities.Subject.list('order'),
    enabled: currentUser?.role === 'admin'
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => client.entities.Quiz.list('-created_date'),
    enabled: currentUser?.role === 'admin'
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Course.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['courses'])
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Folder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['folders'])
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Subject.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['subjects'])
  });

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Quiz.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['quizzes'])
  });

  if (!currentUser || currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Acceso denegado</p>
      </div>
    );
  }

  const handleMoveItems = async (items, targetId, targetType) => {
    await moveItemsInBackend(items, targetId, targetType, {
      updateFolder: (params) => updateFolderMutation.mutateAsync(params),
      updateSubject: (params) => updateSubjectMutation.mutateAsync(params),
      updateQuiz: (params) => updateQuizMutation.mutateAsync(params)
    });
    queryClient.invalidateQueries(['courses']);
    queryClient.invalidateQueries(['folders']);
    queryClient.invalidateQueries(['subjects']);
    queryClient.invalidateQueries(['quizzes']);
  };

  const handleChangeType = async (itemId, fromType, toType) => {
    try {
      let originalItem;
      if (fromType === 'course') {
        originalItem = courses.find(c => c.id === itemId);
      } else if (fromType === 'folder') {
        originalItem = folders.find(f => f.id === itemId);
      } else if (fromType === 'subject') {
        originalItem = subjects.find(s => s.id === itemId);
      }

      if (!originalItem) return;

      const { id, created_date, updated_date, created_by, ...commonData } = originalItem;

      if (fromType === 'course') {
        await client.entities.Course.delete(itemId);
      } else if (fromType === 'folder') {
        await client.entities.Folder.delete(itemId);
      } else if (fromType === 'subject') {
        await client.entities.Subject.delete(itemId);
      }

      if (toType === 'course') {
        await client.entities.Course.create(commonData);
      } else if (toType === 'folder') {
        await client.entities.Folder.create(commonData);
      } else if (toType === 'subject') {
        await client.entities.Subject.create(commonData);
      }

      queryClient.invalidateQueries(['courses']);
      queryClient.invalidateQueries(['folders']);
      queryClient.invalidateQueries(['subjects']);
      toast.success('Tipo cambiado');
    } catch (error) {
      console.error('Error cambiando tipo:', error);
      toast.error('Error al cambiar tipo');
    }
  };

  const handleBulkDelete = async () => {
    const itemsArray = Array.from(selectedItems);
    const itemsToDelete = itemsArray.map(key => {
      const [type, id] = key.split('-');
      return { type, id };
    });

    setDeleteDialog({ open: true, items: itemsToDelete });
  };

  const confirmDelete = async () => {
    try {
      for (const item of deleteDialog.items) {
        let itemData = null;

        if (item.type === 'course') {
          itemData = courses.find(c => c.id === item.id);
          await client.entities.Course.delete(item.id);
        } else if (item.type === 'folder') {
          itemData = folders.find(f => f.id === item.id);
          await client.entities.Folder.delete(item.id);
        } else if (item.type === 'subject') {
          itemData = subjects.find(s => s.id === item.id);
          await client.entities.Subject.delete(item.id);
        } else if (item.type === 'quiz') {
          itemData = quizzes.find(q => q.id === item.id);
          await client.entities.Quiz.delete(item.id);
        }

        if (itemData) {
          await client.entities.DeletedItem.create({
            item_type: item.type,
            item_id: item.id,
            item_data: itemData,
            deleted_by: currentUser.email,
            deleted_at: new Date().toISOString()
          });
        }
      }

      queryClient.invalidateQueries(['courses']);
      queryClient.invalidateQueries(['folders']);
      queryClient.invalidateQueries(['subjects']);
      queryClient.invalidateQueries(['quizzes']);
      queryClient.invalidateQueries(['deleted-items']);

      setSelectedItems(new Set());
      toast.success('Elementos movidos a la papelera');
    } catch (error) {
      toast.error('Error al eliminar');
    }

    setDeleteDialog({ open: false, items: [] });
  };

  const handleToggleVisibility = async (type, id) => {
    let item;
    if (type === 'course') item = courses.find(c => c.id === id);
    if (type === 'folder') item = folders.find(f => f.id === id);
    if (type === 'subject') item = subjects.find(s => s.id === id);
    if (type === 'quiz') item = quizzes.find(q => q.id === id);

    if (!item) return;

    const newHidden = !item.is_hidden;
    if (type === 'course') await updateCourseMutation.mutateAsync({ id, data: { is_hidden: newHidden } });
    if (type === 'folder') await updateFolderMutation.mutateAsync({ id, data: { is_hidden: newHidden } });
    if (type === 'subject') await updateSubjectMutation.mutateAsync({ id, data: { is_hidden: newHidden } });
    if (type === 'quiz') await updateQuizMutation.mutateAsync({ id, data: { is_hidden: newHidden } });

    toast.success(newHidden ? 'Oculto' : 'Visible');
  };

  const containers = buildContainers(courses, folders, subjects);

  const filteredContainers = searchTerm
    ? containers.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    : containers;

  const filteredQuizzes = searchTerm
    ? quizzes.filter(q => q.title?.toLowerCase().includes(searchTerm.toLowerCase()))
    : quizzes;

  return (
    <AdminShell>
      <AdminPageHeader
        icon={FolderTree}
        title="Gestión de Contenido"
        subtitle="Organiza cursos, carpetas, materias y quizzes"
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{courses.length} cursos</Badge>
            <Badge variant="secondary">{subjects.length} materias</Badge>
            <Badge variant="secondary">{quizzes.length} quizzes</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Explorer (left 2/3) */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Explorador de Contenido</CardTitle>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <FileExplorer
                containers={filteredContainers}
                quizzes={filteredQuizzes}
                isAdmin={true}
                onMoveItems={handleMoveItems}
                onChangeType={handleChangeType}
                onItemClick={(type, item) => {
                  if (type === 'quiz') {
                    window.location.href = `/Quizzes`;
                  }
                }}
                onDeleteItems={(items) => {
                  const itemsToDelete = items.map(item => ({
                    type: item.type,
                    id: item.id
                  }));
                  setDeleteDialog({ open: true, items: itemsToDelete });
                }}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Panel (right 1/3) */}
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecciona elementos en el explorador para realizar acciones masivas
              </p>

              {selectedItems.size > 0 && (
                <div className="space-y-3 pt-3 border-t">
                  <Badge className="bg-primary">{selectedItems.size} seleccionados</Badge>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar seleccionados
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedItems(new Set())}
                  >
                    Limpiar selección
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cursos</span>
                <span className="font-semibold">{courses.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Carpetas</span>
                <span className="font-semibold">{folders.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Materias</span>
                <span className="font-semibold">{subjects.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quizzes</span>
                <span className="font-semibold">{quizzes.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-3 border-t">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{courses.length + folders.length + subjects.length + quizzes.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, items: [] })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover a papelera</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de mover {deleteDialog.items.length} elemento(s) a la papelera? Podrás restaurarlos después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Mover a papelera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}