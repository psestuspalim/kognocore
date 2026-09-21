import { normalizeExpandedQuiz } from './quiz-normalization';

export const mockUser = {
    id: 'admin_jesus',
    email: 'jesus@kognocore.com',
    firstName: 'Jesús',
    lastName: 'Admin',
    role: 'admin',
    username: 'jesus'
};

// Auto-load all JSON quiz files bundled in src/data/*.json
const dataModules = import.meta.glob('../data/*.json', { eager: true });
export const mockQuizzes = Object.values(dataModules)
    .map((mod) => (mod && mod.default ? mod.default : mod))
    .filter(Boolean)
    .map((q) => normalizeExpandedQuiz(q));


// ─── CURSO: ENARM 2026 ───────────────────────────────────────────────────────
export const mockCourses = [
    {
        id: 'course_enarm2026',
        name: 'ENARM 2026',
        order: 1,
        color: '#0f766e',
        description: 'Curso ENARM 2026'
    }
];

// ─── LAS 5 CARPETAS / MATERIAS SOLICITADAS ───────────────────────────────────
export const mockSubjects = [
    { id: 'subj_med_interna', name: 'Medicina Interna', order: 1, course_id: 'course_enarm2026', code: 'MI', color: '#0284c7' },
    { id: 'subj_cirugia_gen', name: 'Cirugía General', order: 2, course_id: 'course_enarm2026', code: 'CG', color: '#e11d48' },
    { id: 'subj_pediatria', name: 'Pediatría', order: 3, course_id: 'course_enarm2026', code: 'PED', color: '#f59e0b' },
    { id: 'subj_ginecologia_obs', name: 'Ginecología y Obstetricia', order: 4, course_id: 'course_enarm2026', code: 'GYO', color: '#ec4899' },
    { id: 'subj_simuladores', name: 'Simuladores', order: 5, course_id: 'course_enarm2026', code: 'SIM', color: '#7c3aed' },
    { id: 'subj_anatomia', name: 'Anatomía Humana', order: 6, course_id: 'course_enarm2026', code: 'ANA', color: '#6366f1' }
];

export const mockFolders = [
    { id: 'folder_capitulos_cortados', name: 'Capítulos cortados', order: 1, course_id: 'course_enarm2026', subject_id: 'subj_anatomia', color: '#6366f1', description: 'Bloques de examen de respuesta abierta (Moore 9.ª ed.)' }
];

export const mockResources = [];

export const mockQuizSettings = {
    time_limit: 30,
    passing_score: 70
};

export const mockLogs = {
    success: true
};
