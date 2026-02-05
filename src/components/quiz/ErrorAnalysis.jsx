import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, AlertTriangle, Eye, Shuffle, HelpCircle, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

const ERROR_TYPES = {
  RUSHED_READING: {
    id: 'rushed_reading',
    label: 'Lectura apresurada',
    icon: Eye,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Respondiste muy rápido. Tómate más tiempo para leer.'
  },
  CONCEPT_CONFUSION: {
    id: 'concept_confusion', 
    label: 'Confusión de conceptos',
    icon: Shuffle,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Confundiste conceptos similares.'
  },
  SIMILAR_OPTIONS: {
    id: 'similar_options',
    label: 'Opciones similares',
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    description: 'Las opciones eran muy parecidas, presta atención a los detalles.'
  },
  KNOWLEDGE_GAP: {
    id: 'knowledge_gap',
    label: 'Tema por reforzar',
    icon: HelpCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
    description: 'Este tema necesita más estudio.'
  },
  CARELESS_MISTAKE: {
    id: 'careless_mistake',
    label: 'Error por descuido',
    icon: Brain,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Ya sabías esto, fue un descuido.'
  }
};

export default function ErrorAnalysis({ 
  question, 
  selectedAnswer, 
  correctAnswer,
  responseTime, // en segundos
  userEmail,
  quizId,
  previousAttempts = []
}) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [similarQuestion, setSimilarQuestion] = useState(null);

  useEffect(() => {
    analyzeError();
  }, [question, selectedAnswer]);

  const analyzeError = async () => {
    setLoading(true);
    
    try {
      // Buscar si respondió bien esta pregunta antes
      const previousCorrect = previousAttempts.some(attempt => 
        attempt.score > 0 && 
        !attempt.wrong_questions?.some(wq => wq.question === question.question)
      );

      // Buscar preguntas similares que haya respondido bien
      const allWrongQuestions = previousAttempts.flatMap(a => a.wrong_questions || []);
      
      // Análisis con LLM
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza este error en un quiz médico y determina el tipo de error.

PREGUNTA: "${question.question}"

RESPUESTA ELEGIDA (INCORRECTA): "${selectedAnswer}"

RESPUESTA CORRECTA: "${correctAnswer}"

CONTEXTO:
- Tiempo de respuesta: ${responseTime ? responseTime + ' segundos' : 'No disponible'}
- ¿Ha respondido bien esta pregunta antes?: ${previousCorrect ? 'SÍ' : 'NO'}
- Respuesta rápida (menos de 5 segundos): ${responseTime && responseTime < 5 ? 'SÍ' : 'NO'}

TIPOS DE ERROR POSIBLES:
1. RUSHED_READING - Si respondió muy rápido (menos de 8 seg) y la respuesta correcta era obvia
2. CONCEPT_CONFUSION - Si confundió dos conceptos médicos relacionados
3. SIMILAR_OPTIONS - Si la respuesta elegida era muy similar a la correcta
4. KNOWLEDGE_GAP - Si parece desconocer el tema completamente
5. CARELESS_MISTAKE - Si ya había respondido bien antes, o el error parece un descuido

Responde en español.`,
        response_json_schema: {
          type: "object",
          properties: {
            error_type: { 
              type: "string", 
              enum: ["RUSHED_READING", "CONCEPT_CONFUSION", "SIMILAR_OPTIONS", "KNOWLEDGE_GAP", "CARELESS_MISTAKE"]
            },
            explanation: { 
              type: "string", 
              description: "Explicación breve y amigable del error (máximo 2 oraciones)" 
            },
            tip: { 
              type: "string", 
              description: "Consejo específico para evitar este error en el futuro" 
            },
            confused_concepts: {
              type: "array",
              items: { type: "string" },
              description: "Si aplica, los dos conceptos que confundió"
            }
          }
        }
      });

      setAnalysis({
        ...ERROR_TYPES[result.error_type],
        explanation: result.explanation,
        tip: result.tip,
        confusedConcepts: result.confused_concepts,
        previousCorrect
      });

    } catch (error) {
      console.error('Error analyzing:', error);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analizando tu error...</span>
      </div>
    );
  }

  if (!analysis) return null;

  const Icon = analysis.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3"
    >
      <Card className={`p-3 border ${analysis.color}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${analysis.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={analysis.color}>
                {analysis.label}
              </Badge>
              {analysis.previousCorrect && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                  Ya lo sabías
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-700 mb-2">
              {analysis.explanation}
            </p>

            {analysis.confusedConcepts?.length === 2 && (
              <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-2 py-1 mb-2">
                <Shuffle className="w-3 h-3" />
                <span>Confundiste: <strong>{analysis.confusedConcepts[0]}</strong> con <strong>{analysis.confusedConcepts[1]}</strong></span>
              </div>
            )}

            <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5">
              <Lightbulb className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
              <span>{analysis.tip}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}