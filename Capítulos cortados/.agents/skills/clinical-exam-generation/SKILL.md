---
name: clinical-exam-generation
description: >-
  Generates high-level clinical multiple-choice questions (MCQs) in Spanish from Markdown chapter files according to the Clinical Exam Protocol. Focuses on pathophysiological/clinical reasoning, 5 options with anti-guessing length control, structured error types, 3-5 line justifications, and JSON output format.
---

# CLINICAL EXAM GENERATION PROTOCOL

Use this skill when generating high-level clinical multiple-choice question (MCQ) exams in Spanish in JSON format from Markdown chapter texts.

## Output Language
**Output MUST be 100% in SPANISH.**

---

## Protocol Configuration

```text
CONFIG: {
  N_QUESTIONS = <N>        // User-configurable count
  SOURCE = md_file_latest  // Markdown file source
  LANGUAGE = ES            // Spanish
  SUBJECT_CODE = <sj>      // Fixed subject code (e.g., FIS, ANAT, FARM)
  TOPIC_CODE = <tp>        // Fixed topic code (e.g., ARR, DORSO, CARDIO)
  SUBTOPIC = <sb>          // Variable, derived ONLY from real chapter subsections
  COGNITIVE_LEVEL = HIGH   // Analysis, application, causal reasoning, pathophysiological integration (predominantly dif = 3)
}
```

---

## Goal

Generate EXACTLY `<N>` high-level clinical MCQs in SPANISH, derived **exclusively** from the immediate source chapter. Information may be reformulated to construct realistic clinical cases or reasoning problems while preserving conceptual fidelity.

**No external content or outside textbook facts permitted.**

---

## Core Rules

1. **Source Fidelity**: Use ONLY the provided chapter as the content source.
2. **Universal Framing**: NO phrases referencing the document (e.g., `"según el texto..."`, `"como se menciona..."`, `"el capítulo establece..."`).
3. **Clean Options**: NO explanatory parentheses or inline definitions in options.
4. **Anti-Guessing Length Control**:
   - Each question must have **exactly 5 options** with similar length.
   - In $\ge 50\%$ of questions, at least 1 distractor MUST be **10–25% longer** than the correct option.
5. **Single Correct Answer**: Exactly 1 correct option per question (`c: true`).
6. **Clinical Reasoning Path**: Build questions using realistic clinical logic:
   $$\text{Mecanismos} \longrightarrow \text{Disfunción} \longrightarrow \text{Consecuencia clínica}$$
7. **Proportional Subsection Coverage**: Distribute questions proportionally across chapter subsections using `sb` labels that match those subsections.
8. **Subtopic Coherence**: `sj` and `tp` must be strictly fixed and capitalized; `sb` must be coherent with chapter subsections.
9. **Structural Variation**: Ensure variety in question structure and clinical presentation across the exam.
10. **Global Error-Type (`et`) Distribution**:
    - **35%** `conceptual` (error de concepto)
    - **20%** `recuerdo` (recall / contexto equivocado)
    - **20%** `mecanicista` (error en mecanismo/secuencia)
    - **15%** `malinterpretación` (misinterpretation / lectura errónea)
    - **10%** `distractor` (trap / distractor plausible pero irrelevante)
11. **Sequential Unique IDs**: Consecutive format `SJ-TP-001`, `SJ-TP-002`, etc.
12. **Spanish Output**: All JSON keys and text content must be in **Spanish**.

---

## Justifications (`r` field)

- The field `"r"` must contain **3 to 5 lines**, concise, emphasizing causal reasoning.
- Explain clearly why the correct answer is correct or why a distractor is wrong, aligned with its specific error type (`et`).
- Clear, direct academic style without redundancy or meta-references.

---

## Silent Self-Evaluation Checklist

Before outputting the final JSON, verify:

1. **Valid JSON**: Syntax is strictly valid JSON.
2. **IDs**: Unique, ordered, formatted correctly (`SJ-TP-001`, `SJ-TP-002`, etc.).
3. **Cognitive Level**: Difficulty level matches clinical requirement (predominantly `dif = 3`).
4. **Length Control**: Option lengths are similar; $\ge 50\%$ of questions have $\ge 1$ distractor that is 10–25% longer than the correct option.
5. **Error Distribution**: Global `et` distribution approximates target percentages.
6. **Source Fidelity**: 100% thematic coherence with source chapter; zero external facts.
7. **Proportional Coverage**: Proportional coverage across major subsections (`sb`).

---

## Required JSON Output Structure (in Spanish)

```json
{
  "t": "Título del examen clínico",
  "q": [
    {
      "x": "Enunciado clínico con razonamiento de mecanismos y disfunción...",
      "dif": 3,
      "qt": "mcq",
      "id": "FIS-ARR-001",
      "sj": "FIS",
      "tp": "ARR",
      "sb": "Subsección del Capítulo",
      "o": [
        {
          "text": "Opción correcta de longitud controlada",
          "c": true,
          "r": "Correcto. Explicación concisa de 3 a 5 líneas basada en la secuencia fisiopatológica o anatómica. Detalla el mecanismo causal sin meta-referencias al texto.",
          "et": ""
        },
        {
          "text": "Distractor conceptual con longitud ligeramente mayor",
          "c": false,
          "r": "Incorrecto. Explicación directa de 3 a 5 líneas que identifica el error de concepto fisiopatológico.",
          "et": "conceptual"
        },
        {
          "text": "Distractor de recuerdo",
          "c": false,
          "r": "Incorrecto. Identifica el fallo de asociación de contexto o memoria.",
          "et": "recuerdo"
        },
        {
          "text": "Distractor de malinterpretación",
          "c": false,
          "r": "Incorrecto. Muestra dónde ocurrió el error de interpretación del proceso.",
          "et": "malinterpretación"
        },
        {
          "text": "Distractor mecanicista",
          "c": false,
          "r": "Incorrecto. Señala la alteración en la secuencia de eventos o mecanismos.",
          "et": "mecanicista"
        }
      ]
    }
  ]
}
```

---

## Generation Workflow

1. **READ**: Thoroughly digest the source Markdown chapter.
2. **MAP**: Extract subsections to populate `sb` proportionally.
3. **CONSTRUCT**: Generate clinical questions (`dif = 3`) following the $Mecanismos \rightarrow Disfunción \rightarrow Consecuencia$ pathway.
4. **BALANCE**: Apply length constraints (10-25% longer distractor in $\ge 50\%$ questions) and assign `et` types according to global percentage targets.
5. **VERIFY**: Run silent self-evaluation before rendering JSON output.
6. **EXPORT**: Output the complete Spanish JSON structure.
