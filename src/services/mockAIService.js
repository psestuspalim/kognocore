
/**
 * Simulates a call to the backend AI service for error analysis.
 * @param {string} questionText - The text of the question.
 * @param {string} correctRationale - The rationale for the correct answer.
 * @param {string} wrongAnswerText - The incorrect answer selected by the user.
 * @returns {Promise<{tipo_error: string, explicacion_breve: string, recomendacion: string}>}
 */
export const diagnoseError = async (questionText, correctRationale, wrongAnswerText) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                tipo_error: "Conceptual",
                explicacion_breve: "Parece que confundiste el concepto de Herencia con Polimorfismo. Tu código intenta sobrescribir un método estático, lo cual no es posible en Java.",
                recomendacion: "Repasa los conceptos fundamentales de Programación Orientada a Objetos, específicamente la diferencia entre métodos de instancia y de clase."
            });
        }, 1500); // Simulate network delay
    });
};
