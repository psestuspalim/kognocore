import { useState, useRef } from 'react';
import { AlertCircle, Loader2, Search, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { fromCompactFormat, isSimplifiedFormat, fromSimplifiedFormat } from '../utils/quizFormats';

export default function FileUploader({ onUploadSuccess, jsonOnly = false }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null); // { message, line, column, position, questionIndex }
  const [jsonText, setJsonText] = useState('');
  const [jsonErrors, setJsonErrors] = useState([]);
  const textareaRef = useRef(null);

  // Helper para normalizar opciones
  const normalizeOptionText = (opt) => {
    if (typeof opt === 'string') return opt.trim();
    if (!opt || typeof opt !== 'object') return '';
    return String(opt.text ?? opt.answerText ?? opt.value ?? opt.v ?? opt.t ?? opt.label ?? '').trim();
  };

  const normalizeAnswerOptions = (input) => {
    let raw = [];
    if (Array.isArray(input)) raw = input;
    else if (input && typeof input === 'object') {
      raw = Object.entries(input).map(([label, text]) => ({ label, text }));
    }

    return raw
      .map((opt, idx) => {
        const text = normalizeOptionText(opt);
        if (!text) return null;
        return {
          id: String(opt?.id ?? idx),
          text,
          isCorrect: Boolean(opt?.isCorrect ?? opt?.c),
          rationale: opt?.rationale ?? opt?.r ?? ''
        };
      })
      .filter(Boolean);
  };

  const processJsonData = async (data, fileName = 'Quiz') => {
    let questions = [];
    let title = fileName.replace('.json', '');
    let description = '';

    // FORMATO SIMPLIFICADO ESPAÑOL { id, pregunta, opciones, correcta, justificacion, serie }
    if (isSimplifiedFormat(data)) {
      const simplified = fromSimplifiedFormat(data);
      title = simplified.title !== 'Cuestionario' ? simplified.title : title;
      description = simplified.description || '';
      questions = simplified.questions;
      return { title, description, questions };
    }

    // FORMATO NUEVO {t, q} con estructura compacta
    if (data.t && data.q && Array.isArray(data.q) && !data.m) {
      const expanded = fromCompactFormat(data);
      title = expanded.title || title;
      description = expanded.description || '';
      questions = expanded.questions;
    }
    // FORMATO ARRAY DIRECTO
    else if (Array.isArray(data)) {
      questions = data.map(q => ({
        question: q.question,
        answerOptions: normalizeAnswerOptions(q.answerOptions || q.options),
        correctAnswer: normalizeAnswerOptions(q.answerOptions || q.options).findIndex(o => o.isCorrect),
        type: 'multiple-choice',
        difficulty: 'moderado',
        bloomLevel: 'Comprender',
        tags: [],
        hint: q.hint || ''
      }));
    }
    // FORMATO METADATA NUEVO {metadata, q}
    else if (data.metadata && data.q && Array.isArray(data.q)) {
      title = data.metadata.title || title;
      description = `Tema: ${data.metadata.tp || ''} (${data.metadata.total} preguntas)`;
      const difMap = { 1: 'fácil', 2: 'moderado', 3: 'difícil' };

      questions = data.q.map(q => ({
        question: q.x,
        type: 'multiple-choice',
        difficulty: difMap[q.dif] || 'moderado',
        bloomLevel: 'Comprender',
        tags: [data.metadata.sj, data.metadata.tp, q.sb].filter(Boolean),
        hint: '',
        answerOptions: normalizeAnswerOptions(q.o),
        correctAnswer: q.o.findIndex(o => o.c)
      }));
    }
    // FORMATO CON WRAPPER 'quiz'
    else if (data.quiz && Array.isArray(data.quiz)) {
      title = data.title || title;
      questions = data.quiz.map(q => ({
        question: q.question,
        answerOptions: normalizeAnswerOptions(q.answerOptions || q.options),
        correctAnswer: normalizeAnswerOptions(q.answerOptions || q.options).findIndex(o => o.isCorrect),
        type: 'multiple-choice',
        difficulty: 'moderado',
        bloomLevel: 'Comprender',
        tags: [],
        hint: q.hint || ''
      }));
    }
    // FORMATO COMPLETO ESTÁNDAR
    else if (data.questions && Array.isArray(data.questions)) {
      title = data.title || title;
      description = data.description || '';
      questions = data.questions;
    }
    else {
      throw new Error('Formato JSON no reconocido');
    }

    return { title, description, questions };
  };

  const parseSyntaxError = (errMessage, text) => {
    let position = null;
    let line = null;
    let column = null;

    // Buscar "position (\d+)" o "at (\d+)"
    const posMatch = errMessage.match(/position\s+(\d+)/i) || errMessage.match(/at\s+(\d+)/i);
    if (posMatch) {
      position = parseInt(posMatch[1], 10);
    }

    // Buscar "line (\d+)" y "column (\d+)"
    const lineMatch = errMessage.match(/line\s+(\d+)/i);
    const colMatch = errMessage.match(/column\s+(\d+)/i);
    if (lineMatch) line = parseInt(lineMatch[1], 10);
    if (colMatch) column = parseInt(colMatch[1], 10);

    // Si tenemos position pero no line, calcular línea
    if (position !== null && line === null) {
      const upToError = text.slice(0, position);
      const lines = upToError.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else if (line !== null && position === null) {
      const lines = text.split('\n');
      let currentPos = 0;
      for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
        currentPos += lines[i].length + 1; // +1 por el \n
      }
      position = currentPos + (column ? Math.max(0, column - 1) : 0);
    }

    return { message: errMessage, line, column, position };
  };

  const validateJsonSchema = (data) => {
    const errors = [];
    const warnings = [];
    const info = [];

    // Validar estructura base
    if (!isSimplifiedFormat(data) && !Array.isArray(data) && !data.quiz && !data.questions && (!data.t || !data.q) && (!data.metadata || !data.q)) {
      errors.push({
        text: "❌ Estructura raíz inválida. Se espera array de preguntas o formato simplificado {id, pregunta, opciones, correcta}",
        qIndex: null
      });
      return { errors, warnings, info };
    }

    // Identificar formato simplificado
    if (isSimplifiedFormat(data)) {
      info.push({ text: "ℹ️ Formato simplificado (ENARM / Médico) detectado" });
      try {
        const expanded = fromSimplifiedFormat(data);
        info.push({ text: `ℹ️ ${expanded.questions.length} preguntas encontradas` });
        expanded.questions.forEach((q, idx) => {
          if (!q.question) {
            errors.push({ text: `❌ P${idx + 1}: Falta el enunciado 'pregunta'`, qIndex: idx + 1 });
          }
          if (!q.answerOptions || q.answerOptions.length === 0) {
            errors.push({ text: `❌ P${idx + 1}: Faltan 'opciones' de respuesta`, qIndex: idx + 1 });
          } else {
            const correct = q.answerOptions.filter(o => o.isCorrect);
            if (correct.length === 0) {
              warnings.push({ text: `⚠️ P${idx + 1}: La clave 'correcta' no coincide con ninguna opción`, qIndex: idx + 1 });
            }
          }
        });
      } catch (err) {
        errors.push({ text: "❌ Error al procesar formato simplificado: " + err.message, qIndex: null });
      }
      return { errors, warnings, info };
    }

    // Otros formatos
    if (data.t && data.q) {
      info.push({ text: "ℹ️ Formato compacto detectado" });
      if (!Array.isArray(data.q)) errors.push({ text: "❌ 'q' (preguntas) debe ser un array", qIndex: null });
      else info.push({ text: `ℹ️ ${data.q.length} preguntas encontradas` });
    } else {
      let qs = Array.isArray(data) ? data : (data.quiz || data.questions);
      info.push({ text: `ℹ️ ${qs.length} preguntas encontradas` });

      qs.forEach((q, idx) => {
        if (!q.question) errors.push({ text: `❌ P${idx + 1}: Falta el texto de la pregunta`, qIndex: idx + 1 });
        if (!q.answerOptions || !Array.isArray(q.answerOptions)) {
          errors.push({ text: `❌ P${idx + 1}: Faltan opciones de respuesta`, qIndex: idx + 1 });
        } else {
          const correct = q.answerOptions.filter(o => o.isCorrect);
          if (correct.length === 0) warnings.push({ text: `⚠️ P${idx + 1}: No tiene respuesta correcta marcada`, qIndex: idx + 1 });
          if (correct.length > 1) warnings.push({ text: `⚠️ P${idx + 1}: Tiene múltiples respuestas correctas`, qIndex: idx + 1 });
        }
      });
    }

    return { errors, warnings, info };
  };

  const jumpToErrorPosition = (target) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const text = textarea.value;

    let targetStart = 0;
    let targetEnd = 0;

    // Si tenemos posición de carácter exacta
    if (target?.position !== null && target?.position !== undefined && target.position >= 0) {
      targetStart = Math.min(text.length, target.position);
      targetEnd = Math.min(text.length, target.position + 15);
    } 
    // Si tenemos número de línea
    else if (target?.line) {
      const lines = text.split('\n');
      let charCount = 0;
      for (let i = 0; i < Math.min(target.line - 1, lines.length); i++) {
        charCount += lines[i].length + 1;
      }
      targetStart = charCount;
      targetEnd = charCount + (lines[target.line - 1]?.length || 10);
    } 
    // Si tenemos número de pregunta (ej. P4 o questionId)
    else if (target?.qIndex) {
      // Buscar en el texto `"id": 4` o `"id": "4"` o `"pregunta"` número qIndex
      const idPattern = new RegExp(`"id"\\s*:\\s*["']?${target.qIndex}["']?`, 'i');
      const match = text.match(idPattern);
      if (match && match.index !== undefined) {
        targetStart = match.index;
        targetEnd = match.index + match[0].length + 20;
      } else {
        // Fallback: buscar el patrón de pregunta
        const lines = text.split('\n');
        let questionCount = 0;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('"pregunta"') || lines[i].includes('"question"') || lines[i].includes('"x"')) {
            questionCount++;
            if (questionCount === target.qIndex) {
              targetStart = charCount;
              targetEnd = charCount + lines[i].length;
              break;
            }
          }
          charCount += lines[i].length + 1;
        }
      }
    }

    // Enfocar y seleccionar
    textarea.focus();
    textarea.setSelectionRange(targetStart, targetEnd);

    // Calcular scroll en el textarea
    const linesBefore = text.slice(0, targetStart).split('\n').length;
    const lineHeight = 18; // approx font-mono text-xs line height
    textarea.scrollTop = Math.max(0, (linesBefore - 4) * lineHeight);

    // Scroll de la ventana al textarea
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePasteSubmit = async () => {
    if (!jsonText.trim()) return;

    try {
      setIsProcessing(true);
      setError(null);

      const parsed = JSON.parse(jsonText);
      const processed = await processJsonData(parsed);

      onUploadSuccess(processed);
      setJsonText('');
      setJsonErrors([]);
      setErrorDetails(null);
    } catch (err) {
      console.error('Error processing JSON:', err);
      setError(err.message || 'Error al procesar el JSON');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="p-6 shadow-sm border border-slate-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Pegar JSON del cuestionario
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Pega tu archivo JSON. El detector validará la sintaxis y estructura en tiempo real.
          </p>
        </div>

        {/* Textarea con selector directo */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            id="quiz-json-input"
            name="quiz-json"
            value={jsonText}
            onChange={(e) => {
              const text = e.target.value;
              setJsonText(text);
              setJsonErrors([]);
              setError(null);
              setErrorDetails(null);

              if (text.trim()) {
                try {
                  const parsed = JSON.parse(text);
                  const validation = validateJsonSchema(parsed);
                  if (validation.errors.length > 0) {
                    setJsonErrors([...validation.errors, ...validation.warnings, ...validation.info]);
                    setError(`${validation.errors.length} error(es) encontrado(s) en la estructura`);
                    if (validation.errors[0].qIndex) {
                      setErrorDetails({ qIndex: validation.errors[0].qIndex });
                    }
                  } else if (validation.warnings.length > 0 || validation.info.length > 0) {
                    setJsonErrors([...validation.info, ...validation.warnings]);
                  }
                } catch (err) {
                  if (err instanceof SyntaxError) {
                    const parsedError = parseSyntaxError(err.message, text);
                    setErrorDetails(parsedError);
                    setError(`Error de sintaxis: ${err.message}`);
                  }
                }
              }
            }}
            placeholder='Pega aquí tu archivo JSON...'
            className="min-h-[320px] max-h-[500px] font-mono text-xs mb-4 resize-y leading-relaxed bg-slate-50/50 focus:bg-white transition-colors"
            rows={16}
          />
        </div>

        {/* ALERTA DE ERROR CON BOTÓN "IR DIRECTO AL ERROR" */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 flex-1">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                  Error detectado
                </p>
                <p className="text-xs text-rose-800 mt-0.5">
                  {error}
                  {errorDetails?.line && ` (Línea ${errorDetails.line}${errorDetails.column ? `, Columna ${errorDetails.column}` : ''})`}
                </p>
              </div>
            </div>

            {errorDetails && (
              <Button
                type="button"
                size="sm"
                onClick={() => jumpToErrorPosition(errorDetails)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs px-3.5 h-9 shrink-0 shadow-sm flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Ir directo al error</span>
              </Button>
            )}
          </div>
        )}

        {/* Lista de Errores y Advertencias Detallada */}
        {jsonErrors.length > 0 && (
          <div className="mb-4 p-3.5 rounded-xl max-h-60 overflow-y-auto border bg-slate-50 border-slate-200">
            <p className="text-xs font-bold mb-2 text-slate-800 flex items-center gap-1.5">
              <span>Informe de validación:</span>
            </p>
            <div className="space-y-1.5">
              {jsonErrors.map((item, idx) => {
                const text = item.text || item;
                const isErr = text.startsWith('❌');
                const isWarn = text.startsWith('⚠️');

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-2 p-1.5 rounded-lg text-xs ${
                      isErr ? 'bg-rose-100/70 text-rose-900 font-medium' :
                      isWarn ? 'bg-amber-100/70 text-amber-900' :
                      'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <span className="flex-1">{text}</span>
                    {item.qIndex && (
                      <button
                        type="button"
                        onClick={() => jumpToErrorPosition({ qIndex: item.qIndex })}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded bg-white/80 hover:bg-white text-slate-700 border border-slate-300 flex items-center gap-1 shadow-2xs hover:text-indigo-600 transition-colors"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>Ir a P{item.qIndex}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handlePasteSubmit}
            disabled={isProcessing || !jsonText.trim() || Boolean(error)}
            className="bg-indigo-600 hover:bg-indigo-700 h-10 px-5 text-sm font-semibold rounded-xl"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isProcessing ? 'Procesando...' : 'Cargar cuestionario'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
