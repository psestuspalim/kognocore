// Utilidades para conversión de formatos de quiz

// Mapeo de dificultades
const difficultyToNumber = {
  'fácil': 1,
  'easy': 1,
  'moderado': 2,
  'medium': 2,
  'moderate': 2,
  'difícil': 3,
  'hard': 3,
  'difficult': 3
};

const numberToDifficulty = {
  1: 'fácil',
  2: 'moderado',
  3: 'difícil'
};

// Mapeo de niveles Bloom
const bloomTextToNumber = {
  'Recordar': 1,
  'Comprender': 2,
  'Aplicar': 3,
  'Analizar': 4,
  'Evaluar': 5,
  'Crear': 6
};

/**
 * Convierte cualquier formato de quiz a formato compacto longitudinal
 * Estructura: {t: "título", q: [{x, dif, qt, id, sj, tp, sb, o}]}
 */
export function toCompactFormat(quizData) {
  const { title, description, questions = [], total_questions } = quizData;

  return {
    t: title || 'Quiz sin título',
    q: questions.map((q, idx) => {
      const diffNum = typeof q.difficulty === 'string'
        ? difficultyToNumber[q.difficulty.toLowerCase()] || 2
        : q.difficulty || 2;

      return {
        x: q.question || q.questionText || q.text || '',
        dif: diffNum,
        qt: q.type || 'mcq',
        id: q.id || q.questionId || `Q${String(idx + 1).padStart(3, '0')}`,
        sj: q.subject || '',
        tp: q.topic || '',
        sb: q.subtopic || '',
        img: q.imageUrl || undefined,
        hint: q.hint || undefined,
        o: (q.answerOptions || q.options || []).map((opt) => ({
          text: opt.text || opt,
          c: opt.isCorrect === true,
          r: opt.rationale || '',
          et: opt.errorType || ''
        }))
      };
    })
  };
}

/**
 * Convierte de formato compacto a formato expandido para uso en componentes
 * Soporta: formato longitudinal {t, q:[{x, dif, qt...}]}, formato viejo {m, q}
 */
export function fromCompactFormat(compactData) {
  // Detectar formato longitudinal (t es opcional si q tiene estructura correcta)
  const isLongitudinalFormat = compactData && Array.isArray(compactData.q) &&
    compactData.q.length > 0 && compactData.q[0].x;

  // Detectar formato viejo (m, q)
  const isOldFormat = compactData && compactData.m && compactData.q;

  if (!isLongitudinalFormat && !isOldFormat) {
    // Ya está expandido
    return compactData;
  }

  // Formato longitudinal: {t: "título", q: [{x, dif, qt, id, sj, tp, sb, o}]}
  if (isLongitudinalFormat) {
    const { t, q } = compactData;

    return {
      title: t || 'Quiz sin título',
      description: '',
      total_questions: q.length,
      questions: q.map(question => ({
        type: question.qt === 'image' ? 'image' : 'text',
        question: question.x || '',
        imageUrl: question.img || null,
        difficulty: numberToDifficulty[question.dif] || 'moderado',
        questionId: question.id || '',
        subject: question.sj || '',
        topic: question.tp || '',
        subtopic: question.sb || '',
        hint: question.hint || '',
        answerOptions: (question.o || []).map(opt => ({
          text: opt.text || opt.t || '',
          label: opt.label || opt.l || '',
          isCorrect: opt.c === true,
          rationale: opt.r || '',
          errorType: opt.et || ''
        }))
      }))
    };
  }

  // Formato viejo (cQ-v2): {m, q}
  const { m, q } = compactData;

  return {
    title: m.t,
    description: m.s || '',
    total_questions: m.c || q.length,
    questions: q.map(question => {
      let generalFeedback = question.n || '';
      if (!generalFeedback && question.o) {
        const incorrectOpts = question.o.filter(opt => opt.c !== 1);
        if (incorrectOpts.length > 0 && incorrectOpts[0].r) {
          generalFeedback = incorrectOpts[0].r;
        }
      }

      return {
        type: 'text',
        question: question.x,
        difficulty: numberToDifficulty[question.d] || 'moderado',
        bloomLevel: question.b || null,
        feedback: generalFeedback,
        hint: question.h || '',
        answerOptions: (question.o || []).map(opt => ({
          text: opt.text || opt.v,
          isCorrect: opt.c === true || opt.c === 1,
          errorType: opt.et || opt.e || '',
          rationale: opt.r || opt.f || ''
        }))
      };
    })
  };
}

/**
 * Detecta si un quiz está en formato compacto
 */
export function isCompactFormat(data) {
  // Formato longitudinal: {q: [{x, ...}]} (t es opcional)
  const isLongitudinalFormat = data && Array.isArray(data.q) &&
    data.q.length > 0 && data.q[0].x;
  // Formato viejo: {m, q}
  const isOldFormat = data && data.m && data.q && data.m.v === 'cQ-v2';

  return isLongitudinalFormat || isOldFormat;
}