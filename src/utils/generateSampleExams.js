import { client } from '@/api/client';

/**
 * Generate sample exam dates for Primer Semestre
 * Creates 3 exams per subject (1º, 2º, 3º Parcial)
 */
export async function generateSampleExams() {
    try {
        // Get Primer Semestre course
        const courses = await client.entities.Course.list();
        const primerSemestre = courses.find(c => c.name === "Primer Semestre");

        if (!primerSemestre) {
            console.error("Primer Semestre not found");
            return { success: false, message: "Primer Semestre not found" };
        }

        // Get all subjects for Primer Semestre
        const subjects = await client.entities.Subject.list();
        const primerSemestreSubjects = subjects.filter(s => s.course_id === primerSemestre.id);

        if (primerSemestreSubjects.length === 0) {
            console.error("No subjects found for Primer Semestre");
            return { success: false, message: "No subjects found" };
        }

        // Generate exam dates (spread over next 3 weeks)
        const today = new Date();
        const examDates = [
            new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  // 5 days
            new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 days
            new Date(today.getTime() + 19 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 19 days
        ];

        const examTypes = ['1º Parcial', '2º Parcial', '3º Parcial'];
        let createdCount = 0;

        // Create 3 exams for each subject
        for (const subject of primerSemestreSubjects) {
            for (let i = 0; i < 3; i++) {
                const examData = {
                    subject_id: subject.id,
                    subject_name: subject.name,
                    course_id: primerSemestre.id,
                    exam_type: examTypes[i],
                    date: examDates[i],
                    notes: `Temas ${i * 3 + 1}-${i * 3 + 3}`,
                    user_email: null // For all students
                };

                await client.entities.ExamDate.create(examData);
                createdCount++;
            }
        }

        return {
            success: true,
            message: `${createdCount} exámenes creados exitosamente`,
            count: createdCount
        };

    } catch (error) {
        console.error("Error generating sample exams:", error);
        return { success: false, message: error.message };
    }
}
