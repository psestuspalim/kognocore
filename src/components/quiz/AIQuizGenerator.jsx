import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2, ArrowLeft, FileJson, Brain } from 'lucide-react';

export default function AIQuizGenerator({ subjectId, subjectName, onQuizGenerated, onCancel, subjects = [], showSubjectSelector = false }) {
  const [mode, setMode] = useState('topic'); // 'topic' or 'json'
  const [topic, setTopic] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');

  // Si ya tenemos un subjectId, no mostrar el selector
  const shouldShowSelector = showSubjectSelector && !subjectId;

  const handleGenerateFromTopic = async () => {
    if (!topic.trim()) {
      alert('Por favor ingresa un tema');
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = `Genera un cuestionario de opción múltiple sobre "${topic}" para la materia "${subjectName}".

Requisitos:
- Genera exactamente ${questionCount} preguntas
- Nivel de dificultad: ${difficulty === 'easy' ? 'fácil (conceptos básicos)' : difficulty === 'medium' ? 'intermedio' : 'difícil (casos clínicos complejos)'}
- Cada pregunta debe tener 4-5 opciones de respuesta
- Solo UNA opción debe ser correcta
- Incluye una explicación (rationale) para cada opción
- Las preguntas deben ser claras y sin ambigüedades
${additionalContext ? `- Contexto adicional: ${additionalContext}` : ''}

El formato debe seguir esta estructura exacta para cada pregunta.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Título del cuestionario"
            },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answerOptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        isCorrect: { type: "boolean" },
                        rationale: { type: "string" }
                      }
                    }
                  },
                  hint: { type: "string" }
                }
              }
            }
          }
        }
      });

      const targetSubjectId = shouldShowSelector ? selectedSubjectId : subjectId;
      
      const quizData = {
        title: result.title || `${topic} - Generado por IA`,
        description: `Cuestionario generado automáticamente sobre ${topic}`,
        subject_id: targetSubjectId,
        questions: result.questions,
        total_questions: result.questions.length
      };

      const createdQuiz = await base44.entities.Quiz.create(quizData);
      onQuizGenerated(createdQuiz);

    } catch (error) {
      console.error('Error generando quiz:', error);
      alert('Error al generar el cuestionario. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromJson = async () => {
    if (!jsonContent.trim()) {
      alert('Por favor pega el contenido JSON');
      return;
    }
    
    if (shouldShowSelector && !selectedSubjectId) {
      alert('Por favor selecciona un contenedor');
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = `Convierte el siguiente contenido en un cuestionario de opción múltiple estructurado.

CONTENIDO:
${jsonContent}

INSTRUCCIONES:
- Analiza el contenido y genera preguntas basadas en él
- Cada pregunta debe tener 4-5 opciones de respuesta
- Solo UNA opción debe ser correcta
- Incluye una explicación (rationale) para cada opción explicando por qué es correcta o incorrecta
- Si el contenido ya tiene formato de preguntas, conviértelo al formato requerido
- Si es texto plano o información, genera preguntas relevantes sobre ese contenido
- Las preguntas deben ser claras y sin ambigüedades`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Título del cuestionario basado en el contenido"
            },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answerOptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        isCorrect: { type: "boolean" },
                        rationale: { type: "string" }
                      }
                    }
                  },
                  hint: { type: "string" }
                }
              }
            }
          }
        }
      });

      const targetSubjectId = shouldShowSelector ? selectedSubjectId : subjectId;
      
      const quizData = {
        title: result.title || 'Quiz generado desde JSON',
        description: 'Cuestionario generado desde contenido JSON',
        subject_id: targetSubjectId,
        questions: result.questions,
        total_questions: result.questions.length
      };

      const createdQuiz = await base44.entities.Quiz.create(quizData);
      onQuizGenerated(createdQuiz);

    } catch (error) {
      console.error('Error procesando JSON:', error);
      alert('Error al procesar el contenido. Verifica el formato e intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (mode === 'topic') {
      handleGenerateFromTopic();
    } else {
      handleGenerateFromJson();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Generar Quiz con IA
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="w-full">
            <TabsTrigger value="topic" className="flex-1">
              <Brain className="w-4 h-4 mr-2" />
              Por tema
            </TabsTrigger>
            <TabsTrigger value="json" className="flex-1">
              <FileJson className="w-4 h-4 mr-2" />
              Desde JSON/Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topic" className="space-y-4 mt-4">
            {shouldShowSelector && subjects.length > 0 && (
              <div>
                <Label>Materia destino *</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Tema del cuestionario *</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: Sistema cardiovascular, Farmacología de antibióticos..."
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número de preguntas</Label>
                <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 preguntas</SelectItem>
                    <SelectItem value="10">10 preguntas</SelectItem>
                    <SelectItem value="15">15 preguntas</SelectItem>
                    <SelectItem value="20">20 preguntas</SelectItem>
                    <SelectItem value="30">30 preguntas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dificultad</Label>
                <Select value={difficulty} onValueChange={setDifficulty} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Intermedio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Contexto adicional (opcional)</Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Instrucciones adicionales: enfocarse en casos clínicos, incluir imágenes mentales, etc."
                rows={3}
                disabled={isGenerating}
              />
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4 mt-4">
            {shouldShowSelector && subjects.length > 0 && (
              <div>
                <Label>Materia destino *</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Pega tu contenido JSON o texto</Label>
              <Textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                placeholder={`Pega aquí tu JSON, texto con preguntas, o cualquier contenido que quieras convertir en quiz.

Ejemplo de formatos aceptados:
- JSON con preguntas y respuestas
- Texto plano con información
- Lista de preguntas sin formato
- Contenido de estudio

La IA lo convertirá automáticamente al formato correcto.`}
                rows={10}
                disabled={isGenerating}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isGenerating} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || (mode === 'topic' ? !topic.trim() : !jsonContent.trim()) || (shouldShowSelector && !selectedSubjectId)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar Quiz
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <p className="text-sm text-center text-gray-500">
            Esto puede tomar unos segundos...
          </p>
        )}
      </CardContent>
    </Card>
  );
}