import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Loader2 } from 'lucide-react';
import { client } from '@/api/client';
import { academicStructure } from './academicData';
import { toast } from 'sonner';
import { DoubleConfirmationModal } from '@/components/ui/DoubleConfirmationModal';

export default function GenerateStructureButton() {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Helper to clear existing data before generation
    const clearData = async () => {
        try {
            // Fetch all items first - inefficient but works for now with local storage
            const courses = await client.entities.Course.list();
            const folders = await client.entities.Folder.list();
            const subjects = await client.entities.Subject.list();

            // Delete in parallel
            await Promise.all([
                ...courses.map(c => client.entities.Course.delete(c.id)),
                ...folders.map(f => client.entities.Folder.delete(f.id)),
                ...subjects.map(s => client.entities.Subject.delete(s.id))
            ]);
            return true;
        } catch (e) {
            console.error("Error clearing data:", e);
            return false;
        }
    };

    const handleConfirmGenerate = async () => {
        setLoading(true);
        try {
            // 1. Clear existing data
            await clearData();

            const coursesData = academicStructure;
            let createdCount = 0;

            for (const courseData of coursesData) {
                // Create Course (Semestre)
                const coursePayload = {
                    name: courseData.name,
                    description: courseData.description,
                    color: courseData.color,
                    icon: 'GraduationCap'
                };
                const newCourse = await client.entities.Course.create(coursePayload);
                createdCount++;

                if (courseData.folders) {
                    for (const materiaData of courseData.folders) { // "folders" in JSON are actually "Materias" -> Subjects in App
                        // Create Subject (Materia) linked to Course
                        // HIERARCHY FIX: Course -> Subject (Materia) -> Folder (Parcial)

                        const subjectPayload = {
                            name: materiaData.name,
                            course_id: newCourse.id,
                            color: materiaData.color || '#6366f1',
                            description: `Materia del ${courseData.name}`
                        };
                        const newSubject = await client.entities.Subject.create(subjectPayload);
                        createdCount++;

                        if (materiaData.subjects) { // "subjects" in JSON are "Parciales" -> Folders in App
                            for (const parcialName of materiaData.subjects) {
                                // Create Folder (Parcial) linked to Subject
                                const folderPayload = {
                                    name: parcialName,
                                    course_id: newCourse.id, // Keep reference for easier querying if needed, but hierarchy is parent=Subject
                                    subject_id: newSubject.id,
                                    color: materiaData.color,
                                    description: 'Evaluación parcial'
                                };
                                await client.entities.Folder.create(folderPayload);
                                createdCount++;
                            }
                        }
                    }
                }
            }

            toast.success(`Estructura regenerada: ${createdCount} elementos creados.`);
            // Force reload to see changes since we are modifying local storage/mock state
            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            console.error(error);
            toast.error('Error al generar estructura');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs font-normal text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setShowModal(true)}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Regenerar Estructura (Borrar Todo)
            </Button>

            <DoubleConfirmationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handleConfirmGenerate}
                title="⚠️ ¿Regenerar Estructura Académica?"
                description="ESTA ACCIÓN ES DESTRUCTIVA. Se eliminarán TODOS los cursos, materias y carpetas existentes y se recrearán desde la plantilla base. Los quizzes no se borrarán pero podrían quedar huérfanos."
                confirmText="REGENERAR"
                actionButtonText="Sí, Regenerar Todo"
            />
        </>
    );
}
