import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { client } from '@/api/client';
import { toast } from 'sonner';
import { DoubleConfirmationModal } from '@/components/ui/DoubleConfirmationModal';

export default function RemoveDuplicatesButton() {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    try {
      const quizzes = await client.entities.Quiz.list('-created_date');

      // Agrupar por título + subject_id
      const groups = {};
      quizzes.forEach(quiz => {
        const key = `${quiz.title.trim().toLowerCase()}_${quiz.subject_id || 'no-subject'}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(quiz);
      });

      // Eliminar duplicados (mantener el más reciente)
      let deletedCount = 0;
      for (const key in groups) {
        const group = groups[key];
        if (group.length > 1) {
          // Ordenar por fecha (más reciente primero)
          group.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

          // Eliminar todos excepto el primero
          for (let i = 1; i < group.length; i++) {
            await client.entities.Quiz.delete(group[i].id);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        toast.success(`${deletedCount} quizzes duplicados eliminados`);
        window.location.reload();
      } else {
        toast.info('No se encontraron duplicados');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar duplicados');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        disabled={isRemoving}
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs border-red-300 text-red-600 hover:bg-red-50"
      >
        {isRemoving ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3 mr-1" />
        )}
        {isRemoving ? 'Eliminando...' : 'Eliminar duplicados'}
      </Button>

      <DoubleConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmRemove}
        title="⚠️ ¿Eliminar duplicados?"
        description="Se analizarán todos los quizzes y se eliminarán aquellos con el mismo título y materia, manteniendo solo la versión más reciente. Esta acción es destructiva."
        confirmText="ELIMINAR"
        actionButtonText="Eliminar Duplicados"
      />
    </>
  );
}