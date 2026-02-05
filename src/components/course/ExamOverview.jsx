import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, AlertTriangle, Clock, CheckCircle2, Trash2, Users } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExamOverview({ courseId, subjects, currentUser, isAdmin }) {
  const [showDialog, setShowDialog] = useState(false);
  const [newExam, setNewExam] = useState({
    subject_id: '',
    exam_type: '1º Parcial',
    date: '',
    notes: '',
    for_all: false
  });

  const queryClient = useQueryClient();

  const { data: allExams = [] } = useQuery({
    queryKey: ['exam-dates', courseId, currentUser?.email],
    queryFn: () => base44.entities.ExamDate.filter({ course_id: courseId }),
    enabled: !!courseId && !!currentUser
  });

  const createExamMutation = useMutation({
    mutationFn: (data) => base44.entities.ExamDate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['exam-dates']);
      setShowDialog(false);
      setNewExam({ subject_id: '', exam_type: '1º Parcial', date: '', notes: '', for_all: false });
    }
  });

  const deleteExamMutation = useMutation({
    mutationFn: (id) => base44.entities.ExamDate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['exam-dates'])
  });

  const getDaysRemaining = (dateString) => {
    const examDate = parseISO(dateString);
    const today = new Date();
    return differenceInDays(examDate, today);
  };

  const getUrgencyBadge = (days) => {
    if (days < 0) return { color: 'bg-gray-400 text-gray-800', icon: CheckCircle2, text: 'Pasó' };
    if (days === 0) return { color: 'bg-red-600 text-white animate-pulse', icon: AlertTriangle, text: '¡HOY!' };
    if (days <= 2) return { color: 'bg-red-500 text-white', icon: AlertTriangle, text: `${days}d` };
    if (days <= 6) return { color: 'bg-yellow-500 text-white', icon: Clock, text: `${days}d` };
    return { color: 'bg-green-500 text-white', icon: CheckCircle2, text: `${days}d` };
  };

  const sortedExams = [...allExams]
    .map(exam => ({
      ...exam,
      daysRemaining: getDaysRemaining(exam.date)
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  const handleCreateExam = () => {
    const subject = subjects.find(s => s.id === newExam.subject_id);
    if (!subject) return;

    createExamMutation.mutate({
      subject_id: newExam.subject_id,
      subject_name: subject.name,
      course_id: courseId,
      exam_type: newExam.exam_type,
      date: newExam.date,
      notes: newExam.notes,
      user_email: (isAdmin && newExam.for_all) ? null : currentUser.email
    });
  };

  if (sortedExams.length === 0 && !isAdmin) return null;

  return (
    <Card className="mb-6 overflow-hidden border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Próximos Exámenes</h3>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programar Examen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Materia</Label>
                  <Select value={newExam.subject_id} onValueChange={(val) => setNewExam({...newExam, subject_id: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una materia" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Examen</Label>
                  <Select value={newExam.exam_type} onValueChange={(val) => setNewExam({...newExam, exam_type: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1º Parcial">1º Parcial</SelectItem>
                      <SelectItem value="2º Parcial">2º Parcial</SelectItem>
                      <SelectItem value="3º Parcial">3º Parcial</SelectItem>
                      <SelectItem value="4º Parcial">4º Parcial</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={newExam.date}
                    onChange={(e) => setNewExam({...newExam, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Notas (opcional)</Label>
                  <Input
                    value={newExam.notes}
                    onChange={(e) => setNewExam({...newExam, notes: e.target.value})}
                    placeholder="Ej: Temas 1-5"
                  />
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="for-all"
                      checked={newExam.for_all}
                      onChange={(e) => setNewExam({...newExam, for_all: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="for-all" className="flex items-center gap-1 cursor-pointer">
                      <Users className="w-4 h-4" />
                      Para todos los estudiantes
                    </Label>
                  </div>
                )}
                <Button onClick={handleCreateExam} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!newExam.subject_id || !newExam.date}>
                  Crear Examen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sortedExams.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay exámenes programados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedExams.map((exam) => {
              const badge = getUrgencyBadge(exam.daysRemaining);
              const Icon = badge.icon;
              const canDelete = isAdmin || exam.user_email === currentUser.email;

              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Badge className={`${badge.color} flex items-center gap-1 px-2 py-1`}>
                      <Icon className="w-3 h-3" />
                      {badge.text}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{exam.subject_name}</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{exam.exam_type}</span>
                        {!exam.user_email && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            Todos
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(parseISO(exam.date), "d 'de' MMMM, yyyy", { locale: es })}
                        {exam.notes && ` • ${exam.notes}`}
                      </div>
                    </div>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExamMutation.mutate(exam.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}