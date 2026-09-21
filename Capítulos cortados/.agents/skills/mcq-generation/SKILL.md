---
name: mcq-generation
description: >-
  Generates high-quality non-clinical multiple-choice questions (MCQs) in compact JSON format from Markdown chapter files according to the MCQ Generation Protocol v2.1 (DSL Edition). Enforces strict source fidelity, anti-guessing length control, clean option formats, category homogeneity, justification quality, exemplar-based difficulty distribution, and post-generation validation.
---

# MCQ GENERATOR PROTOCOL v2.1 — DSL EDITION

Use this skill when generating multiple-choice question (MCQ) assessment banks in JSON format from Markdown chapter texts according to the MCQ Generation Protocol v2.1 DSL specification.

## Specification (DSL Code)

```text
MCQ_GENERATION_PROTOCOL {

  // ============================================================
  // CONFIGURATION
  // ============================================================
  CONFIG: {
    N_QUESTIONS = <60>  // default, user-configurable
    LANGUAGE = ES
    SOURCE = md_file_latest
    OUTPUT_FORMAT = json_compact
    SCOPE = non_clinical
    SUBJECT_CODE = <sj>  // fixed: FIS, BIO, FARM, ANAT, etc.
    TOPIC_CODE = <tp>    // fixed: ARR, ENDO, CARDIO, DORSO, etc.
    SUBTOPIC = <sb>      // derived from chapter subsections
  }

  // ============================================================
  // ASSESSMENT TARGETS
  // ============================================================
  ASSESS: {
    comprehension,
    mechanisms,
    hierarchies,
    functions,
    sequences,
    internal_logic
  }

  // ============================================================
  // CORE RULES (STRICT ADHERENCE REQUIRED)
  // ============================================================

  RULES: {

    // R1: SOURCE FIDELITY ⚠️ CRITICAL
    R1: {
      SOURCE_ONLY = 1,
      EXTERNAL_INFO = 0,
      GENERAL_KNOWLEDGE = 0,
      PURPOSE = "assess_comprehension_of_THIS_text",
      NOTE = "if chapter outdated/incomplete → reflect as-is"
    }

    // R2: FORMAT STANDARD
    R2: {
      OPTIONS_PER_Q = 5,
      CORRECT_ANSWERS = 1,
      LABELS = [A, B, C, D, E]
    }

    // R3: UNIVERSAL FRAMING
    R3: {
      META_REFERENCES = MINIMIZE,
      PREFERRED_STYLE = "direct_academic",
      ACCEPTABLE_IF = "source_specific_context_essential",
      FORBIDDEN_PHRASES = [
        "El autor menciona",
        "Basado en la lectura",
        "Este capítulo establece"
      ],
      ALLOWED_WHEN_NECESSARY = [
        "Según el mecanismo descrito",
        "En el modelo presentado"
      ],
      GUIDELINE = "use meta-ref ONLY when question ambiguous without it"
    }

    // R4: ANTI-GUESSING LENGTH CONTROL ⚠️ CRITICAL
    R4: {
      METRIC = word_count,
      CONSTRAINTS = {
        WC(correct) ≠ MAX(WC(all_options)),
        ∃ LONG_DIST ≥ 0.6 * N_QUESTIONS WHERE WC(distractor) > WC(correct),
        MAX(WC(options)) / MIN(WC(options)) ≤ 1.3,
        VISUAL_VARIANCE < 25%
      },
      ENFORCEMENT = "regenerate if violated"
    }

    // R5: CLEAN OPTION FORMAT ⚠️ CRITICAL
    R5: {
      FORBIDDEN_IN_OPTIONS = {
        parentheses = 0,
        explanatory_text = 0,
        definitions = 0,
        clarifications = 0
      },
      FORMAT = "bare_concept_or_statement_ONLY"
    }

    // R6: ANTI-ABSOLUTE VOCABULARY
    R6: {
      FORBIDDEN_IN_DISTRACTORS = [
        "Solo", "Únicamente", "Exclusivamente",
        "Siempre", "Nunca", "Jamás",
        "Todo", "Ninguno", "Todos"
      ],
      EXCEPTION = "IF chapter explicitly states absolute → ALLOWED in correct answer",
      DISTRACTOR_LANGUAGE = ["Principalmente", "Generalmente", "Frecuentemente", "En la mayoría"]
    }

    // R7: CATEGORY HOMOGENEITY ⚠️ CRITICAL
    R7: {
      CONSTRAINT = ∀ opt_i, opt_j ∈ OPTIONS: CATEGORY(opt_i) = CATEGORY(opt_j),
      VALID_CATEGORIES = [
        structures,      // organelles, tissues, organs
        processes,       // mechanisms, phases, reactions
        substances,      // ions, proteins, hormones
        locations,       // anatomical regions, cellular compartments
        temporal_seq,    // phases, stages
        numeric_values   // numbers, concentrations, durations
      ],
      VIOLATION = "mixing categories → REGENERATE"
    }

    // R8: NUMERIC PLAUSIBILITY
    R8: {
      RULES = {
        SAME_ORDER_OF_MAGNITUDE = 1,
        PHYSIOLOGICALLY_PLAUSIBLE = 1,
        CONTEXTUALLY_COHERENT = 1
      },
      EXAMPLES = {
        IF correct = 0.5ms → distractors ∈ [0.1ms, 2ms, 5ms],
        IF heart_rate → [60-200 bpm], NOT 500,
        IF temperature → [35-40°C], NOT 50
      }
    }

    // R9: NO META-OPTIONS
    R9: {
      FORBIDDEN = [
        "Todas las anteriores",
        "Ninguna de las anteriores",
        "A y B son correctas",
        "Solo A y C"
      ]
    }

    // R10: JUSTIFICATION QUALITY ⚠️ CRITICAL
    R10: {

      UNIVERSAL_RULES = {
        META_REFERENCES = 0,  // ZERO tolerance
        FORBIDDEN_PHRASES = [
          "el texto", "el capítulo", "la lectura", "el autor",
          "según", "basado en", "como se explicó"
        ],
        ECONOMY = 1,  // do NOT repeat question topic unnecessarily
        DIRECTNESS = 1  // get straight to the point
      },

      CORRECT_ANSWER_JUSTIFICATION = {
        LENGTH = [30, 60] words,
        STRUCTURE = {
          confirmation: "1 brief phrase",
          core_mechanism: "1-2 sentences explaining WHY with specific physiology",
          functional_context: "1 sentence (optional) adding relevance/implication"
        },
        SENTENCES = [2, 4],
        FORBIDDEN_STARTS = ["La {topic} es...", "El {concept} consiste en..."]
      },

      DISTRACTOR_JUSTIFICATION = {
        LENGTH = [15, 30] words,
        STRUCTURE = {
          error_identification: "state what's wrong",
          brief_correction: "optional: what is actually true"
        },
        SENTENCES = [1, 2],
        TONE = "direct, specific"
      },

      EXAMPLES_GOOD = {
        CORRECT: "Correcto. Este gradiente genera un potencial electroquímico que impulsa el movimiento pasivo de agua por ósmosis. El transporte activo de sodio basolateral es el motor energético.",
        DISTRACTOR: "Incorrecto. Este mecanismo requiere energía de ATP, no es un proceso pasivo."
      },

      EXAMPLES_BAD = {
        META_REF: "Correcto. El texto establece que...",
        REPETITIVE: "Correcto. La ósmosis es el movimiento de agua...",
        TOO_BRIEF: "Correcto.",
        VAGUE: "Incorrecto. Esto no es correcto porque..."
      }
    }
  }

  // ============================================================
  // DISTRIBUTION REQUIREMENTS
  // ============================================================

  DISTRIBUTION: {
    DIFFICULTY = {
      dif_1: 0.40,  // Recall/Recognition
      dif_2: 0.35,  // Application/Analysis
      dif_3: 0.25   // Synthesis/Evaluation
    },

    ERROR_TYPES = {
      recall: 0.30,              // correct concept, wrong context
      conceptual: 0.30,          // misunderstanding of principle
      mechanistic: 0.20,         // error in process/sequence
      misinterpretation: 0.10,   // text misreading
      plausible_distractor: 0.10 // related but irrelevant
    }
  }

  // ============================================================
  // RULE HIERARCHY (CONFLICT RESOLUTION)
  // ============================================================

  PRIORITY_ORDER: [
    scientific_accuracy > anti_absolute_vocabulary,
    category_homogeneity > length_homogeneity,
    source_fidelity > universal_framing,
    justification_economy > completeness
  ]

  RESOLUTION_LOGIC: {
    IF conflict(R_i, R_j) → APPLY(PRIORITY_ORDER[index(R_i) vs index(R_j)])
  }

  // ============================================================
  // POST-GENERATION VALIDATION (INTERNAL, NOT EXPORTED)
  // ============================================================

  VALIDATION_CHECKLIST: {

    ∀ question ∈ GENERATED_QUESTIONS: {

      STRUCTURAL_CHECKS = {
        stem_clear_and_self_contained = TRUE,
        options_count = 5,
        correct_answers_count = 1
      },

      RULE_COMPLIANCE_CHECKS = {
        WC(correct) ≠ MAX(WC(all_options)),
        COUNT(distractors WHERE WC > WC(correct)) ≥ 0.6 * N_QUESTIONS,
        MAX(WC) / MIN(WC) ≤ 1.3,
        CONTAINS(options, "(") = FALSE,
        CATEGORY(opt_A) = CATEGORY(opt_B) = ... = CATEGORY(opt_E),
        CONTAINS(options, ["Todas las anteriores", ...]) = FALSE,
        IF numeric_options → PLAUSIBILITY_CHECK() = TRUE
      },

      JUSTIFICATION_CHECKS = {
        CONTAINS(all_justifications, ["texto", "capítulo", "autor", "según"]) = FALSE,
        NO_REPETITION_OF_STEM_TOPIC = TRUE,
        LENGTH(correct_justification) ∈ [30, 60] words,
        LENGTH(distractor_justification) ∈ [15, 30] words,
        ALL_DIRECT_AND_ECONOMICAL = TRUE
      },

      CONTENT_QUALITY_CHECKS = {
        stem_no_unnecessary_meta_refs = TRUE,
        correct_answer_defensible = TRUE,
        all_distractors_plausible_but_wrong = TRUE
      },

      ACTION: IF ANY(checks) = FALSE → REGENERATE(question)
    }
  }

  // ============================================================
  // OUTPUT JSON SCHEMA (COMPACT)
  // ============================================================

  OUTPUT_STRUCTURE: {
    metadata: {
      title: string,
      source: string,  // markdown filename
      date: "YYYY-MM-DD",
      total: integer,
      sj: string,      // subject code
      tp: string,      // topic code
      dist: {
        d1: float,     // % dif=1
        d2: float,     // % dif=2
        d3: float      // % dif=3
      }
    },

    q: [
      {
        id: string,    // format: "{sj}-{tp}-{###}"
        sb: string,    // subtopic from chapter subsection
        x: string,     // question stem
        dif: integer,  // 1, 2, or 3
        o: [
          {
            l: string,   // "A", "B", "C", "D", or "E"
            t: string,   // option text (clean)
            c: boolean,  // is_correct
            r: string,   // justification (follows R10)
            et: string   // error_type: recall|conceptual|mechanistic|misinterpretation|plausible_distractor|null
          }
          // ... 4 more options
        ]
      }
      // ... N-1 more questions
    ]
  }

  // ============================================================
  // GENERATION WORKFLOW
  // ============================================================

  WORKFLOW: {
    STEP_1: READ(markdown_file) → FULL_COMPREHENSION,
    STEP_2: EXTRACT(subsections) → POPULATE(sb_values),
    STEP_3: GENERATE(questions) → APPLY(ALL_RULES),
    STEP_4: FOR_EACH(question) {
      COUNT(words_per_option),
      VERIFY(length_rules),
      CHECK(category_homogeneity),
      VALIDATE(justifications_against_R10)
    },
    STEP_5: IF VALIDATION_FAILS(question) → REGENERATE(question),
    STEP_6: OUTPUT(final_json)
  }
}
```

## Concrete Exemplars for Learning

### Exemplar 1: Difficulty 1 (Recall)

```json
{
  "id": "FIS-MEMB-001",
  "sb": "Composición de líquidos corporales",
  "x": "¿Cuál es el catión predominante en el líquido extracelular?",
  "dif": 1,
  "o": [
    {
      "l": "A",
      "t": "Sodio",
      "c": true,
      "r": "Correcto. Su alta concentración extracelular contrasta con niveles bajos intracelulares, siendo fundamental para el potencial de membrana y mecanismos de transporte activo.",
      "et": null
    },
    {
      "l": "B",
      "t": "Potasio",
      "c": false,
      "r": "Incorrecto. Predomina en el compartimiento intracelular, no extracelular.",
      "et": "recall"
    },
    {
      "l": "C",
      "t": "Calcio",
      "c": false,
      "r": "Incorrecto. Aunque importante, no es el catión de mayor concentración extracelular.",
      "et": "plausible_distractor"
    },
    {
      "l": "D",
      "t": "Magnesio",
      "c": false,
      "r": "Incorrecto. No alcanza las concentraciones del catión predominante.",
      "et": "plausible_distractor"
    },
    {
      "l": "E",
      "t": "Hidrógeno",
      "c": false,
      "r": "Incorrecto. Su concentración es mínima comparada con otros cationes.",
      "et": "misinterpretation"
    }
  ]
}
```
**Validation Metrics**: `WC=[A:1, B:1, C:1, D:1, E:1]` | `Ratio=1.0` ✓ | `Category=cations` ✓ | `Meta-refs=0` ✓

---

### Exemplar 2: Difficulty 2 (Application)

```json
{
  "id": "FIS-MEMB-002",
  "sb": "Tipos de difusión",
  "x": "¿Qué característica diferencia a la difusión facilitada de la difusión simple?",
  "dif": 2,
  "o": [
    {
      "l": "A",
      "t": "Alcanza una velocidad máxima de transporte",
      "c": false,
      "r": "Incorrecto. La saturación es consecuencia de la característica diferenciadora, no la diferencia primaria.",
      "et": "conceptual"
    },
    {
      "l": "B",
      "t": "Requiere interacción con proteínas transportadoras",
      "c": true,
      "r": "Correcto. Las proteínas ayudan mediante unión química y cambios conformacionales. La difusión simple ocurre sin esta interacción, solo por movimiento a través de aberturas o espacios intermoleculares.",
      "et": null
    },
    {
      "l": "C",
      "t": "Transporta moléculas contra gradiente de concentración",
      "c": false,
      "r": "Incorrecto. Esto describe transporte activo, no difusión. Ambos tipos de difusión ocurren a favor del gradiente.",
      "et": "mechanistic"
    },
    {
      "l": "D",
      "t": "Consume trifosfato de adenosina directamente",
      "c": false,
      "r": "Incorrecto. No requiere ATP; utiliza solo energía cinética molecular.",
      "et": "mechanistic"
    },
    {
      "l": "E",
      "t": "Solo ocurre con moléculas liposolubles",
      "c": false,
      "r": "Incorrecto. Las moléculas liposolubles difunden por la bicapa lipídica mediante difusión simple.",
      "et": "recall"
    }
  ]
}
```
**Validation Metrics**: `WC=[A:6, B:5, C:6, D:5, E:5]` | `Ratio=1.2` ✓ | `Longer_distractors=2` ✓ | `Category=processes` ✓

---

### Exemplar 3: Difficulty 3 (Synthesis)

```json
{
  "id": "FIS-MEMB-003",
  "sb": "Transporte a través de capas celulares",
  "x": "¿Qué mecanismo explica el transporte neto de agua a través del epitelio intestinal?",
  "dif": 3,
  "o": [
    {
      "l": "A",
      "t": "Difusión simple por bicapa lipídica",
      "c": false,
      "r": "Incorrecto. No explica el transporte neto direccional del modelo epitelial.",
      "et": "conceptual"
    },
    {
      "l": "B",
      "t": "Transporte activo mediante ATPasas específicas",
      "c": false,
      "r": "Incorrecto. El agua no es bombeada activamente; se mueve pasivamente por gradientes osmóticos.",
      "et": "mechanistic"
    },
    {
      "l": "C",
      "t": "Ósmosis por gradiente de sodio basolateral",
      "c": true,
      "r": "Correcto. El bombeo activo de sodio en membranas basolaterales genera un gradiente de concentración que produce ósmosis. El transporte activo de sodio impulsa simultáneamente el movimiento de agua.",
      "et": null
    },
    {
      "l": "D",
      "t": "Cotransporte sodio-agua en borde en cepillo",
      "c": false,
      "r": "Incorrecto. En el polo luminal ocurre difusión, no cotransporte. El transporte activo es basolateral.",
      "et": "misinterpretation"
    },
    {
      "l": "E",
      "t": "Presión hidrostática por contratransporte lateral",
      "c": false,
      "r": "Incorrecto. El contratransporte no es el mecanismo central del transporte epitelial de agua.",
      "et": "plausible_distractor"
    }
  ]
}
```
**Validation Metrics**: `WC=[A:5, B:5, C:6, D:6, E:5]` | `Ratio=1.2` ✓ | `Longer_distractors=2` ✓ | `Category=processes` ✓

---

## Execution Instruction

1. **DECODE** the DSL specification above.
2. **EXECUTE** the `MCQ_GENERATION_PROTOCOL` on the target Markdown chapter file.
3. **OUTPUT** must be valid JSON following the `OUTPUT_STRUCTURE` schema with ALL validation checks passed.
4. **NO OMISSIONS** — all rules and validation criteria must be applied strictly.
