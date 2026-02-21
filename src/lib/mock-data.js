export const mockUser = {
    id: 'mock_user_123',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
    role: 'admin',
    username: 'admin'
};

export const mockQuizzes = [];

// ─── CURSOS (Semestres) ────────────────────────────────────────────────────────
export const mockCourses = [
    { id: 'course_sem1', name: 'Primer Semestre', order: 1, color: '#7c3aed' }, // violeta
    { id: 'course_sem2', name: 'Segundo Semestre', order: 2, color: '#0284c7' }, // azul cielo
    { id: 'course_sem3', name: 'Tercer Semestre', order: 3, color: '#059669' }, // esmeralda
    { id: 'course_sem4', name: 'Cuarto Semestre', order: 4, color: '#db2777' }, // rosa
];

// ─── MATERIAS OBLIGATORIAS DE MEDICINA ───────────────────────────────────────
export const mockSubjects = [
    // Primer Semestre
    { id: 'subj_anat1', name: 'Anatomía I', order: 1, course_id: 'course_sem1', code: 'MA01-13', color: '#e11d48' }, // rose
    { id: 'subj_biof1', name: 'Biofísica', order: 2, course_id: 'course_sem1', code: 'MB01-13', color: '#7c3aed' }, // violet
    { id: 'subj_bioq1', name: 'Bioquímica', order: 3, course_id: 'course_sem1', code: 'MBQ01-13', color: '#0284c7' }, // sky
    { id: 'subj_hist1', name: 'Histología I', order: 4, course_id: 'course_sem1', code: 'MH01-13', color: '#059669' }, // emerald

    // Segundo Semestre
    { id: 'subj_anat2', name: 'Anatomía II', order: 1, course_id: 'course_sem2', code: 'MA02-13', color: '#d97706' }, // amber
    { id: 'subj_embr2', name: 'Embriología', order: 2, course_id: 'course_sem2', code: 'ME02-13', color: '#db2777' }, // pink
    { id: 'subj_fisio2', name: 'Fisiología Humana I', order: 3, course_id: 'course_sem2', code: 'MFH02-13', color: '#0891b2' }, // cyan
    { id: 'subj_hist2', name: 'Histología II', order: 4, course_id: 'course_sem2', code: 'MH02-13', color: '#65a30d' }, // lime

    // Tercer Semestre
    { id: 'subj_anatc3', name: 'Anatomía Clínica', order: 1, course_id: 'course_sem3', code: 'MAC03-13', color: '#dc2626' }, // red
    { id: 'subj_farmb3', name: 'Farmacología Básica', order: 2, course_id: 'course_sem3', code: 'MFB03-13', color: '#7e22ce' }, // purple
    { id: 'subj_fisio3', name: 'Fisiología Humana II', order: 3, course_id: 'course_sem3', code: 'MFH03-13', color: '#1d4ed8' }, // blue
    { id: 'subj_inmu3', name: 'Inmunología', order: 4, course_id: 'course_sem3', code: 'MIN03-13', color: '#ea580c' }, // orange
    { id: 'subj_inv3', name: 'Investigación en Salud', order: 5, course_id: 'course_sem3', code: 'MISO03-13', color: '#0d9488' }, // teal
    { id: 'subj_salp3', name: 'Salud Pública', order: 6, course_id: 'course_sem3', code: 'MSP03-13', color: '#92400e' }, // brown

    // Cuarto Semestre
    { id: 'subj_fisioc4', name: 'Fisiología Clínica', order: 1, course_id: 'course_sem4', code: 'MFC04-13', color: '#ca8a04' }, // yellow
    { id: 'subj_farmc4', name: 'Farmacología Clínica', order: 2, course_id: 'course_sem4', code: 'MFRC04-13', color: '#c026d3' }, // fuchsia
    { id: 'subj_imag4', name: 'Imagenología Anatómica', order: 3, course_id: 'course_sem4', code: 'MIA04-13', color: '#0f766e' }, // dark teal
    { id: 'subj_micro4', name: 'Microbiología', order: 4, course_id: 'course_sem4', code: 'MM04-13', color: '#9f1239' }, // crimson
    { id: 'subj_medp4', name: 'Medicina Preventiva', order: 5, course_id: 'course_sem4', code: 'MMP04-13', color: '#4338ca' }, // indigo
    { id: 'subj_path4', name: 'Patología Humana', order: 6, course_id: 'course_sem4', code: 'MPH04-13', color: '#be123c' }, // deep rose
    { id: 'subj_prop4', name: 'Propedéutica Médica', order: 7, course_id: 'course_sem4', code: 'MPM04-13', color: '#166534' }, // deep green
];

// ─── PARCIAL COLOR PALETTE (4 distinct pastels per slot) ─────────────────────
// Parcial 1: Sky blue  |  2: Emerald green  |  3: Amber gold  |  4: Rose pink
const PARCIAL_ACCENT = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];

// ─── CARPETAS (4 Parciales por materia, color heredado del parcial) ──────────
const buildFolders = () => {
    const folders = [];
    for (const subj of mockSubjects) {
        for (let p = 1; p <= 4; p++) {
            folders.push({
                id: `folder_${subj.id}_p${p}`,
                name: `Parcial ${p}`,
                order: p,
                subject_id: subj.id,
                parent_id: null,
                color: PARCIAL_ACCENT[p - 1],
            });
        }
    }
    return folders;
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
