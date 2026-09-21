const OPEN_ENDED_TYPES = new Set(['enumeracion', 'numerico', 'respuesta_corta', 'cloze', 'relacion', 'secuencia']);

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
  const type = String(question.tipo || question.type || question.qt || 'multiple-choice').toLowerCase();
  const isOpenEnded = OPEN_ENDED_TYPES.has(type);
  const explanation = question.feedback ?? question.justificacion ?? question.justificación ?? question.explanation ?? question.rationale ?? '';

  if (isOpenEnded) {
    return {
      ...question,
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
  const input = question.answerOptions ?? question.options ?? question.opciones ?? [];
  const rawOptions = Array.isArray(input)
    ? input
    : input && typeof input === 'object'
      ? Object.entries(input).map(([label, value]) => typeof value === 'object' && value !== null ? { label, ...value } : { label, text: value })
      : [];

  const answerOptions = rawOptions.map((raw, optionIndex) => {
    const option = typeof raw === 'object' && raw !== null ? raw : {};
    const text = optionText(raw);
    const label = String(option.label ?? option.letra ?? String.fromCharCode(65 + optionIndex)).trim();
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

  return {
    ...question,
    type,
    question: question.question ?? question.prompt ?? question.pregunta ?? question.enunciado ?? question.text ?? question.x ?? `Pregunta ${index + 1}`,
    questionId: question.questionId ?? question.id ?? `Q${index + 1}`,
    difficulty: question.difficulty ?? 'moderado',
    bloomLevel: question.bloomLevel ?? 'Comprender',
    hint: question.hint ?? question.pista ?? '',
    feedback: explanation,
    justificacion: explanation,
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

    if (!OPEN_ENDED_TYPES.has(type)) {
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
      : [];
  const questions = rawQuestions.map(normalizeQuizQuestion);
  const title = String(quiz.title || quiz.bloque?.titulo || fallbackTitle).trim();
  const description = quiz.description || (quiz.bloque ? `Sesión: ${quiz.bloque.sesion || ''} | Páginas: ${quiz.bloque.paginas || ''}` : '');

  return {
    ...quiz,
    id: quiz.id || quiz.bloque?.id || `quiz_${Date.now()}`,
    title,
    description,
    folder_id: quiz.folder_id || (quiz.bloque ? 'folder_capitulos_cortados' : null),
    subject_id: quiz.subject_id || (quiz.bloque ? 'subj_anatomia' : null),
    questions,
    total_questions: questions.length
  };
}

