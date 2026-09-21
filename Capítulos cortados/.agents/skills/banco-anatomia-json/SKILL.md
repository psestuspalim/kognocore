---
name: banco-anatomia-json
description: Genera bloques del banco de preguntas de anatomía (Moore 9.ª ed.) en JSON validado, con respuestas de texto libre calificadas por un motor de normalización que tolera acentos, sinonimia TA/clásica y errores ortográficos. Usar SIEMPRE que el usuario pida preguntas, quiz, cuestionario, banco, bloque o reactivos de anatomía a partir de un capítulo o sesión del temario; cuando suba un PDF de un capítulo de Moore y pida "arma el bloque", "siguiente bloque", "genera las preguntas de esta sesión", "haz el de [tema]"; o cuando pida ampliar el diccionario de sinónimos, validar un bloque existente, o integrar el motor de calificación en su plataforma. Aplica aunque no diga "JSON" ni "banco"; cualquier material de práctica de anatomía para examen escrito de respuesta abierta entra aquí.
---

# Banco de anatomía en JSON

Construye, bloque por bloque, un banco de preguntas de respuesta abierta para un examen escrito de anatomía sin opciones múltiples. El examen real pide enumerar sets cerrados, recordar datos puntuales (cifras, edades, epónimos) y completar párrafos casi textuales del libro. El banco debe entrenar esas tres habilidades de producción, nunca reconocimiento.

**Fuente única**: Moore, *Anatomía con orientación clínica*, 9.ª ed. en español, en el PDF que el usuario proporcione. No completes con conocimiento propio ni con otras ediciones: el profesor califica contra la redacción de este libro, y un dato correcto pero redactado distinto entrena al alumno a escribir algo que puede no aceptarse.

## Recursos

| Ruta | Qué es | Cuándo abrirlo |
|---|---|---|
| `references/plan-bloques.md` | Mapa sesión → ID → contenido → páginas de los 56 bloques | Siempre, al inicio, para asignar ID y verificar alcance |
| `assets/ejemplo-bloque.json` | Bloque P1-B05 completo y validado | Como modelo de redacción, densidad y estructura |
| `assets/schema-banco.json` | JSON Schema del bloque | Solo si hay duda sobre un campo |
| `assets/sinonimos.json` | Diccionario global de normalización | Antes de escribir `acepta`, para no duplicar lo que ya cubre |
| `scripts/normalizador.js` | Motor de calificación (el mismo que corre la plataforma) | No hace falta leerlo; lo usa el validador |
| `scripts/validar.mjs` | Validador: estructura + autoconsistencia + ambigüedad | Siempre, antes de entregar |
| `scripts/prueba.mjs` | Suite de regresión del motor | Tras modificar `sinonimos.json` o el motor |

## Flujo

1. **Identifica el bloque** en `references/plan-bloques.md` por fecha, tema o páginas. Si el usuario no lo dice y el PDF no lo deja claro, pregunta.
2. **Verifica cobertura**: compara las páginas del PDF contra las del bloque. Si faltan páginas (típico: el cuadro clínico está en otro rango), dilo y genera solo lo que tienes. No rellenes.
3. **Lee el PDF completo**, incluidos pies de figura y cuadros "Puntos fundamentales". Si el contenido no está en contexto, usa la skill `pdf-reading`.
4. **Haz inventario** antes de escribir ítems (ver "Qué convertir en ítem").
5. **Escribe el bloque** siguiendo las reglas por tipo.
6. **Valida y poda**:
   ```bash
   cp -r <skill>/scripts <skill>/assets /home/claude/banco/
   cd /home/claude/banco/scripts
   node validar.mjs /home/claude/banco/<ID>_<slug>.json --podar
   ```
   Corrige todo ERROR y vuelve a correr hasta `RESULTADO: VALIDO`. Revisa los avisos: los de colisión vía ortografía casi siempre indican dos elementos demasiado parecidos que hay que reformular.
7. **Si añadiste sinónimos** al diccionario, corre `node prueba.mjs` y entrega también el `sinonimos.json` actualizado.
8. **Entrega** en `/mnt/user-data/outputs/banco/<ID>_<slug>.json` con `present_files`.

## Qué convertir en ítem

Recorre el texto buscando, en este orden de rendimiento:

- **Sets cerrados explícitos**: toda frase que enumera ("tres centros", "consta de", "formado por", listas en pies de figura) → `enumeracion`. Es el ítem de mayor peso en el examen real (una enumeración de 5 vale 5 preguntas).
- **Cifras**: porcentajes, edades, semanas, distancias, números de estructuras → `numerico`. Los cuadros clínicos están llenos de ellas y el profesor las pregunta.
- **Nombres propios y términos técnicos únicos**: epónimos, nombres de fracturas, de síndromes, de referencias de superficie → `respuesta_corta`.
- **Oraciones de alta densidad relacional**: las que encadenan causa, localización y consecuencia → `cloze`.
- **Correspondencias**: estructura→inervación, elemento→derivado, localización→nombre del cambio → `relacion`.
- **Órdenes con sentido**: estadios, capas, trayectos → `secuencia`.

**Prioriza los cuadros clínicos.** En el piloto aportaron un tercio de los ítems con poco texto, y son la fuente más probable de preguntas de dato duro.

Omite lo que no sea evaluable por escrito sin imagen (descripciones puramente visuales de una figura) y las generalidades sin contenido discriminante.

## Densidad

Por defecto, alrededor de **25 ítems por cada ~10 páginas** de texto denso (referencia: P1-B05). Escala con la densidad real, no con el número de páginas: una sesión de terminología da menos que una de articulaciones. Si el usuario pide otra densidad, obedece.

Mezcla objetivo aproximada: 15-20% enumeración, 25-35% numérico, 25-35% respuesta corta, 10% cloze, 10% relación/secuencia. Es orientativa; manda el contenido.

## Reglas de redacción

### Comunes a todos los tipos
- `canonico`: la redacción de Moore, en Terminologia Anatomica ("proceso", "foramen", "conducto"). Es lo que el alumno verá como respuesta correcta.
- `acepta`: **solo** variantes que el diccionario no cubre. No agregues sinónimos TA/clásica, formas sin acento, plurales, cambios de género, artículos ni reordenamientos: el motor ya los resuelve. El validador con `--podar` elimina los redundantes, pero escribir limpio desde el inicio evita ruido.
- `categoria`: úsala cuando la respuesta empieza con un sustantivo genérico que el alumno podría omitir ("ligamento sacrococcígeo" → `"categoria": "ligamento"`, así "sacrococcígeo" solo también vale). Solo valores que existan en `prefijos_categoria`.
- `fuente.pag` obligatorio; `fuente.fig` cuando el dato viene de una figura o su pie.
- `feedback`: 1-2 oraciones, tomadas del texto, que **añadan** contexto (la consecuencia clínica, el dato vecino que suele confundirse). No repitas la respuesta.
- `dificultad`: 1 = dato explícito y central; 2 = requiere distinguir entre datos vecinos; 3 = dato secundario, cifra poco enfatizada o integración de dos oraciones.
- El prompt no debe contener la respuesta. El validador avisa si todos los términos de la respuesta aparecen en el prompt.
- Nunca incluyas nombres de instituciones en los archivos.

### Por tipo
- **enumeracion**: el prompt dice cuántos elementos ("Menciona los 3..."), porque el examen real lo dice. Separa los pares con lateralidad en elementos distintos solo si el texto los cuenta por separado. `credito_parcial: true` por defecto. `penaliza_sobrantes` solo si el usuario lo pide.
- **numerico**: el prompt indica la unidad esperada. Usa `rango` cuando Moore da un intervalo ("1-2%", "40-50%"); `tol` solo para mediciones anatómicas donde el texto es aproximado ("unos 2,5 cm" → tol 0.5). Para porcentajes, edades y conteos exactos, `tol: 0`. El motor solo lee dígitos: "octava" no califica, así que no diseñes ítems cuya respuesta natural sea un número escrito en palabras.
- **respuesta_corta**: una sola entidad por respuesta. Si la pregunta natural pide dos cosas, divídela o conviértela en enumeración.
- **cloze**: copia la oración de Moore **textual**, con marcadores `{{c1}}`, `{{c2}}`... y las respuestas en `blancos`. Entre 2 y 4 huecos. Pon los huecos sobre términos de contenido; como máximo uno por ítem sobre un término relacional (comparativo, conector) y con `acepta` amplio. Incluye siempre un `prompt` breve ("Completa el enunciado:").
- **relacion**: `clave` es el estímulo en columna A; `canonico` la respuesta. Mínimo 2 pares.
- **secuencia**: solo cuando el orden es parte del conocimiento (estadios, capas de superficial a profundo). Si el orden es arbitrario, usa enumeración.

## Protección contra ambigüedad

El motor tolera errores ortográficos en proporción a la longitud del término, pero **nunca** sobre tokens protegidos: todo lo que contiene dígitos (L4, C7, 25%) y los términos de dirección u oposición listados en `palabras_protegidas` (superior/inferior, medial/lateral, aductor/abductor...). Si el bloque introduce una oposición nueva que el motor pueda confundir (dos términos de más de 9 letras que difieren en 1-3 caracteres y designan estructuras distintas), agrégala a `palabras_protegidas.lista` en forma normalizada (sin acentos, singular, masculino) y corre `prueba.mjs`.

## Ampliar el diccionario

Cuando un capítulo introduce sinonimia nueva (terminología clásica frecuente en clase, abreviaturas de uso común, epónimos alternos), agrégala a `equivalencias` como `["variante normalizada", "forma canonica normalizada"]`. Frases largas primero no hace falta: el motor ordena. Después corre `prueba.mjs` y añade al menos un caso de prueba para la nueva entrada. Entrega el diccionario actualizado junto con el bloque y menciona qué agregaste.

Mapea siempre hacia la forma TA de Moore, nunca al revés.

## Respuesta al usuario

Tras presentar el archivo, reporta brevemente:
- Bloque, número de ítems, puntos totales y distribución por tipo (del reporte del validador).
- Páginas del bloque que faltaron en el PDF, si las hubo.
- Sinónimos o palabras protegidas añadidos al diccionario.
- Contenido que decidiste no convertir en ítem y por qué, si fue relevante.

## Integración en la plataforma

Si el usuario pregunta cómo usar el motor:

```js
import DIC from './sinonimos.json';
import { crearMotor } from './normalizador.js';
const motor = crearMotor(DIC);
const r = motor.calificar(item, respuesta);
// r = { puntos, max, correcto, detalle[], avisoOrtografia, feedback, fuente }
```

Formato de `respuesta` por tipo: texto o arreglo de líneas para `enumeracion` y `secuencia`; texto para `respuesta_corta` y `numerico`; objeto `{c1: "...", c2: "..."}` para `cloze`; objeto `{"<clave>": "..."}` para `relacion`. Cuando `avisoOrtografia` es verdadero, conviene mostrar "correcto, pero se escribe X": el alumno aprende la grafía sin perder el punto.
