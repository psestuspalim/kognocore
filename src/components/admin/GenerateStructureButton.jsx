import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { academicStructure } from './academicData';
import { toast } from 'sonner';

export default function GenerateStructureButton() {
    const [loading, setLoading] = useState(false);

    // Helper to clear existing data before generation
    const clearData = async () => {
        try {
            // Fetch all items first - inefficient but works for now with local storage
            const courses = await base44.entities.Course.list();
            const folders = await base44.entities.Folder.list();
            const subjects = await base44.entities.Subject.list();

            // Delete in parallel
            await Promise.all([
                ...courses.map(c => base44.entities.Course.delete(c.id)),
                ...folders.map(f => base44.entities.Folder.delete(f.id)),
                ...subjects.map(s => base44.entities.Subject.delete(s.id))
            ]);
            return true;
        } catch (e) {
            console.error("Error clearing data:", e);
            return false;
        }
    };

    const handleGenerate = async () => {
        if (!confirm('⚠️ ESTO BORRARÁ TODOS LOS DATOS EXISTENTES y regenerará la estructura académica correcta. ¿Estás seguro?')) return;

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
                const newCourse = await base44.entities.Course.create(coursePayload);
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
                        const newSubject = await base44.entities.Subject.create(subjectPayload);
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
                                await base44.entities.Folder.create(folderPayload);
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
        <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs font-normal text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleGenerate}
            disabled={loading}
        >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            Regenerar Estructura (Borrar Todo)
        </Button>
    );
}
