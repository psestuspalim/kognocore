export const mockUser = {
    id: 'admin_jesus',
    email: 'jesus@kognocore.com',
    firstName: 'Jesús',
    lastName: 'Admin',
    role: 'admin',
    username: 'jesus'
};

export const mockQuizzes = [];

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
    { id: 'subj_simuladores', name: 'Simuladores', order: 5, course_id: 'course_enarm2026', code: 'SIM', color: '#7c3aed' }
];

export const mockFolders = [];

export const mockResources = [];

export const mockQuizSettings = {
    time_limit: 30,
    passing_score: 70
};

export const mockLogs = {
    success: true
};
