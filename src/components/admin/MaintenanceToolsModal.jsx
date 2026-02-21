import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Wrench, Trash2, CheckCircle2, Database } from 'lucide-react';
import RemoveDuplicatesButton from './RemoveDuplicatesButton';
import RemoveDuplicateQuestionsButton from './RemoveDuplicateQuestionsButton';
import FixQuizzesButton from './FixQuizzesButton';
import GenerateStructureButton from './GenerateStructureButton';

export default function MaintenanceToolsModal({ open, onOpenChange }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Wrench className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl">Herramientas de Mantenimiento</DialogTitle>
                            <DialogDescription className="text-base mt-1">
                                Herramientas avanzadas para reparación y limpieza del sistema
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Warning Banner */}
                <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-orange-900">¡Precaución!</p>
                            <p className="text-sm text-orange-800 mt-1">
                                Estas herramientas modifican la base de datos. Úsalas solo cuando sea necesario
                                y asegúrate de entender su función antes de ejecutarlas.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Maintenance Tools Grid */}
                <div className="grid gap-4">
                    {/* Remove Duplicates */}
                    <Card className="border-2">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                        <Trash2 className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Eliminar Duplicados</CardTitle>
                                        <CardDescription className="mt-1">
                                            Elimina cursos, materias y carpetas duplicadas del sistema
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Función:</strong> Busca y elimina entidades con nombres idénticos,
                                    manteniendo solo la primera instancia de cada una.
                                </p>
                            </div>
                            <RemoveDuplicatesButton />
                        </CardContent>
                    </Card>

                    {/* Remove Duplicate Questions */}
                    <Card className="border-2">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                        <Trash2 className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Eliminar Preguntas Duplicadas</CardTitle>
                                        <CardDescription className="mt-1">
                                            Limpia preguntas duplicadas dentro de los quizzes
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Función:</strong> Identifica preguntas con texto idéntico dentro de cada
                                    quiz y elimina las duplicadas.
                                </p>
                            </div>
                            <RemoveDuplicateQuestionsButton />
                        </CardContent>
                    </Card>

                    {/* Fix Quizzes */}
                    <Card className="border-2">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Reparar Quizzes</CardTitle>
                                        <CardDescription className="mt-1">
                                            Corrige problemas de formato y estructura en los quizzes
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Función:</strong> Valida y corrige la estructura de los quizzes,
                                    asegurando que todos tengan el formato correcto.
                                </p>
                            </div>
                            <FixQuizzesButton />
                        </CardContent>
                    </Card>

                    {/* Regenerate Structure */}
                    <Card className="border-2 border-red-200">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                        <Database className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Regenerar Estructura Académica</CardTitle>
                                        <CardDescription className="mt-1">
                                            Elimina todo y recrea la estructura de semestres, materias y parciales
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-red-50 rounded-lg p-3 mb-3">
                                <p className="text-sm text-red-900">
                                    <strong>⚠️ Precaución:</strong> Esta acción eliminará TODOS los cursos, materias
                                    y carpetas existentes y los recreará desde la plantilla base.
                                </p>
                            </div>
                            <GenerateStructureButton />
                        </CardContent>
                    </Card>
                </div>

                {/* Footer Info */}
                <div className="mt-6 pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                        💡 <strong>Tip:</strong> Ejecuta estas herramientas durante horarios de bajo tráfico
                        para minimizar el impacto en los usuarios.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
