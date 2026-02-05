import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, AlertTriangle, Search, GraduationCap, Folder, BookOpen, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
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

export default function AdminTrash() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [deleteDialog, setDeleteDialog] = useState({ open: false, permanent: false });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: deletedItems = [], isLoading } = useQuery({
    queryKey: ['deleted-items'],
    queryFn: () => base44.entities.DeletedItem.list('-deleted_at'),
    enabled: currentUser?.role === 'admin'
  });

  const restoreMutation = useMutation({
    mutationFn: async (item) => {
      const { item_type, item_data } = item;
      
      if (item_type === 'course') {
        await base44.entities.Course.create(item_data);
      } else if (item_type === 'folder') {
        await base44.entities.Folder.create(item_data);
      } else if (item_type === 'subject') {
        await base44.entities.Subject.create(item_data);
      } else if (item_type === 'quiz') {
        await base44.entities.Quiz.create(item_data);
      }
      
      await base44.entities.DeletedItem.delete(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['deleted-items']);
      queryClient.invalidateQueries(['courses']);
      queryClient.invalidateQueries(['folders']);
      queryClient.invalidateQueries(['subjects']);
      queryClient.invalidateQueries(['quizzes']);
      toast.success('Elemento restaurado');
    }
  });

  const deletePermanentlyMutation = useMutation({
    mutationFn: (id) => base44.entities.DeletedItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['deleted-items']);
      toast.success('Eliminado permanentemente');
    }
  });

  if (!currentUser || currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Acceso denegado</p>
      </div>
    );
  }

  const filteredItems = searchTerm
    ? deletedItems.filter(item => 
        item.item_data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_data?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : deletedItems;

  const toggleItem = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkRestore = async () => {
    try {
      for (const id of selectedItems) {
        const item = deletedItems.find(d => d.id === id);
        if (item) await restoreMutation.mutateAsync(item);
      }
      setSelectedItems(new Set());
      toast.success('Elementos restaurados');
    } catch (error) {
      toast.error('Error al restaurar');
    }
  };

  const handleBulkDeletePermanently = () => {
    setDeleteDialog({ open: true, permanent: true });
  };

  const confirmPermanentDelete = async () => {
    try {
      for (const id of selectedItems) {
        await deletePermanentlyMutation.mutateAsync(id);
      }
      setSelectedItems(new Set());
    } catch (error) {
      toast.error('Error al eliminar');
    }
    setDeleteDialog({ open: false, permanent: false });
  };

  const handleEmptyTrash = () => {
    setSelectedItems(new Set(deletedItems.map(d => d.id)));
    setDeleteDialog({ open: true, permanent: true });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'course': return GraduationCap;
      case 'folder': return Folder;
      case 'subject': return BookOpen;
      case 'quiz': return FileQuestion;
      default: return FileQuestion;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'course': return 'bg-indigo-100 text-indigo-600';
      case 'folder': return 'bg-amber-100 text-amber-600';
      case 'subject': return 'bg-emerald-100 text-emerald-600';
      case 'quiz': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        icon={Trash2}
        title="Papelera de Reciclaje"
        subtitle="Restaura o elimina permanentemente elementos"
        badge={<Badge variant="secondary">{deletedItems.length} elementos</Badge>}
        actions={
          deletedItems.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEmptyTrash}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Vaciar papelera
            </Button>
          )
        }
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en papelera..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">{selectedItems.size} seleccionados</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRestore}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeletePermanently}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron elementos' : 'La papelera está vacía'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const Icon = getIcon(item.item_type);
                const name = item.item_data?.name || item.item_data?.title || 'Sin nombre';
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedItems.has(item.id) ? 'bg-muted border-primary' : 'bg-background hover:border-muted-foreground/20'
                    }`}
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />

                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColor(item.item_type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        Eliminado {format(new Date(item.deleted_at || item.created_date), 'dd/MM/yyyy HH:mm')} • {item.deleted_by}
                      </p>
                    </div>

                    <Badge variant="outline" className="capitalize">
                      {item.item_type}
                    </Badge>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => restoreMutation.mutate(item)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItems(new Set([item.id]));
                          setDeleteDialog({ open: true, permanent: true });
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, permanent: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Eliminar permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar permanentemente {selectedItems.size} elemento(s)? 
              Esta acción no se puede deshacer y los elementos no podrán ser recuperados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPermanentDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}