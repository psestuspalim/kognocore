import { useState } from 'react';
import { client } from '@/api/client';

export function useAIAnalysis() {
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);

    const analyzeError = async ({ questionText, selectedOptionText, correctOptionText, context }) => {
        setAnalyzing(true);
        setError(null);
        try {
            const prompt = `
        Analiza el error del estudiante:
        Pregunta: "${questionText}"
        Eligió: "${selectedOptionText}"
        Correcta: "${correctOptionText}"
        Contexto: ${context || 'N/A'}

        Provee un feedback breve y pedagógico (máx 2 frases) explicando por qué la elección fue incorrecta y guiando hacia la correcta sin dar la respuesta directamente si es posible, o explicando el concepto clave.
      `;

            // Mock implementation details for client LLM invocation
            // Adjust schema as needed for specific LLM integration
            const response = await client.integrations.Core.InvokeLLM({
                prompt: prompt,
                temperature: 0.7,
                // response_json_schema: ... if structured output needed
            });

            setAnalysis(response);
            return response;
        } catch (err) {
            console.error("AI Analysis Failed:", err);
            setError(err);
            return null;
        } finally {
            setAnalyzing(false);
        }
    };

    const clearAnalysis = () => {
        setAnalysis(null);
        setError(null);
    };

    return {
        analyzeError,
        clearAnalysis,
        analyzing,
        error,
        analysis
    };
}
