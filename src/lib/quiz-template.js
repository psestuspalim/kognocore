// Base structure accepted by the JSON importer: one example of every question
// type. tests/quiz-template.test.mjs keeps it valid against the importer rules.
export const QUIZ_TEMPLATE = {
  title: 'Título del cuestionario',
  description: 'Descripción breve (opcional)',
  questions: [
    {
      question: 'Opción múltiple: ¿cuál es el enunciado de la pregunta?',
      answerOptions: [
        { text: 'Opción correcta', isCorrect: true, rationale: 'Por qué es correcta (opcional).' },
        { text: 'Opción incorrecta 1', isCorrect: false, rationale: 'Por qué es incorrecta (opcional).' },
        { text: 'Opción incorrecta 2', isCorrect: false, rationale: '' },
        { text: 'Opción incorrecta 3', isCorrect: false, rationale: '' }
      ]
    },
    {
      tipo: 'respuesta_corta',
      prompt: 'Respuesta corta: escribe la pregunta que se contesta con un término.',
      respuesta: { canonico: 'respuesta esperada', acepta: ['sinónimo aceptado'] },
      feedback: 'Explicación que se muestra después de responder (opcional).'
    },
    {
      tipo: 'numerico',
      prompt: 'Numérica: escribe la pregunta cuya respuesta es un número.',
      respuesta: { rango: [60, 100] },
      feedback: 'Usa "rango": [mínimo, máximo] o "valor": número exacto.'
    },
    {
      tipo: 'enumeracion',
      prompt: 'Enumeración: menciona los elementos de la lista (en cualquier orden).',
      respuesta: {
        credito_parcial: true,
        elementos: [
          { canonico: 'primer elemento', acepta: ['sinónimo'] },
          { canonico: 'segundo elemento' },
          { canonico: 'tercer elemento' }
        ]
      }
    },
    {
      tipo: 'secuencia',
      prompt: 'Secuencia: ordena los pasos del proceso.',
      respuesta: {
        pasos: [
          { canonico: 'primer paso' },
          { canonico: 'segundo paso' },
          { canonico: 'tercer paso' }
        ]
      }
    },
    {
      tipo: 'cloze',
      prompt: 'Completa el enunciado:',
      texto: 'El texto lleva un hueco {{c1}} y otro hueco {{c2}}.',
      blancos: {
        c1: { canonico: 'primera palabra' },
        c2: { canonico: 'segunda palabra', acepta: ['variante aceptada'] }
      }
    },
    {
      tipo: 'relacion',
      prompt: 'Relación: escribe lo que corresponde a cada concepto.',
      respuesta: {
        pares: [
          { clave: 'Concepto A', canonico: 'correspondencia de A' },
          { clave: 'Concepto B', canonico: 'correspondencia de B' }
        ]
      }
    },
    {
      tipo: 'definicion',
      prompt: 'Definición: define brevemente el concepto.',
      calificacion: 'manual',
      respuesta: {
        modelo: 'Definición modelo contra la que se compara la respuesta.',
        palabras_clave: ['palabra clave 1', 'palabra clave 2']
      }
    }
  ]
};

export const QUIZ_TEMPLATE_TEXT = JSON.stringify(QUIZ_TEMPLATE, null, 2);
