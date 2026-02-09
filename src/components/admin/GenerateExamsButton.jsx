import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Loader2 } from 'lucide-react';
import { generateSampleExams } from '@/utils/generateSampleExams';
import { toast } from 'sonner';

export default function GenerateExamsButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await generateSampleExams();

            if (result.success) {
                toast.success(result.message);
                setOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error al generar exámenes');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Generar Exámenes de Prueba
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generar Exámenes Simulados</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Esto creará 3 exámenes (1º, 2º y 3º Parcial) para cada materia del Primer Semestre.
                    </p>
                    <p className="text-sm text-gray-600">
                        Los exámenes estarán distribuidos en las próximas 3 semanas y serán visibles para todos los estudiantes.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Total:</strong> 12 exámenes (4 materias × 3 parciales)
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <Calendar className="w-4 h-4 mr-2" />
                                Generar Exámenes
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
