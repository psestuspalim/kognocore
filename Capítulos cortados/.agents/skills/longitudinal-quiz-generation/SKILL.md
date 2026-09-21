---
name: longitudinal-quiz-generation
description: >-
  Generates longitudinal non-clinical comprehension MCQs in Spanish from Markdown chapter files according to the Longitudinal Quiz Protocol. Focuses on mechanisms, hierarchies, functions, sequences, 5 options with anti-guessing length control, 40/35/25 difficulty breakdown, 3-5 line justifications, and JSON output format.
---

# LONGITUDINAL COMPREHENSION QUIZ PROTOCOL (NON-CLINICAL)

Use this skill when generating non-clinical longitudinal comprehension MCQ quizzes in Spanish in JSON format from Markdown chapter texts.

## Output Language
**Output MUST be 100% in SPANISH.**

---

## Protocol Configuration

```text
CONFIG: {
  N_QUESTIONS = <N>        // User-configurable count
  SOURCE = md_file_latest  // Markdown file source
  LANGUAGE = ES            // Spanish
  SUBJECT_CODE = <sj>      // Fixed subject code (e.g., FIS, ANAT, BIO)
  TOPIC_CODE = <tp>        // Fixed topic code (e.g., ARR, DORSO, CARDIO)
  SUBTOPIC = <sb>          // Variable, derived ONLY from real chapter subsections
  COGNITIVE_LEVEL = MIXED  // dif 1 (40%), dif 2 (35%), dif 3 (25%)
  SCOPE = non_clinical     // No clinical cases or patient scenarios
}
```

---

## Goal

Generate EXACTLY `<N>` non-clinical MCQs in SPANISH assessing student mastery of:
- Chapter comprehension
- Mechanisms and pathways
- Hierarchies and classification
- Physiological / anatomical functions
- Temporal sequences
- Internal logic

Information may be reformulated with conceptual fidelity, but **no external information or clinical scenarios** are permitted.

---

## Core Rules

1. **Source Fidelity**: Use ONLY content from the provided chapter. Zero external information.
2. **Universal Framing**: NO phrases referencing the document (e.g., `"según el texto..."`, `"como se menciona..."`, `"el capítulo establece..."`).
3. **Clean Options**: NO explanatory parentheses or inline definitions in options.
4. **Anti-Guessing Length Control**:
   - Each question must have **exactly 5 options** with similar length.
   - In $\ge 50\%$ of questions, at least 1 distractor MUST be **10–25% longer** than the correct option.
5. **Single Correct Answer**: Exactly 1 correct option per question (`c: true`).
6. **Proportional Subsection Coverage**: Distribute questions proportionally across chapter subsections using `sb` labels matching those subsections.
7. **Subtopic Coherence**: `sj` and `tp` must be strictly fixed and capitalized; `sb` must be coherent with chapter subsections.
8. **Varied Question Styles**: Alternate between mechanisms, sequences, contrasts, and functional consequences.
9. **Difficulty Distribution (`dif`)**:
   - **40%** `dif = 1` (Recall / Recognition)
   - **35%** `dif = 2` (Application / Analysis)
   - **25%** `dif = 3` (Synthesis / Evaluation)
10. **Global Error-Type (`et`) Distribution**:
    - **30%** `recuerdo` (recall / contexto equivocado)
    - **30%** `conceptual` (error de concepto)
    - **20%** `mecanicista` (error en mecanismo/secuencia)
    - **10%** `malinterpretación` (misinterpretation / lectura errónea)
    - **10%** `distractor` (trap / distractor plausible pero irrelevante)
11. **Sequential Unique IDs**: Consecutive format `SJ-TP-001`, `SJ-TP-002`, etc.
12. **Spanish Output**: All JSON keys and text content must be in **Spanish**.

---

## Justifications (`r` field)

- The field `"r"` must contain **3 to 5 lines**, concise, featuring clear causal or hierarchical reasoning.
- For distractors, explain the exact misunderstanding consistent with its assigned `et`.
- Direct, clear academic style without redundancy or meta-references.

---

## Silent Self-Evaluation Checklist

Before outputting the final JSON, verify:

1. **Valid JSON**: Syntax is strictly valid JSON.
2. **IDs**: Unique, ordered, formatted correctly (`SJ-TP-001`, `SJ-TP-002`, etc.).
3. **Difficulty Proportions**: 40% `dif = 1`, 35% `dif = 2`, 25% `dif = 3` respected.
4. **Length Control**: Option lengths are similar; $\ge 50\%$ of questions have $\ge 1$ distractor that is 10–25% longer than the correct option.
5. **Error Distribution**: Global `et` distribution approximates 30/30/20/10/10 target percentages.
6. **Subtopics (`sb`)**: Subsection labels used proportionally across major chapter sections.
7. **Source Fidelity & Scope**: 100% thematic fidelity; zero external facts; zero clinical scenarios.

---

## Required JSON Output Structure (in Spanish)

```json
{
  "t": "Título del quiz longitudinal",
  "q": [
    {
      "x": "Enunciado del capítulo sobre mecanismo, función o secuencia...",
      "dif": 2,
      "qt": "mcq",
      "id": "FIS-ARR-001",
      "sj": "FIS",
      "tp": "ARR",
      "sb": "Subsección del Capítulo",
      "o": [
        {
          "text": "Opción correcta de longitud controlada",
          "c": true,
          "r": "Correcto. Explicación directa de 3 a 5 líneas del principio, jerarquía o secuencia anatómico-fisiológica. Explica la lógica interna sin referencias al texto.",
          "et": ""
        },
        {
          "text": "Distractor de recuerdo",
          "c": false,
          "r": "Incorrecto. Explicación de 3 a 5 líneas aclarando la falta de asociación con el contexto adecuado.",
          "et": "recuerdo"
        },
        {
          "text": "Distractor conceptual con longitud ligeramente mayor",
          "c": false,
          "r": "Incorrecto. Identifica el error conceptual directo y fundamenta la versión correcta en 3 a 5 líneas.",
          "et": "conceptual"
        },
        {
          "text": "Distractor mecanicista",
          "c": false,
          "r": "Incorrecto. Explica la falla en la secuencia de eventos o en el mecanismo funcional.",
          "et": "mecanicista"
        },
        {
          "text": "Distractor o trampa plausible",
          "c": false,
          "r": "Incorrecto. Señala por qué el concepto, aunque plausible en otro ámbito, es irrelevante aquí.",
          "et": "distractor"
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
3. **CONSTRUCT**: Generate questions alternating across recall (`dif = 1`), analysis (`dif = 2`), and synthesis (`dif = 3`) without clinical framing.
4. **BALANCE**: Apply length constraints (10–25% longer distractor in $\ge 50\%$ questions) and assign `et` types according to target percentages (30/30/20/10/10).
5. **VERIFY**: Run silent self-evaluation before rendering JSON output.
6. **EXPORT**: Output the complete Spanish JSON structure.
