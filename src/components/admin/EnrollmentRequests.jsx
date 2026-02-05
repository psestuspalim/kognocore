import React, { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Clock, User, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EnrollmentRequests({ currentUser }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['enrollment-requests'],
    queryFn: () => client.entities.CourseEnrollment.list('-created_date'),
    refetchInterval: 5000
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.CourseEnrollment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollment-requests']);
      toast.success('Solicitud actualizada');
      setRejectingId(null);
      setRejectionReason('');
    }
  });

  const handleApprove = async (request) => {
    await updateRequestMutation.mutateAsync({
      id: request.id,
      data: {
        status: 'approved',
        approved_by: currentUser.email,
        approved_at: new Date().toISOString()
      }
    });
  };

  const handleReject = async (request) => {
    await updateRequestMutation.mutateAsync({
      id: request.id,
      data: {
        status: 'rejected',
        rejection_reason: rejectionReason || 'Sin razón especificada',
        approved_by: currentUser.email
      }
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Clock className="w-6 h-6 text-amber-600" />
          Solicitudes de Inscripción
        </h2>
        <p className="text-gray-600">Aprueba o rechaza solicitudes de estudiantes</p>
      </div>

      {/* Pending */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          Pendientes
          <Badge className="bg-amber-100 text-amber-700">{pendingRequests.length}</Badge>
        </h3>
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No hay solicitudes pendientes
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-2 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-amber-100 p-2 rounded-full">
                          <User className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{request.username}</p>
                          <p className="text-sm text-gray-600">{request.user_email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-medium text-indigo-700">{request.course_name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Código: <code className="bg-gray-100 px-1 rounded">{request.access_code}</code> • 
                            {formatDistanceToNow(new Date(request.created_date), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {rejectingId === request.id ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="Razón del rechazo (opcional)"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="text-xs h-8"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectingId(null)}
                                className="h-7 text-xs"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReject(request)}
                                className="h-7 bg-red-600 hover:bg-red-700 text-xs"
                              >
                                Confirmar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request)}
                              className="bg-green-600 hover:bg-green-700 h-8"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectingId(request.id)}
                              className="border-red-200 text-red-600 hover:bg-red-50 h-8"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      {approvedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            Aprobadas
            <Badge className="bg-green-100 text-green-700">{approvedRequests.length}</Badge>
          </h3>
          <div className="space-y-2">
            {approvedRequests.slice(0, 5).map((request) => (
              <Card key={request.id} className="border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{request.username}</p>
                      <p className="text-xs text-gray-600">{request.course_name}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aprobada
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejectedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            Rechazadas
            <Badge className="bg-red-100 text-red-700">{rejectedRequests.length}</Badge>
          </h3>
          <div className="space-y-2">
            {rejectedRequests.slice(0, 3).map((request) => (
              <Card key={request.id} className="border-red-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{request.username}</p>
                      <p className="text-xs text-gray-600">{request.course_name}</p>
                      {request.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">{request.rejection_reason}</p>
                      )}
                    </div>
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Rechazada
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}