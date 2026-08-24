export const mockUser = {
    id: 'admin_jesus',
    email: 'jesus@kognocore.com',
    firstName: 'Jesús',
    lastName: 'Admin',
    role: 'admin',
    username: 'jesus'
};

export const mockQuizzes = [];

// ─── CURSO PRINCIPAL: ENARM 2026 ───────────────────────────────────────────
export const mockCourses = [
    {
        id: 'course_enarm2026',
        name: 'ENARM 2026',
        order: 1,
        color: '#0f766e',
        description: 'Curso y Banco Integral de Preparación ENARM 2026'
    }
];

// ─── MATERIAS / ÁREAS PRINCIPALES DEL ENARM 2026 ─────────────────────────────
export const mockSubjects = [
    { id: 'subj_med_interna', name: 'Medicina Interna', order: 1, course_id: 'course_enarm2026', code: 'MI-2026', color: '#0284c7' }, // Sky
    { id: 'subj_cirugia_gen', name: 'Cirugía General', order: 2, course_id: 'course_enarm2026', code: 'CG-2026', color: '#e11d48' },  // Rose / Red
    { id: 'subj_pediatria', name: 'Pediatría', order: 3, course_id: 'course_enarm2026', code: 'PED-2026', color: '#f59e0b' },        // Amber
    { id: 'subj_ginecologia_obs', name: 'Ginecología y Obstetricia', order: 4, course_id: 'course_enarm2026', code: 'GYO-2026', color: '#ec4899' }, // Pink
    { id: 'subj_simuladores', name: 'Simuladores', order: 5, course_id: 'course_enarm2026', code: 'SIM-2026', color: '#7c3aed' }      // Violet
];

// ─── CARPETAS Y MÓDULOS DE ESTUDIO ──────────────────────────────────────────
const buildFolders = () => {
    return [
        // 1. Medicina Interna
        { id: 'folder_mi_cardio', name: 'Cardiología', order: 1, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#ef4444' },
        { id: 'folder_mi_neumo', name: 'Neumología', order: 2, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#06b6d4' },
        { id: 'folder_mi_gastro', name: 'Gastroenterología', order: 3, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#f59e0b' },
        { id: 'folder_mi_nefro', name: 'Nefrología', order: 4, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#3b82f6' },
        { id: 'folder_mi_endo', name: 'Endocrinología', order: 5, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#8b5cf6' },
        { id: 'folder_mi_infecto', name: 'Infectología', order: 6, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#10b981' },
        { id: 'folder_mi_reuma', name: 'Reumatología', order: 7, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#ec4899' },
        { id: 'folder_mi_hemato', name: 'Hematología', order: 8, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#dc2626' },
        { id: 'folder_mi_neuro', name: 'Neurología', order: 9, subject_id: 'subj_med_interna', course_id: 'course_enarm2026', parent_id: null, color: '#6366f1' },

        // 2. Cirugía General
        { id: 'folder_cg_abdomen', name: 'Abdomen Agudo', order: 1, subject_id: 'subj_cirugia_gen', course_id: 'course_enarm2026', parent_id: null, color: '#ef4444' },
        { id: 'folder_cg_trauma', name: 'Trauma y Urgencias', order: 2, subject_id: 'subj_cirugia_gen', course_id: 'course_enarm2026', parent_id: null, color: '#dc2626' },
        { id: 'folder_cg_biliar', name: 'Patología Biliar y Pancreática', order: 3, subject_id: 'subj_cirugia_gen', course_id: 'course_enarm2026', parent_id: null, color: '#f59e0b' },
        { id: 'folder_cg_esofago', name: 'Patología Esofagogástrica', order: 4, subject_id: 'subj_cirugia_gen', course_id: 'course_enarm2026', parent_id: null, color: '#f97316' },
        { id: 'folder_cg_colo', name: 'Coloproctología y Pared Abdominal', order: 5, subject_id: 'subj_cirugia_gen', course_id: 'course_enarm2026', parent_id: null, color: '#84cc16' },
        { id: 'folder_cg_ped_vasc', name: 'Cirugía Pediátrica y Vascular', order: 6, subject_id: 'subj_cirugia_gen', course_id: 'course_enarm2026', parent_id: null, color: '#06b6d4' },

        // 3. Pediatría
        { id: 'folder_ped_neo', name: 'Neonatología', order: 1, subject_id: 'subj_pediatria', course_id: 'course_enarm2026', parent_id: null, color: '#f59e0b' },
        { id: 'folder_ped_crec', name: 'Crecimiento y Desarrollo', order: 2, subject_id: 'subj_pediatria', course_id: 'course_enarm2026', parent_id: null, color: '#10b981' },
        { id: 'folder_ped_infecto', name: 'Infectología Pediátrica', order: 3, subject_id: 'subj_pediatria', course_id: 'course_enarm2026', parent_id: null, color: '#ef4444' },
        { id: 'folder_ped_urg', name: 'Urgencias y Reanimación', order: 4, subject_id: 'subj_pediatria', course_id: 'course_enarm2026', parent_id: null, color: '#dc2626' },
        { id: 'folder_ped_nutri', name: 'Nutrición y Vacunación', order: 5, subject_id: 'subj_pediatria', course_id: 'course_enarm2026', parent_id: null, color: '#06b6d4' },

        // 4. Ginecología y Obstetricia
        { id: 'folder_gyo_control', name: 'Control Prenatal y Embarazo', order: 1, subject_id: 'subj_ginecologia_obs', course_id: 'course_enarm2026', parent_id: null, color: '#ec4899' },
        { id: 'folder_gyo_comp', name: 'Complicaciones Obstétricas', order: 2, subject_id: 'subj_ginecologia_obs', course_id: 'course_enarm2026', parent_id: null, color: '#ef4444' },
        { id: 'folder_gyo_parto', name: 'Parto y Puerperio', order: 3, subject_id: 'subj_ginecologia_obs', course_id: 'course_enarm2026', parent_id: null, color: '#8b5cf6' },
        { id: 'folder_gyo_gen', name: 'Ginecología General y Endocrina', order: 4, subject_id: 'subj_ginecologia_obs', course_id: 'course_enarm2026', parent_id: null, color: '#f59e0b' },
        { id: 'folder_gyo_onco', name: 'Oncología Ginecológica', order: 5, subject_id: 'subj_ginecologia_obs', course_id: 'course_enarm2026', parent_id: null, color: '#dc2626' },

        // 5. Simuladores
        { id: 'folder_sim_1', name: 'Simulador General 1', order: 1, subject_id: 'subj_simuladores', course_id: 'course_enarm2026', parent_id: null, color: '#7c3aed' },
        { id: 'folder_sim_2', name: 'Simulador General 2', order: 2, subject_id: 'subj_simuladores', course_id: 'course_enarm2026', parent_id: null, color: '#6366f1' },
        { id: 'folder_sim_3', name: 'Simulador General 3', order: 3, subject_id: 'subj_simuladores', course_id: 'course_enarm2026', parent_id: null, color: '#3b82f6' },
        { id: 'folder_sim_express', name: 'Simulador Express 100', order: 4, subject_id: 'subj_simuladores', course_id: 'course_enarm2026', parent_id: null, color: '#f59e0b' }
    ];
};

export const mockFolders = buildFolders();

export const mockResources = [];

export const mockQuizSettings = {
    time_limit: 30,
    passing_score: 70
};

export const mockLogs = {
    success: true
};
