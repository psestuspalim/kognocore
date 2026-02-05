import React, { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Trash2, Key, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CourseCodesPanel({ courses }) {
  const [showDialog, setShowDialog] = useState(false);
  const [newCode, setNewCode] = useState({
    course_id: '',
    max_uses: '',
    expires_at: ''
  });

  const queryClient = useQueryClient();

  const { data: codes = [] } = useQuery({
    queryKey: ['course-codes'],
    queryFn: () => client.entities.CourseAccessCode.list('-created_date')
  });

  const createCodeMutation = useMutation({
    mutationFn: (data) => client.entities.CourseAccessCode.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['course-codes']);
      setShowDialog(false);
      setNewCode({ course_id: '', max_uses: '', expires_at: '' });
      toast.success('Código creado exitosamente');
    }
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (id) => client.entities.CourseAccessCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['course-codes']);
      toast.success('Código eliminado');
    }
  });

  const toggleCodeMutation = useMutation({
    mutationFn: ({ id, is_active }) => client.entities.CourseAccessCode.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['course-codes'])
  });

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreate = () => {
    const course = courses.find(c => c.id === newCode.course_id);
    if (!course) return;

    const code = generateRandomCode();
    createCodeMutation.mutate({
      code,
      course_id: course.id,
      course_name: course.name,
      is_active: true,
      max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null,
      current_uses: 0,
      expires_at: newCode.expires_at || null
    });
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-indigo-600" />
            Códigos de Acceso
          </h2>
          <p className="text-gray-600">Genera códigos para que los usuarios se inscriban a cursos</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Generar Código
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generar Nuevo Código</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Curso *</Label>
                <select
                  value={newCode.course_id}
                  onChange={(e) => setNewCode({...newCode, course_id: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="">Selecciona un curso</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Máximo de usos (opcional)</Label>
                <Input
                  type="number"
                  value={newCode.max_uses}
                  onChange={(e) => setNewCode({...newCode, max_uses: e.target.value})}
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <Label>Fecha de expiración (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={newCode.expires_at}
                  onChange={(e) => setNewCode({...newCode, expires_at: e.target.value})}
                />
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!newCode.course_id}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Generar Código
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {codes.map((code) => {
          const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
          const isMaxed = code.max_uses && code.current_uses >= code.max_uses;
          const isUsable = code.is_active && !isExpired && !isMaxed;

          return (
            <Card key={code.id} className={`border-2 ${isUsable ? 'border-green-200' : 'border-gray-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{code.course_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-3 py-1 rounded text-lg font-mono font-bold text-indigo-700">
                        {code.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(code.code)}
                        className="h-7 w-7"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleCodeMutation.mutate({ id: code.id, is_active: !code.is_active })}
                      className="h-8 w-8"
                    >
                      {code.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCodeMutation.mutate(code.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={isUsable ? 'default' : 'secondary'} className={isUsable ? 'bg-green-100 text-green-700' : ''}>
                    {isUsable ? 'Activo' : isExpired ? 'Expirado' : isMaxed ? 'Agotado' : 'Inactivo'}
                  </Badge>
                  {code.max_uses && (
                    <span className="text-gray-600">
                      {code.current_uses} / {code.max_uses} usos
                    </span>
                  )}
                  {!code.max_uses && (
                    <span className="text-gray-600">
                      {code.current_uses} usos
                    </span>
                  )}
                </div>
                {code.expires_at && (
                  <p className="text-xs text-gray-500">
                    Expira: {new Date(code.expires_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {codes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay códigos generados</h3>
            <p className="text-gray-500">Crea tu primer código de acceso para un curso</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}