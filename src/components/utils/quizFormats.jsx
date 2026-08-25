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
 * Detecta si los datos están en el formato simplificado en español
 * Ejemplo: [{ id: 1, pregunta: "...", opciones: { a: "...", b: "..." }, correcta: "d", justificacion: "..." }]
 */
export function isSimplifiedFormat(data) {
  if (!data) return false;

  // Array directo de preguntas simplificadas
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    return Boolean(first && (first.pregunta || (first.opciones && typeof first.opciones === 'object')));
  }

  // Objeto contenedor con array de preguntas simplificadas (ej: { preguntas: [...] } o { questions: [...] })
  const items = data.preguntas || data.questions || data.q || data.items;
  if (Array.isArray(items) && items.length > 0) {
    const first = items[0];
    return Boolean(first && (first.pregunta || (first.opciones && typeof first.opciones === 'object')));
  }

  // Objeto individual de pregunta simplificada
  if (typeof data === 'object' && !Array.isArray(data) && data.pregunta && data.opciones) {
    return true;
  }

  return false;
}

/**
 * Convierte un item o lista de formato simplificado al formato estándar expandido
 */
export function fromSimplifiedFormat(data) {
  let list = [];
  let title = 'Cuestionario';
  let description = '';

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    title = data.metadata?.titulo || data.metadata?.title || (data.metadata?.fuente ? `Simulador ${data.metadata.fuente}` : '') || data.titulo || data.title || data.nombre || title;
    description = (data.metadata?.fecha ? `Fecha: ${data.metadata.fecha}. ` : '') + (data.metadata?.descripcion || data.descripcion || data.description || '');
    list = data.preguntas || data.questions || data.q || data.items || [data];
  }

  const questions = list.map((item, idx) => {
    const questionText = item.pregunta || item.question || item.enunciado || item.text || `Pregunta ${idx + 1}`;
    const questionId = item.numero != null ? String(item.numero) : (item.id != null ? String(item.id) : `Q${idx + 1}`);
    const justificacion = item.justificacion || item.justificación || item.explicacion || item.explicación || item.explanation || item.feedback || '';
    
    // Detect correct key from various schema formats
    const correctaKey = String(
      item.correcta ||
      item.respuesta?.letra ||
      (typeof item.respuesta === 'string' ? item.respuesta : '') ||
      item.respuesta_correcta ||
      item.correctAnswer ||
      ''
    ).trim().toLowerCase();

    const serie = item.serie || null;

    let answerOptions = [];

    if (item.opciones && typeof item.opciones === 'object' && !Array.isArray(item.opciones)) {
      // Objeto clave-valor: { a: "...", b: "...", c: "...", d: "..." }
      answerOptions = Object.entries(item.opciones).map(([key, val]) => {
        const cleanKey = key.trim().toLowerCase();
        const isCorrect = cleanKey === correctaKey;
        const text = typeof val === 'object' && val !== null ? (val.texto || val.text || val.t || '') : String(val);
        return {
          label: key.trim().toUpperCase(),
          text: text,
          isCorrect: isCorrect,
          rationale: isCorrect ? justificacion : '',
          errorType: isCorrect ? '' : 'conceptual'
        };
      });
    } else if (Array.isArray(item.opciones || item.options || item.answerOptions)) {
      // Array de opciones (ej: [{ letra: "a", texto: "..." }, ...])
      const rawOptions = item.opciones || item.options || item.answerOptions;
      answerOptions = rawOptions.map((opt, optIdx) => {
        const defaultLabel = String.fromCharCode(65 + optIdx); // A, B, C, D...
        const optLetra = typeof opt === 'object' && opt !== null && opt.letra ? String(opt.letra).trim().toLowerCase() : defaultLabel.toLowerCase();
        const label = typeof opt === 'object' && opt !== null && opt.letra ? String(opt.letra).trim().toUpperCase() : defaultLabel;
        
        const isCorrect = typeof opt === 'object' && opt !== null
          ? (opt.isCorrect === true || opt.c === true || correctaKey === optLetra || correctaKey === String(optIdx))
          : (correctaKey === optLetra || correctaKey === String(optIdx));
        
        const text = typeof opt === 'object' && opt !== null ? (opt.texto || opt.text || opt.t || opt.v || '') : String(opt);

        return {
          label: label,
          text: text,
          isCorrect: isCorrect,
          rationale: isCorrect ? justificacion : (opt.rationale || opt.r || ''),
          errorType: isCorrect ? '' : (opt.errorType || opt.et || 'conceptual')
        };
      });
    }

    return {
      type: 'text',
      question: questionText,
      difficulty: 'moderado',
      bloomLevel: 'Comprender',
      questionId: questionId,
      serie: serie,
      feedback: justificacion,
      justificacion: justificacion,
      hint: item.pista || item.hint || '',
      answerOptions: answerOptions
    };
  });

  return {
    title: title,
    description: description,
    total_questions: questions.length,
    questions: questions
  };
}

/**
 * Convierte cualquier formato de quiz a formato compacto longitudinal
 * Estructura: {t: "título", q: [{x, dif, qt, id, sj, tp, sb, o}]}
 */
export function toCompactFormat(quizData) {
  if (isSimplifiedFormat(quizData)) {
    quizData = fromSimplifiedFormat(quizData);
  }

  const { title, description, questions = [], total_questions } = quizData;

  return {
    t: title || 'Quiz sin título',
    q: questions.map((q, idx) => {
      const diffNum = typeof q.difficulty === 'string'
        ? difficultyToNumber[q.difficulty.toLowerCase()] || 2
        : q.difficulty || 2;

      return {
        x: q.question || q.questionText || q.text || q.pregunta || '',
        dif: diffNum,
        qt: q.type || 'mcq',
        id: q.id || q.questionId || `Q${String(idx + 1).padStart(3, '0')}`,
        sj: q.subject || '',
        tp: q.topic || '',
        sb: q.subtopic || '',
        serie: q.serie || undefined,
        img: q.imageUrl || undefined,
        hint: q.hint || q.pista || undefined,
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
 * Convierte de formato compacto, simplificado o legado a formato expandido para uso en componentes
 */
export function fromCompactFormat(compactData) {
  if (!compactData) return { title: 'Quiz', questions: [] };

  // Detectar formato simplificado { pregunta, opciones: { a, b }, correcta, justificacion }
  if (isSimplifiedFormat(compactData)) {
    return fromSimplifiedFormat(compactData);
  }

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
        serie: question.serie || null,
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
 * Detecta si un quiz está en formato compacto o requiere normalización
 */
export function isCompactFormat(data) {
  if (isSimplifiedFormat(data)) return true;

  // Formato longitudinal: {q: [{x, ...}]} (t es opcional)
  const isLongitudinalFormat = data && Array.isArray(data.q) &&
    data.q.length > 0 && data.q[0].x;
  // Formato viejo: {m, q}
  const isOldFormat = data && data.m && data.q && data.m.v === 'cQ-v2';

  return isLongitudinalFormat || isOldFormat;
}