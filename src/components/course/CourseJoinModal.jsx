import { useState } from 'react';
import { client } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseJoinModal({ open, onClose, currentUser }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const normalized = code.trim().toUpperCase();
      const allCodes = await client.entities.CourseAccessCode.list();
      const accessCode = allCodes.find(c => (c.code || '').trim().toUpperCase() === normalized);

      const allCourses = await client.entities.Course.list();
      const targetCourseId = accessCode?.course_id || allCourses[0]?.id || 'course_enarm2026';
      const targetCourseName = accessCode?.course_name || allCourses[0]?.name || 'ENARM 2026';

      if (accessCode) {
        if (accessCode.is_active === false) {
          toast.error('Este código está desactivado');
          setLoading(false);
          return;
        }

        if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
          toast.error('Este código ha expirado');
          setLoading(false);
          return;
        }

        if (accessCode.max_uses && accessCode.current_uses >= accessCode.max_uses) {
          toast.error('Este código ha alcanzado su límite de usos');
          setLoading(false);
          return;
        }
      }

      // Verificar si ya está inscrito
      const existing = await client.entities.CourseEnrollment.filter({
        user_email: currentUser.email,
        course_id: targetCourseId
      });

      if (existing.length > 0) {
        if (existing[0].status === 'approved') {
          toast.info('Ya estás inscrito en este curso');
          setLoading(false);
          onClose();
          return;
        } else {
          await client.entities.CourseEnrollment.update(existing[0].id, {
            status: 'approved'
          });
        }
      } else {
        // Crear inscripción directa y aprobada
        await client.entities.CourseEnrollment.create({
          user_email: currentUser.email,
          username: currentUser.username || 'Estudiante',
          course_id: targetCourseId,
          course_name: targetCourseName,
          access_code: normalized,
          status: 'approved'
        });
      }

      if (accessCode?.id) {
        // Incrementar uso del código
        await client.entities.CourseAccessCode.update(accessCode.id, {
          current_uses: (accessCode.current_uses || 0) + 1
        });
      }

      toast.success('¡Inscripción exitosa! Ya tienes acceso al curso.');
      queryClient.invalidateQueries(['enrollments']);
      queryClient.invalidateQueries(['courses']);
      setCode('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Unirse a un Curso
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Código de Acceso</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC12345"
              maxLength={8}
              className="uppercase font-mono text-lg"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingresa el código proporcionado por tu instructor
            </p>
          </div>
          <Button 
            type="submit" 
            disabled={!code.trim() || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'Enviar Solicitud'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}