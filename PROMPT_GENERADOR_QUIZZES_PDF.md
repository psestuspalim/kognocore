# PROMPT MASTER PARA GENERAR BANCOS DE PREGUNTAS EN JSON (KOGNOCORE)

Puedes copiar y pegar este prompt directamente en cualquier modelo de IA (Claude, ChatGPT, Gemini, DeepSeek, etc.) junto con un archivo PDF (capítulo de libro, apunte o guía de estudio) para generar automáticamente un cuestionario de preguntas abiertas validado para **Kognocore**.

---

## 📋 Prompt para Copiar y Pegar en la IA

```text
Actúa como un Profesor Experto en Anatomía Médica y Especialista en Evaluación Educativa. Tu objetivo es analizar el archivo PDF adjunto y generar un banco de preguntas en formato JSON estricto listo para la plataforma Kognocore.

### OBJETIVO DEL BANCO DE PREGUNTAS
El examen evalúa la capacidad de PRODUCCIÓN y RECUPERACIÓN DE MEMORIA (no reconocimiento). Por lo tanto:
- NO GENERES PREGUNTAS DE OPCIÓN MÚLTIPLE (A, B, C, D).
- Genera únicamente preguntas abiertas de los 6 tipos soportados por el motor de evaluación de Kognocore:
  1. `respuesta_corta`: Recordar un término canónico, epónimo o estructura.
  2. `numerico`: Cifras exactas, porcentajes, edades, distancias o rangos.
  3. `enumeracion`: Listas y sets cerrados de N elementos ("Menciona los 3...").
  4. `secuencia`: Pasos u orden cronológico/estratigráfico obligatorio.
  5. `cloze`: Oraciones textuales con huecos {{c1}}, {{c2}}...
  6. `relacion`: Asociar pares de la columna A con la columna B.

### REGLAS DE EXTRACCIÓN DEL CONTENIDO
1. **Prioriza Cuadros Clínicos y Puntos Fundamentales**: Los cuadros de correlación clínica y recuadros destacados son la fuente principal de preguntas de datos duros.
2. **Identifica Sets Cerrados**: Cualquier frase que diga "consta de tres...", "formado por...", "los 4 ligamentos..." debe convertirse en un ítem de tipo `enumeracion`.
3. **Cifras y Datos Duros**: Porcentajes de incidencia, edades, medidas y conteos exactos deben convertirse en `numerico`.
4. **Fidelidad al Libro**: Utiliza la redacción exacta y la Terminologia Anatomica del PDF proporcionado (ej. Moore 9.ª ed.).
5. **Distribución Homogénea**: Genera entre 15 y 25 preguntas por cada 10 páginas del PDF subido.

---

### ESQUEMA JSON REQUERIDO

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura general:

{
  "id": "P1-B04",
  "titulo": "Título de la Sesión / Capítulo",
  "materia": "Anatomía Humana",
  "obra": "Moore Anatomía con Orientación Clínica",
  "edicion": "9.ª ed.",
  "preguntas": [
    ...
  ]
}

---

### ESTRUCTURA DE CADA TIPO DE PREGUNTA EN `"preguntas"`

#### 1. Respuesta Corta (`respuesta_corta`)
{
  "id": "q1",
  "tipo": "respuesta_corta",
  "categoria": "estructura",
  "prompt": "¿Qué estructura atraviesa el foramen vertebral?",
  "respuesta": {
    "canonico": "médula espinal",
    "acepta": ["medula espinal"]
  },
  "fuente": { "pag": 45 },
  "feedback": "La médula espinal pasa por el conducto vertebral formado por la sucesión de forámenes vertebrales.",
  "dificultad": 1
}

#### 2. Numérico (`numerico`)
{
  "id": "q2",
  "tipo": "numerico",
  "prompt": "¿Cuántas vértebras componen la región cervical típica?",
  "respuesta": {
    "valor": 7,
    "unidad": "vértebras",
    "tol": 0
  },
  "fuente": { "pag": 47 },
  "feedback": "El esqueleto cervical está compuesto por 7 vértebras cervicales (C1-C7).",
  "dificultad": 1
}

#### 3. Enumeración (`enumeracion`)
{
  "id": "q3",
  "tipo": "enumeracion",
  "prompt": "Menciona los 3 componentes principales de una vértebra típica:",
  "respuesta": {
    "elementos": [
      { "canonico": "cuerpo vertebral" },
      { "canonico": "arco vertebral" },
      { "canonico": "procesos vertebrales" }
    ],
    "credito_parcial": true
  },
  "fuente": { "pag": 48 },
  "feedback": "Una vértebra típica se compone de cuerpo vertebral anterior, arco vertebral posterior y siete procesos.",
  "dificultad": 2
}

#### 4. Secuencia (`secuencia`)
{
  "id": "q4",
  "tipo": "secuencia",
  "prompt": "Ordena de anterior a posterior las siguientes estructuras del conducto vertebral:",
  "respuesta": {
    "pasos": [
      { "canonico": "cuerpo vertebral" },
      { "canonico": "ligamento longitudinal posterior" },
      { "canonico": "duramadre" }
    ]
  },
  "fuente": { "pag": 52 },
  "feedback": "De anterior a posterior el orden es cuerpo, ligamento longitudinal posterior y saco dural.",
  "dificultad": 3
}

#### 5. Texto para completar (`cloze`)
{
  "id": "q5",
  "tipo": "cloze",
  "prompt": "Completa el siguiente texto sobre las articulaciones vertebrales:",
  "texto": "Las articulaciones de los cuerpos vertebrales son {{c1}} unidas por {{c2}} intervertebrales.",
  "blancos": {
    "c1": { "canonico": "sínfisis" },
    "c2": { "canonico": "discos" }
  },
  "fuente": { "pag": 55 },
  "feedback": "Las articulaciones intervertebrales son sínfisis destinadas al soporte de peso.",
  "dificultad": 2
}

#### 6. Relación de Columnas (`relacion`)
{
  "id": "q6",
  "tipo": "relacion",
  "prompt": "Relaciona cada región vertebral con el número correspondiente de vértebras:",
  "respuesta": {
    "pares": [
      { "clave": "Cervical", "canonico": "7 vértebras" },
      { "clave": "Torácica", "canonico": "12 vértebras" },
      { "clave": "Lumbar", "canonico": "5 vértebras" }
    ]
  },
  "fuente": { "pag": 46 },
  "feedback": "La columna vertebral consta de 7 cervicales, 12 torácicas, 5 lumbares, 5 sacras y 4 coccígeas.",
  "dificultad": 2
}

---

### REGLAS OBLIGATORIAS DE SALIDA
1. Responde **ÚNICAMENTE** con el código JSON válido (dentro de un bloque de código ```json ... ```).
2. No agregues saludos, introducciones ni textos explicativos fuera del objeto JSON.
3. Asegúrate de que todos los JSON sean sintácticamente válidos y sin comas sueltas al final.
4. Cada pregunta debe incluir obligatoriamente `"fuente": { "pag": N }`.
5. Los IDs de pregunta (`q1`, `q2`, `q3`...) deben ser secuenciales y únicos.

Procesa el PDF adjunto y genera el archivo JSON completo.
```

---

## 🛠️ Cómo Usar el Prompt
1. Abre tu herramienta de IA preferida (ChatGPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro).
2. Adjunta tu archivo PDF (capítulo del Moore, apunte o documento).
3. Copia todo el bloque de código de arriba (`Actúa como un Profesor Experto...`) y pégalo en el chat.
4. La IA te devolverá un archivo JSON estructurado listo para colocar en la carpeta `Capítulos cortados/` o importar directamente a Kognocore.
