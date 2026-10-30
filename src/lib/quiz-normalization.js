export const OPEN_ENDED_TYPES = new Set(['definicion', 'enumeracion', 'numerico', 'respuesta_corta', 'cloze', 'relacion', 'secuencia']);

export function normalizeQuestionType(type = '') {
  const t = String(type || '')
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]/g, '_');
  if (t === 'short_answer' || t === 'texto' || t === 'abierta') return 'respuesta_corta';
  if (t === 'numeric') return 'numerico';
  if (t === 'matching') return 'relacion';
  return t;
}

const optionText = (option) => {
  if (typeof option === 'string' || typeof option === 'number') return String(option).trim();
  if (!option || typeof option !== 'object') return '';
  return String(option.text ?? option.texto ?? option.answerText ?? option.value ?? option.v ?? option.t ?? option.label ?? '').trim();
};

const correctKey = (question) => String(
  question.correctAnswer ??
  question.correct_answer ??
  question.correcta ??
  question.respuesta_correcta ??
  question.respuesta?.letra ??
  (typeof question.respuesta === 'string' ? question.respuesta : '') ??
  ''
).trim().toLowerCase();

const matchesCorrectKey = (key, text, index, label) => {
  if (!key) return false;
  const normalizedLabel = String(label || String.fromCharCode(97 + index)).trim().toLowerCase();
  return key === normalizedLabel || key === String(index) || key === String(index + 1) || key === text.toLowerCase();
};

export function normalizeQuizQuestion(question = {}, index = 0) {
  const rawType = question.tipo || question.type || question.qt;
  let type = normalizeQuestionType(rawType) || 'multiple-choice';

  const hasOptions = (Array.isArray(question.answerOptions) && question.answerOptions.length > 0)
    || (Array.isArray(question.options) && question.options.length > 0)
    || (question.options && typeof question.options === 'object' && Object.keys(question.options).length > 0)
    || Boolean(question.opciones);

  if (!OPEN_ENDED_TYPES.has(type) && !hasOptions && question.respuesta) {
    if (question.respuesta.modelo) type = 'definicion';
    else if (question.respuesta.blancos || question.blancos) type = 'cloze';
    else if (question.respuesta.pares) type = 'relacion';
    else if (question.respuesta.elementos || question.respuesta.pasos) type = 'enumeracion';
    else if (question.respuesta.valor !== undefined || question.respuesta.rango) type = 'numerico';
    else if (question.respuesta.canonico) type = 'respuesta_corta';
  }

  const isOpenEnded = OPEN_ENDED_TYPES.has(type);
  const explanation = question.feedback ?? question.justificacion ?? question.justificación ?? question.explanation ?? question.rationale ?? '';

  if (isOpenEnded) {
    const respuesta = { ...question.respuesta };
    let blancos = question.blancos ?? respuesta.blancos;
    if (type === 'cloze' && Array.isArray(blancos)) {
      blancos = Object.assign({}, ...blancos);
    }
    if (type === 'cloze') respuesta.blancos = blancos;
    if (type === 'relacion' && Array.isArray(respuesta.pares)) {
      respuesta.pares = respuesta.pares.map((par) => ({
        ...par,
        clave: par.clave ?? par.izq,
        canonico: par.canonico ?? par.der
      }));
    }
    return {
      ...question,
      respuesta,
      ...(type === 'cloze' ? {
        blancos,
        texto: String(question.texto ?? question.prompt ?? question.question ?? '').replace(/\[(c\d+)\]/g, '{{$1}}')
      } : {}),
      type,
      question: question.prompt ?? question.question ?? question.enunciado ?? question.texto ?? `Pregunta ${index + 1}`,
      questionId: question.questionId ?? question.id ?? `Q${index + 1}`,
      difficulty: question.difficulty ?? (question.dificultad === 1 ? 'fácil' : question.dificultad === 3 ? 'difícil' : 'moderado'),
      bloomLevel: question.bloomLevel ?? 'Aplicar',
      hint: question.hint ?? question.pista ?? '',
      feedback: explanation,
      justificacion: explanation,
      answerOptions: [],
      correctAnswer: null
    };
  }

  const key = correctKey(question);
  const input = question.answerOptions ?? question.options ?? question.opciones ?? question.o ?? [];
  const rawOptions = Array.isArray(input)
    ? input
    : input && typeof input === 'object'
      ? Object.entries(input).map(([label, value]) => typeof value === 'object' && value !== null ? { label, ...value } : { label, text: value })
      : [];

  const answerOptions = rawOptions.map((raw, optionIndex) => {
    const option = typeof raw === 'object' && raw !== null ? raw : {};
    const text = optionText(raw);
    const label = String(option.label ?? option.letra ?? option.l ?? String.fromCharCode(65 + optionIndex)).trim();
    const explicitlyCorrect = option.isCorrect === true || option.correct === true || option.c === true || option.c === 1;
    const isCorrect = explicitlyCorrect || matchesCorrectKey(key, text, optionIndex, label);
    return {
      ...option,
      id: String(option.id ?? optionIndex),
      label,
      text,
      isCorrect,
      rationale: option.rationale ?? option.r ?? option.justificacion ?? option.justificación ?? option.explanation ?? (isCorrect ? explanation : ''),
      errorType: option.errorType ?? option.et ?? (isCorrect ? '' : 'conceptual')
    };
  }).filter((option) => option.text);

  const correctOption = answerOptions.find((option) => option.isCorrect);
  const finalExplanation = explanation || correctOption?.rationale || '';

  return {
    ...question,
    type,
    question: question.question ?? question.prompt ?? question.pregunta ?? question.enunciado ?? question.text ?? question.x ?? `Pregunta ${index + 1}`,
    questionId: question.questionId ?? question.id ?? `Q${index + 1}`,
    difficulty: question.difficulty ?? (question.dif === 1 || question.dificultad === 1 ? 'fácil' : question.dif === 3 || question.dificultad === 3 ? 'difícil' : 'moderado'),
    bloomLevel: question.bloomLevel ?? 'Comprender',
    hint: question.hint ?? question.pista ?? '',
    feedback: finalExplanation,
    justificacion: finalExplanation,
    answerOptions,
    correctAnswer: answerOptions.findIndex((option) => option.isCorrect)
  };
}

export function validateNormalizedQuiz(quiz = {}) {
  const errors = [];
  const title = quiz.title || quiz.bloque?.titulo || '';
  if (!String(title).trim()) errors.push({ text: 'El cuestionario necesita un título.', qIndex: null });
  
  const questions = Array.isArray(quiz.questions) ? quiz.questions : (Array.isArray(quiz.items) ? quiz.items : []);
  if (questions.length === 0) {
    errors.push({ text: 'El cuestionario necesita al menos una pregunta.', qIndex: null });
    return errors;
  }

  questions.forEach((question, index) => {
    const prefix = `P${index + 1}`;
    const type = String(question.tipo || question.type || 'multiple-choice').toLowerCase();
    const prompt = question.question || question.prompt || question.enunciado || question.texto;
    if (!String(prompt || '').trim()) errors.push({ text: `${prefix}: falta el enunciado.`, qIndex: index + 1 });

    if (OPEN_ENDED_TYPES.has(type)) {
      const answer = question.respuesta || {};
      const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
      const hasCanonical = (value) => hasText(value?.canonico);
      const hasElements = (value) => Array.isArray(value) && value.length > 0 && value.every(hasCanonical);
      let valid = true;
      if (type === 'respuesta_corta') valid = hasCanonical(answer);
      if (type === 'definicion') valid = hasText(answer.modelo) && Array.isArray(answer.palabras_clave) && answer.palabras_clave.length > 0;
      if (type === 'numerico') valid = Number.isFinite(answer.valor) ||
        (Array.isArray(answer.rango) && answer.rango.length === 2 && answer.rango.every(Number.isFinite) && answer.rango[0] <= answer.rango[1]);
      if (type === 'enumeracion' || type === 'secuencia') valid = hasElements(answer.elementos ?? answer.pasos);
      if (type === 'relacion') valid = hasElements(answer.pares) && answer.pares.every((pair) => hasText(pair.clave)) &&
        new Set(answer.pares.map((pair) => pair.clave)).size === answer.pares.length;
      if (type === 'cloze') {
        const blanks = question.blancos ?? answer.blancos ?? {};
        const keys = Object.keys(blanks);
        const markers = [...String(question.texto ?? prompt).matchAll(/\{\{(c\d+)\}\}/g)].map((match) => match[1]);
        valid = !Array.isArray(blanks) && keys.length > 0 && keys.every((key) => hasCanonical(blanks[key]) && markers.includes(key)) &&
          markers.every((key) => keys.includes(key));
      }
      if (!valid) errors.push({ text: `${prefix}: respuesta incompleta o inválida para ${type}.`, qIndex: index + 1 });
    } else {
      const options = Array.isArray(question.answerOptions) ? question.answerOptions : (question.options || []);
      if (options.length < 2) errors.push({ text: `${prefix}: necesita al menos dos opciones.`, qIndex: index + 1 });
      const correctCount = options.filter((option) => option.isCorrect || option.correct).length;
      const isMultiple = question.type === 'image-multiple' || question.multiple === true || question.allowMultiple === true;
      if (correctCount === 0) errors.push({ text: `${prefix}: no tiene respuesta correcta.`, qIndex: index + 1 });
      if (!isMultiple && correctCount > 1) errors.push({ text: `${prefix}: solo puede tener una respuesta correcta.`, qIndex: index + 1 });
    }
  });
  return errors;
}

export function normalizeExpandedQuiz(quiz = {}, fallbackTitle = 'Cuestionario') {
  const rawQuestions = Array.isArray(quiz.questions)
    ? quiz.questions
    : Array.isArray(quiz.items)
      ? quiz.items
      : Array.isArray(quiz.preguntas)
        ? quiz.preguntas
        : Array.isArray(quiz.q) ? quiz.q : [];
  const questions = rawQuestions.map(normalizeQuizQuestion);
  const title = String(quiz.title || quiz.titulo || quiz.bloque?.titulo || quiz.metadata?.title || quiz.metadata?.titulo || fallbackTitle).trim();
  const description = quiz.description || (quiz.metadata?.source ? `Fuente: ${quiz.metadata.source}` : '') || (quiz.bloque ? `Sesión: ${quiz.bloque.sesion || ''} | Páginas: ${quiz.bloque.paginas || ''}` : '');

  return {
    ...quiz,
    id: quiz.id || quiz.bloque?.id || `quiz_${Date.now()}`,
    title,
    description,
    folder_id: quiz.folder_id || (quiz.bloque?.id === 'P1-B23' || /diagn[oó]stic|evaluaci[oó]n.*progreso/i.test(title) ? 'folder_diagnosticos' : (quiz.bloque ? 'folder_capitulos_cortados' : (/fisio/i.test(quiz.metadata?.sj || '') || /respiratorio|fisiolog/i.test(title)) ? 'folder_fisiologia' : null)),
    subject_id: quiz.subject_id || (quiz.bloque ? 'subj_anatomia' : (/fisio/i.test(quiz.metadata?.sj || '') || /respiratorio|fisiolog/i.test(title)) ? 'subj_fisiologia' : null),
    questions,
    total_questions: questions.length
  };
}
