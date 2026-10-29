/**
 * normalizador.js
 * Motor de normalizacion y calificacion para banco de preguntas de anatomia.
 *
 * Principio de diseno: la MISMA cadena de transformaciones se aplica a la
 * respuesta del alumno y a cada respuesta aceptada. Eso permite ser agresivo:
 * un falso positivo entre dos formas de nombrar la misma estructura es inocuo;
 * un falso negativo por una tilde o por "apofisis" vs "proceso" destruye la
 * confianza del alumno en la herramienta.
 *
 * Uso (Vite / ESM):
 *   import DIC from './sinonimos.json';
 *   import { crearMotor } from './normalizador.js';
 *   const motor = crearMotor(DIC);
 *   motor.calificar(item, respuestaDelAlumno);
 */

// ---------------------------------------------------------------------------
// 1. Primitivas de texto
// ---------------------------------------------------------------------------

/**
 * Version del motor. Subir al cambiar la logica de comparacion, para poder
 * verificar desde la plataforma que la version desplegada es la esperada.
 *   1.0.0  normalizacion base, sinonimia, tolerancia ortografica
 *   1.1.0  tokens protegidos (digitos y terminos de direccion u oposicion)
 *   1.2.0  nucleos genericos opcionales + maximo acoplamiento bipartito
 *   1.3.0  reduccion de nucleos por pares + autodiagnostico
 *   1.4.0  "%" y ordinales (ª º °) se ignoran ("9%" = "9", "4.ª" = "4");
 *          tipo "definicion" de calificacion manual con respuesta modelo
 */
export const VERSION = '1.4.0';

/** Quita diacriticos: "apófisis" -> "apofisis", "cóccix" -> "coccix". */
export function sinAcentos(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
}

/** Limpieza basica: minusculas, sin acentos, sin puntuacion, espacios colapsados. */
export function limpiar(s) {
  return sinAcentos(String(s ?? ''))
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')       // guiones tipograficos -> guion simple
    .replace(/[%ªº°]/g, ' ')                // "9%" = "9"; "4.ª" = "4"
    .replace(/[^\p{L}\p{N}\s\-\/%.,]/gu, ' ')
    .replace(/[\-\/_.,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de Levenshtein con corte temprano. */
export function levenshtein(a, b, corte = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > corte) return corte + 1;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    let minFila = cur[0];
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + costo);
      if (cur[j] < minFila) minFila = cur[j];
    }
    if (minFila > corte) return corte + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** Tolerancia ortografica escalada por longitud del termino canonico. */
export function toleranciaOrtografica(termino) {
  const L = termino.length;
  if (L <= 5) return 0;
  if (L <= 9) return 1;
  if (L <= 15) return 2;
  return 3;   // "esternocleidomastoideo" (22) admite 3 errores
}

// ---------------------------------------------------------------------------
// 2. Motor
// ---------------------------------------------------------------------------

export function crearMotor(DIC) {
  const VACIAS = new Set(DIC.palabras_vacias);
  const EXC_PLURAL = new Set(DIC.excepciones_plural);
  const GENERO = DIC.adjetivos_genero || {};
  const PROTEGIDAS = new Set((DIC.palabras_protegidas?.lista || []).map(limpiar));
  const NUCLEOS = new Set((DIC.nucleos_opcionales?.lista || []).map(limpiar));

  /**
   * Quita los sustantivos genericos que encabezan el nombre de una estructura,
   * para que "plano sagital" y "sagital" califiquen igual. Nunca vacia la
   * cadena: si todo lo que queda son nucleos, devuelve la forma original.
   */
  function sinNucleo(norm) {
    const toks = norm.split(' ').filter(t => t && !NUCLEOS.has(t));
    return toks.length ? toks.join(' ') : norm;
  }

  /**
   * Reduccion por pares: elimina de cada lado solo los nucleos genericos que el
   * otro lado NO escribio. Asi "sistemas" califica contra "anatomia por
   * sistemas" (sobra "anatomia") sin que "ligamento" califique contra
   * "ligamento nucal" (el generico esta en ambos y "nucal" queda sin pareja).
   * Si algun lado quedara vacio, se devuelven las formas originales.
   */
  function reducirPar(a, b) {
    const ta = a.split(' ').filter(Boolean);
    const tb = b.split(' ').filter(Boolean);
    const sa = new Set(ta), sb = new Set(tb);
    const ra = ta.filter(t => !(NUCLEOS.has(t) && !sb.has(t)));
    const rb = tb.filter(t => !(NUCLEOS.has(t) && !sa.has(t)));
    if (!ra.length || !rb.length) return [a, b];
    return [ra.join(' '), rb.join(' ')];
  }

  /**
   * Firma de tokens protegidos: todo token con digitos (L4, C7, 25%) y todo
   * termino de direccion u oposicion (superior/inferior, aductor/abductor).
   * La tolerancia ortografica solo se permite si esta firma coincide exacta.
   */
  function firmaProtegida(norm) {
    return norm.split(' ').filter(t => /\d/.test(t) || PROTEGIDAS.has(t)).sort().join(' ');
  }

  // Equivalencias ordenadas de frase mas larga a mas corta, para que
  // "apofisis espinosa" gane sobre "apofisis".
  const EQUIV = [...DIC.equivalencias]
    .map(([de, a]) => [limpiar(de), limpiar(a)])
    .sort((x, y) => y[0].split(' ').length - x[0].split(' ').length);

  // Prefijos de categoria, mas largos primero.
  const PREFIJOS = {};
  for (const [cat, lista] of Object.entries(DIC.prefijos_categoria || {})) {
    PREFIJOS[cat] = [...lista].map(limpiar)
      .sort((a, b) => b.split(' ').length - a.split(' ').length);
  }

  /** Singularizacion conservadora del espanol. */
  function singular(w) {
    if (EXC_PLURAL.has(w) || w.length <= 4) return w;
    if (w.endsWith('ces')) return w.slice(0, -3) + 'z';       // raices -> raiz
    if (w.endsWith('es') && w.length > 5) return w.slice(0, -2);
    if (w.endsWith('s') && /[aeiou]/.test(w[w.length - 2])) return w.slice(0, -1);
    return w;
  }

  /** Aplica equivalencias multi-palabra sobre la cadena completa. */
  function aplicarEquivalencias(s) {
    let out = ` ${s} `;
    for (const [de, a] of EQUIV) {
      const patron = new RegExp(`(?<=\\s)${de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s)`, 'g');
      out = out.replace(patron, a);
    }
    return out.trim().replace(/\s+/g, ' ');
  }

  /** Quita el prefijo generico de categoria si el item declara una. */
  function quitarPrefijo(s, categoria) {
    if (!categoria || !PREFIJOS[categoria]) return s;
    for (const p of PREFIJOS[categoria]) {
      if (s === p) return s;                       // no vaciar la respuesta
      if (s.startsWith(p + ' ')) return s.slice(p.length + 1);
    }
    return s;
  }

  /**
   * Normalizacion completa.
   * @param {string} txt
   * @param {{categoria?: string, agresivo?: boolean}} opts
   *        agresivo=true aplica singularizacion y unificacion de genero.
   */
  function normalizar(txt, opts = {}) {
    let s = limpiar(txt);
    if (!s) return '';
    s = aplicarEquivalencias(s);
    s = quitarPrefijo(s, opts.categoria);

    let toks = s.split(' ').filter(t => t && !VACIAS.has(t));

    if (opts.agresivo !== false) {
      toks = toks.map(t => GENERO[t] || t);
      toks = toks.map(singular);
      toks = toks.map(t => GENERO[t] || t);   // segunda pasada tras singularizar
    }
    // El orden de palabras no debe decidir la calificacion:
    // "ligamento longitudinal anterior" == "anterior longitudinal ligamento".
    if (opts.ordenLibre !== false) toks = toks.sort();

    // Una equivalencia puede duplicar un token: "el atlas (C1)" -> "atlas atlas".
    // Tras ordenar, los duplicados quedan contiguos.
    if (opts.ordenLibre !== false) toks = toks.filter((t, i) => t !== toks[i - 1]);

    return toks.join(' ');
  }

  /**
   * Compara una respuesta contra un conjunto de formas aceptadas.
   * @returns {{ok: boolean, via: 'exacto'|'normalizado'|'ortografia'|null, distancia: number}}
   */
  function coincide(respuesta, aceptadas, opts = {}) {
    const rLimpia = limpiar(respuesta);
    if (!rLimpia) return { ok: false, via: null, distancia: Infinity };

    // Paso 1: igualdad literal tras limpieza basica.
    for (const a of aceptadas) {
      if (rLimpia === limpiar(a)) return { ok: true, via: 'exacto', distancia: 0 };
    }

    // Paso 2: igualdad tras normalizacion completa.
    const rNorm = normalizar(respuesta, opts);
    const aNorms = aceptadas.map(a => normalizar(a, opts));
    for (const a of aNorms) {
      if (rNorm === a) return { ok: true, via: 'normalizado', distancia: 0 };
    }

    // Paso 2b: igualdad ignorando el sustantivo generico que encabeza la
    // estructura ("sagital" contra "plano sagital"). Se desactiva por item
    // cuando quitarlo volveria ambiguos dos elementos (opts.nucleo === false).
    if (opts.nucleo !== false) {
      for (const a of aNorms) {
        const [r2, a2] = reducirPar(rNorm, a);
        if (r2 === a2) return { ok: true, via: 'nucleo', distancia: 0 };
      }
    }

    // Paso 3: tolerancia ortografica sobre la forma normalizada, solo si los
    // tokens protegidos coinciden exactos. Sin esto, "epifisis anular superior"
    // calificaba contra "...inferior" y "desplazamiento 50%" contra "25%".
    let mejor = Infinity;
    for (const a of aNorms) {
      const [rCore, aCore] = opts.nucleo === false ? [rNorm, a] : reducirPar(rNorm, a);
      if (firmaProtegida(aCore) !== firmaProtegida(rCore)) continue;
      const tol = opts.tolerancia ?? toleranciaOrtografica(aCore);
      if (tol === 0) continue;
      const d = levenshtein(rCore, aCore, tol);
      if (d < mejor) mejor = d;
      if (d <= tol) return { ok: true, via: 'ortografia', distancia: d };
    }

    return { ok: false, via: null, distancia: mejor };
  }

  // -------------------------------------------------------------------------
  // 3. Calificadores por tipo de item
  // -------------------------------------------------------------------------

  function formasDe(el) {
    return [el.canonico, ...(el.acepta || [])];
  }

  /**
   * Opciones de comparacion de un item. Desactiva el despojo de nucleos cuando
   * dos elementos del mismo item quedarian iguales sin el ("arteria facial" y
   * "vena facial"), porque ahi el generico SI distingue.
   */
  function opcionesDe(item) {
    const opts = { categoria: item.categoria };
    const grupos = item.respuesta?.elementos || item.respuesta?.pares
      || (item.blancos ? Object.values(item.blancos) : null);
    if (grupos && grupos.length > 1) {
      const nucleos = grupos.map(g => sinNucleo(normalizar(g.canonico, opts)));
      if (new Set(nucleos).size !== nucleos.length) opts.nucleo = false;
    }
    return opts;
  }

  /** Divide un textarea en entradas: saltos de linea, comas, punto y coma, numeracion. */
  function trocear(entrada) {
    if (Array.isArray(entrada)) return entrada.map(s => String(s).trim()).filter(Boolean);
    return String(entrada ?? '')
      .split(/\r?\n|[;,]|(?:^|\s)\d+[.)]\s*/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  /**
   * Maximo acoplamiento bipartito (algoritmo de Kuhn). Sin esto, una respuesta
   * que puede satisfacer a dos elementos se asigna al primero que la reclama y
   * deja al otro sin pareja: "medio sagital" se llevaba el punto de "plano
   * sagital" y "plano medio" quedaba sin acertar.
   * @param {number[][]} candidatos candidatos[i] = indices de respuestas que sirven al elemento i
   * @returns {number[]} asignado[i] = indice de respuesta, o -1
   */
  function emparejar(candidatos) {
    const asignado = candidatos.map(() => -1);
    const duenio = new Map();   // indice de respuesta -> indice de elemento
    const intentar = (i, visto) => {
      for (const j of candidatos[i]) {
        if (visto.has(j)) continue;
        visto.add(j);
        const prev = duenio.get(j);
        if (prev === undefined || intentar(prev, visto)) {
          duenio.set(j, i);
          asignado[i] = j;
          return true;
        }
      }
      return false;
    };
    for (let i = 0; i < candidatos.length; i++) intentar(i, new Set());
    return asignado;
  }

  function calificarEnumeracion(item, entrada) {
    const dadas = trocear(entrada);
    const opts = opcionesDe(item);
    const els = item.respuesta.elementos;

    // Todas las coincidencias posibles, antes de decidir a quien se le asigna cada una.
    const vias = new Map();
    const candidatos = els.map((el, i) => {
      const lista = [];
      for (let j = 0; j < dadas.length; j++) {
        const r = coincide(dadas[j], formasDe(el), opts);
        if (r.ok) { lista.push(j); vias.set(`${i}:${j}`, r.via); }
      }
      return lista;
    });

    const asignado = emparejar(candidatos);
    const usados = new Set(asignado.filter(j => j >= 0));
    const detalle = els.map((el, i) => {
      const j = asignado[i];
      return j >= 0
        ? { esperado: el.canonico, dado: dadas[j], ok: true, via: vias.get(`${i}:${j}`) }
        : { esperado: el.canonico, dado: null, ok: false, via: null };
    });

    const aciertos = usados.size;
    const sobrantes = dadas.filter((_, j) => !usados.has(j));
    const max = els.length;
    let puntos = item.respuesta.credito_parcial === false
      ? (aciertos === max ? max : 0)
      : aciertos;

    if (item.respuesta.penaliza_sobrantes) {
      puntos = Math.max(0, puntos - sobrantes.length);
    }

    return { tipo: 'enumeracion', puntos, max, correcto: puntos === max, detalle, sobrantes };
  }

  function calificarSecuencia(item, entrada) {
    const dadas = trocear(entrada);
    const els = item.respuesta.elementos;
    const detalle = [];
    let aciertos = 0;
    for (let i = 0; i < els.length; i++) {
      const r = dadas[i] ? coincide(dadas[i], formasDe(els[i]), opcionesDe(item))
                         : { ok: false, via: null };
      if (r.ok) aciertos++;
      detalle.push({ posicion: i + 1, esperado: els[i].canonico, dado: dadas[i] ?? null, ok: r.ok, via: r.via });
    }
    return { tipo: 'secuencia', puntos: aciertos, max: els.length, correcto: aciertos === els.length, detalle };
  }

  function calificarCorta(item, entrada) {
    const r = coincide(entrada, formasDe(item.respuesta), opcionesDe(item));
    return {
      tipo: 'respuesta_corta',
      puntos: r.ok ? 1 : 0, max: 1, correcto: r.ok, via: r.via,
      detalle: [{ esperado: item.respuesta.canonico, dado: String(entrada ?? '').trim(), ok: r.ok, via: r.via }]
    };
  }

  function parseNumero(s) {
    const t = limpiar(s).replace(',', '.');
    const m = t.match(/-?\d+(?:\.\d+)?/g);
    return m ? m.map(Number) : [];
  }

  function calificarNumerico(item, entrada) {
    const nums = parseNumero(entrada);
    const R = item.respuesta;
    let ok = false;
    if (nums.length) {
      if (R.rango) {
        // Acepta que el alumno de un solo valor dentro del rango, o el rango completo.
        const [lo, hi] = R.rango;
        ok = nums.every(n => n >= lo - (R.tol ?? 0) && n <= hi + (R.tol ?? 0));
      } else {
        const tol = R.tol ?? 0;
        ok = nums.some(n => Math.abs(n - R.valor) <= tol);
      }
    }
    const esperado = R.rango ? `${R.rango[0]}-${R.rango[1]} ${R.unidad ?? ''}`.trim()
                             : `${R.valor} ${R.unidad ?? ''}`.trim();
    return {
      tipo: 'numerico', puntos: ok ? 1 : 0, max: 1, correcto: ok,
      detalle: [{ esperado, dado: String(entrada ?? '').trim(), ok }]
    };
  }

  function calificarCloze(item, entrada) {
    const resp = entrada && typeof entrada === 'object' ? entrada : {};
    const claves = Object.keys(item.blancos);
    const detalle = [];
    let aciertos = 0;
    for (const k of claves) {
      const b = item.blancos[k];
      const r = coincide(resp[k], [b.canonico, ...(b.acepta || [])], { categoria: b.categoria });
      if (r.ok) aciertos++;
      detalle.push({ blanco: k, esperado: b.canonico, dado: resp[k] ?? null, ok: r.ok, via: r.via });
    }
    return { tipo: 'cloze', puntos: aciertos, max: claves.length, correcto: aciertos === claves.length, detalle };
  }

  function calificarRelacion(item, entrada) {
    const resp = entrada && typeof entrada === 'object' ? entrada : {};
    const detalle = [];
    let aciertos = 0;
    for (const par of item.respuesta.pares) {
      const r = coincide(resp[par.clave], [par.canonico, ...(par.acepta || [])], opcionesDe(item));
      if (r.ok) aciertos++;
      detalle.push({ clave: par.clave, esperado: par.canonico, dado: resp[par.clave] ?? null, ok: r.ok, via: r.via });
    }
    const max = item.respuesta.pares.length;
    return { tipo: 'relacion', puntos: aciertos, max, correcto: aciertos === max, detalle };
  }

  /**
   * Definicion: calificacion MANUAL. El motor no asigna puntos (puntos = null);
   * devuelve la respuesta modelo y, como ayuda para quien califica, que
   * palabras clave aparecen en el texto del alumno (tolerando acentos,
   * sinonimia y ortografia). La deteccion es orientativa, no una nota.
   */
  function calificarDefinicion(item, entrada) {
    const R = item.respuesta || {};
    const texto = String(entrada ?? '');
    // limpiar() conserva el orden de las palabras (normalizar() las ordena),
    // asi que las ventanas recorren frases contiguas del alumno.
    const tokens = limpiar(texto).split(' ').filter(Boolean);
    const detalle = (R.palabras_clave || []).map(kw => {
      const n = limpiar(kw).split(' ').filter(Boolean).length || 1;
      let hit = { ok: false, via: null };
      for (let k = 1; k <= n + 2 && !hit.ok; k++)
        for (let i = 0; i + k <= tokens.length && !hit.ok; i++) {
          const r = coincide(tokens.slice(i, i + k).join(' '), [kw], { nucleo: false });
          if (r.ok) hit = r;
        }
      return { esperado: kw, ok: hit.ok, via: hit.via };
    });
    return {
      tipo: 'definicion', manual: true, puntos: null, max: R.puntos ?? 1, correcto: null,
      modelo: R.modelo ?? null, dado: texto.trim(), detalle
    };
  }

  const DESPACHO = {
    definicion: calificarDefinicion,
    enumeracion: calificarEnumeracion,
    secuencia: calificarSecuencia,
    respuesta_corta: calificarCorta,
    numerico: calificarNumerico,
    cloze: calificarCloze,
    relacion: calificarRelacion
  };

  /** Punto de entrada unico. */
  function calificar(item, entrada) {
    const fn = DESPACHO[item.tipo];
    if (!fn) throw new Error(`Tipo de item no soportado: ${item.tipo}`);
    const res = fn(item, entrada);
    res.id = item.id;
    res.feedback = item.feedback ?? null;
    res.fuente = item.fuente ?? null;
    // Aviso de ortografia: el alumno acerto pero escribio mal.
    res.avisoOrtografia = item.tipo !== 'definicion'
      && (res.detalle || []).some(d => d.ok && d.via === 'ortografia');
    return res;
  }

  /**
   * Autodiagnostico: ejecuta las capacidades que distinguen cada version del
   * motor. Sirve para confirmar desde la plataforma que lo desplegado es lo
   * esperado, sin depender de revisar el archivo a ojo.
   *   motor.autodiagnostico()  ->  { version, ok, casos: [...] }
   */
  function autodiagnostico() {
    const casos = [
      { desde: '1.0.0', desc: 'sinonimia TA/clasica: "apofisis espinosa" = "proceso espinoso"',
        ok: coincide('apófisis espinosa', ['proceso espinoso']).ok },
      { desde: '1.1.0', desc: 'tokens protegidos: "epifisis anular superior" != "...inferior"',
        ok: !coincide('epifisis anular superior', ['epífisis anular inferior']).ok },
      { desde: '1.2.0', desc: 'nucleo generico: "sagital" = "plano sagital"',
        ok: coincide('sagital', ['plano sagital']).ok },
      { desde: '1.3.0', desc: 'reduccion por pares: "sistemas" = "anatomia por sistemas"',
        ok: coincide('sistemas', ['anatomía por sistemas']).ok },
      { desde: '1.3.0', desc: 'no sobre-permisivo: "ligamento" != "ligamento nucal"',
        ok: !coincide('ligamento', ['ligamento nucal']).ok },
      { desde: '1.4.0', desc: 'porcentaje y ordinal: "9%" = "9", "4.ª" = "4"',
        ok: coincide('9%', ['9']).ok && coincide('4.ª', ['4']).ok },
      { desde: '1.4.0', desc: 'definicion: calificacion manual (puntos = null)',
        ok: calificar({ tipo: 'definicion', respuesta: { modelo: 'x', palabras_clave: ['hueso'] } }, 'hueso').puntos === null }
    ];
    return { version: VERSION, ok: casos.every(c => c.ok), casos };
  }

  return { normalizar, coincide, calificar, limpiar, trocear, sinNucleo, opcionesDe, autodiagnostico, VERSION };
}
