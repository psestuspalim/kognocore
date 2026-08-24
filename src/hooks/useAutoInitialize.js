import { useEffect, useState } from 'react';
import { client } from '@/api/client';
import { academicStructure } from '../components/admin/academicData';

/**
 * Hook to auto-generate academic structure on first load
 * Only runs once when there are no courses in the system
 */
export default function useAutoInitialize() {
    const [initialized, setInitialized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeStructure = async () => {
            try {
                // Check if already initialized
                const hasInitialized = localStorage.getItem('structure_initialized');
                if (hasInitialized) {
                    setLoading(false);
                    setInitialized(true);
                    return;
                }

                // Check if there are any courses
                const courses = await client.entities.Course.list();

                if (courses.length === 0) {
                    console.log('No courses found, auto-generating structure...');

                    // Generate structure from academicData
                    for (const courseData of academicStructure) {
                        const coursePayload = {
                            name: courseData.name,
                            description: courseData.description,
                            color: courseData.color,
                            icon: 'GraduationCap'
                        };
                        const newCourse = await client.entities.Course.create(coursePayload);

                        if (courseData.folders) {
                            for (const materiaData of courseData.folders) {
                                const subjectPayload = {
                                    name: materiaData.name,
                                    course_id: newCourse.id,
                                    color: materiaData.color || '#6366f1',
                                    description: `Materia del ${courseData.name}`
                                };
                                const newSubject = await client.entities.Subject.create(subjectPayload);

                                if (materiaData.subjects) {
                                    for (const parcialData of materiaData.subjects) {
                                        // Handle both string format (old) and object format (new with color)
                                        const parcialName = typeof parcialData === 'string' ? parcialData : parcialData.name;
                                        const parcialColor = typeof parcialData === 'object' ? parcialData.color : materiaData.color;

                                        const folderPayload = {
                                            name: parcialName,
                                            course_id: newCourse.id,
                                            subject_id: newSubject.id,
                                            color: parcialColor,
                                            description: 'Evaluación parcial'
                                        };
                                        await client.entities.Folder.create(folderPayload);
                                    }
                                }
                            }
                        }
                    }

                    console.log('Structure auto-generated successfully');
                    localStorage.setItem('structure_initialized', 'true');
                } else {
                    // Courses exist, mark as initialized
                    localStorage.setItem('structure_initialized', 'true');
                }

                setInitialized(true);
            } catch (error) {
                console.error('Error auto-initializing structure:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeStructure();
    }, []);

    return { initialized, loading };
}
