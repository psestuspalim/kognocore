import React, { useState } from 'react';
import { Upload, FileJson, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { toCompactFormat, fromCompactFormat } from '../utils/quizFormats';

export default function FileUploader({ onUploadSuccess, jsonOnly = false }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonErrors, setJsonErrors] = useState([]);

  const processJsonData = async (data, fileName = 'Quiz') => {
    let questions = [];
    let title = fileName.replace('.json', '');
    let description = '';

    // Mapeo de dificultad inglés a español
    const difficultyMap = {
      'easy': 'fácil',
      'medium': 'moderado',
      'hard': 'difícil',
      'moderate': 'moderado',
      1: 'fácil',
      2: 'moderado',
      3: 'difícil'
    };

    // Mapeo de Bloom codes
    const bloomMap = {
      1: 'Recordar',
      2: 'Comprender',
      3: 'Aplicar',
      4: 'Analizar',
      5: 'Evaluar'
    };

    // FORMATO NUEVO {t, q} con estructura compacta
    if (data.t && data.q && Array.isArray(data.q) && !data.m) {
      // Es un formato compactado, lo expandimos primero
      try {
        const expanded = fromCompactFormat(data);
        title = expanded.title || title;
        description = expanded.description || '';
        questions = expanded.questions;
      } catch (err) {
        throw new Error('Error al expandir formato compacto: ' + err.message);
      }
    }
    // FORMATO ARRAY DIRECTO
    else if (Array.isArray(data)) {
      questions = data.map(q => ({
        question: q.question,
        options: q.answerOptions.map((opt, idx) => ({
          id: String(idx),
          text: opt.text || opt.answerText,
          isCorrect: opt.isCorrect,
          rationale: opt.rationale
        })),
        correctAnswer: q.answerOptions.findIndex(o => o.isCorrect),
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
        bloomLevel: 'Comprender', // Default
        tags: [data.metadata.sj, data.metadata.tp, q.sb].filter(Boolean),
        hint: '',
        answerOptions: q.o.map((opt, idx) => ({
          id: String(idx),
          text: opt.t,
          isCorrect: opt.c,
          rationale: opt.r
        })).filter(o => o.text), // Ensure we have text
        correctAnswer: q.o.findIndex(o => o.c)
      }));
    }
    // FORMATO CON WRAPPER 'quiz'
    else if (data.quiz && Array.isArray(data.quiz)) {
      title = data.title || title;
      questions = data.quiz.map(q => ({
        question: q.question,
        options: q.answerOptions.map((opt, idx) => ({
          id: String(idx),
          text: opt.text || opt.answerText,
          isCorrect: opt.isCorrect,
          rationale: opt.rationale
        })),
        correctAnswer: q.answerOptions.findIndex(o => o.isCorrect),
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

  const validateJsonSchema = (data) => {
    const errors = [];
    const warnings = [];
    const info = [];

    // Validar estructura base
    if (!Array.isArray(data) && !data.quiz && !data.questions && (!data.t || !data.q) && (!data.metadata || !data.q)) {
      errors.push("❌ Estructura raíz inválida. Se espera array, objeto con 'quiz', 'questions', {metadata, q} o formato compacto {t, q}");
      return { errors, warnings, info };
    }

    // Identificar formato
    if (data.t && data.q) {
      info.push("ℹ️ Formato compacto detectado");
      if (!Array.isArray(data.q)) errors.push("❌ 'q' (preguntas) debe ser un array");
      else info.push(`ℹ️ ${data.q.length} preguntas encontradas`);
    } else if (data.metadata && data.q) {
      // VALIDACIÓN FORMATO METADATA
      info.push("ℹ️ Formato Metadata detectado");
      if (!Array.isArray(data.q)) errors.push("❌ 'q' (preguntas) debe ser un array");
      else {
        info.push(`ℹ️ ${data.q.length} preguntas encontradas`);
        data.q.forEach((q, idx) => {
          if (!q.x) errors.push(`❌ P${idx + 1}: Falta el enunciado 'x'`);
          if (!q.o || !Array.isArray(q.o)) {
            errors.push(`❌ P${idx + 1}: Faltan opciones 'o'`);
          } else {
            const correct = q.o.filter(o => o.c);
            if (correct.length === 0) warnings.push(`⚠️ P${idx + 1}: No tiene respuesta correcta marcada (c=true)`);
          }
        });
      }
    } else {
      let qs = Array.isArray(data) ? data : (data.quiz || data.questions);
      info.push(`ℹ️ ${qs.length} preguntas encontradas`);

      qs.forEach((q, idx) => {
        if (!q.question) errors.push(`❌ P${idx + 1}: Falta el texto de la pregunta`);
        if (!q.answerOptions || !Array.isArray(q.answerOptions)) {
          errors.push(`❌ P${idx + 1}: Faltan opciones de respuesta`);
        } else {
          const correct = q.answerOptions.filter(o => o.isCorrect);
          if (correct.length === 0) warnings.push(`⚠️ P${idx + 1}: No tiene respuesta correcta marcada`);
          if (correct.length > 1) warnings.push(`⚠️ P${idx + 1}: Tiene múltiples respuestas correctas`);
        }
      });
    }

    return { errors, warnings, info };
  };

  const handlePasteSubmit = async () => {
    if (!jsonText.trim()) return;

    try {
      setIsProcessing(true);
      setError(null);

      const parsed = JSON.parse(jsonText);
      const processed = await processJsonData(parsed);

      // Submit
      onUploadSuccess(processed);
      setJsonText('');
      setJsonErrors([]);
    } catch (err) {
      console.error('Error processing JSON:', err);
      setError(err.message || 'Error al procesar el JSON');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Pegar JSON del quiz
          </h3>
          <div className="text-sm text-gray-600 mb-4 space-y-2">
            <p className="font-semibold">Estructuras aceptadas:</p>
            <div className="bg-gray-50 p-3 rounded-md space-y-2 text-xs">
              <div>
                <p className="font-medium text-gray-700">1. Formato longitudinal (recomendado):</p>
                <code className="block mt-1 text-[10px]">{"{"}"t": "Título", "q": [{"{"}"x": "pregunta", "dif": 1-3, "qt": "mcq", "id": "Q001", "o": [{"{"}"text": "opción", "c": true/false, "r": "razonamiento"{"}"}]{"}"}]{"}"}</code>
              </div>
              <div>
                <p className="font-medium text-gray-700">2. Array directo con answerOptions:</p>
                <code className="block mt-1 text-[10px]">[{"{"}"question": "...", "answerOptions": [{"{"}"text": "...", "isCorrect": true, "rationale": "..."{"}"}], "hint": "..."{"}"}]</code>
              </div>
              <div>
                <p className="font-medium text-gray-700">3. Formato con wrapper "quiz":</p>
                <code className="block mt-1 text-[10px]">{"{"}"quiz": [{"{"}"question": "...", "answerOptions": [...]{"}"}]{"}"}</code>
              </div>
            </div>
          </div>
        </div>

        <Textarea
          id="quiz-json-input"
          name="quiz-json"
          value={jsonText}
          onChange={(e) => {
            const text = e.target.value;
            setJsonText(text);
            setJsonErrors([]);
            setError(null);

            if (text.trim()) {
              try {
                const parsed = JSON.parse(text);
                const validation = validateJsonSchema(parsed);
                if (validation.errors.length > 0) {
                  setJsonErrors([...validation.errors, ...validation.warnings, ...validation.info]);
                  setError(`${validation.errors.length} error(es) encontrado(s)`);
                } else if (validation.warnings.length > 0 || validation.info.length > 0) {
                  setJsonErrors([...validation.info, ...validation.warnings]);
                }
              } catch (err) {
                if (err instanceof SyntaxError) {
                  setError(`Sintaxis JSON inválida: ${err.message}`);
                }
              }
            }
          }}
          placeholder='Pega aquí tu JSON...'
          className="min-h-[300px] max-h-[500px] font-mono text-xs mb-4 resize-y"
          rows={15}
        />

        {jsonErrors.length > 0 && (
          <div className={`mb-4 p-3 rounded-lg max-h-60 overflow-y-auto border ${error ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1">
              {error ? (
                <>
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  <span className="text-red-900">Errores de validación:</span>
                </>
              ) : (
                <>
                  <span className="text-blue-900">✓ Información:</span>
                </>
              )}
            </p>
            <ul className="text-xs space-y-1">
              {jsonErrors.map((err, idx) => (
                <li key={idx} className={
                  err.startsWith('❌') ? 'text-red-700 font-medium' :
                    err.startsWith('⚠️') ? 'text-amber-700' :
                      'text-blue-700'
                }>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {error && !jsonErrors.length && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handlePasteSubmit}
            disabled={isProcessing || !jsonText.trim() || error}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isProcessing ? 'Procesando...' : 'Cargar cuestionario'}
          </Button>
        </div>
      </Card>
    </div>
  );
}