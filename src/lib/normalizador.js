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

import DIC from './sinonimos.json';

// ---------------------------------------------------------------------------
// 1. Primitivas de texto
// ---------------------------------------------------------------------------

/** Quita diacriticos: "apófisis" -> "apofisis", "cóccix" -> "coccix". */
export function sinAcentos(s) {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
}

/** Limpieza basica: minusculas, sin acentos, sin puntuacion, espacios colapsados. */
export function limpiar(s) {
  return sinAcentos(String(s ?? ''))
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')       // guiones tipograficos -> guion simple
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

export function crearMotor(dic = DIC) {
  const VACIAS = new Set(dic.palabras_vacias || []);
  const EXC_PLURAL = new Set(dic.excepciones_plural || []);
  const GENERO = dic.adjetivos_genero || {};
  const PROTEGIDAS = new Set((dic.palabras_protegidas?.lista || []).map(limpiar));

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
  const EQUIV = [...(dic.equivalencias || [])]
    .map(([de, a]) => [limpiar(de), limpiar(a)])
    .sort((x, y) => y[0].split(' ').length - x[0].split(' ').length);

  // Prefijos de categoria, mas largos primero.
  const PREFIJOS = {};
  for (const [cat, lista] of Object.entries(dic.prefijos_categoria || {})) {
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
    // El orden de palabras no debe decidir la calificacion
    if (opts.ordenLibre !== false) toks = toks.sort();

    // Una equivalencia puede duplicar un token
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
      if (!a) continue;
      if (rLimpia === limpiar(a)) return { ok: true, via: 'exacto', distancia: 0 };
    }

    // Paso 2: igualdad tras normalizacion completa.
    const rNorm = normalizar(respuesta, opts);
    const aNorms = aceptadas.filter(Boolean).map(a => normalizar(a, opts));
    for (const a of aNorms) {
      if (rNorm === a) return { ok: true, via: 'normalizado', distancia: 0 };
    }

    // Paso 3: tolerancia ortografica sobre la forma normalizada
    let mejor = Infinity;
    const rFirma = firmaProtegida(rNorm);
    for (const a of aNorms) {
      if (firmaProtegida(a) !== rFirma) continue;
      const tol = opts.tolerancia ?? toleranciaOrtografica(a);
      if (tol === 0) continue;
      const d = levenshtein(rNorm, a, tol);
      if (d < mejor) mejor = d;
      if (d <= tol) return { ok: true, via: 'ortografia', distancia: d };
    }

    return { ok: false, via: null, distancia: mejor };
  }

  // -------------------------------------------------------------------------
  // 3. Calificadores por tipo de item
  // -------------------------------------------------------------------------

  function formasDe(el) {
    if (!el) return [];
    if (typeof el === 'string') return [el];
    return [el.canonico, ...(el.acepta || [])].filter(Boolean);
  }

  /** Divide un textarea en entradas: saltos de linea, comas, punto y coma, numeracion. */
  function trocear(entrada) {
    if (Array.isArray(entrada)) return entrada.map(s => String(s).trim()).filter(Boolean);
    return String(entrada ?? '')
      .split(/\r?\n|[;,]|(?:^|\s)\d+[.)]\s*/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function calificarEnumeracion(item, entrada) {
    const dadas = trocear(entrada);
    const usados = new Set();
    const detalle = [];
    let aciertos = 0;
    const elementos = item.respuesta?.elementos || [];

    for (const el of elementos) {
      let hit = null;
      for (let i = 0; i < dadas.length; i++) {
        if (usados.has(i)) continue;
        const r = coincide(dadas[i], formasDe(el), { categoria: item.categoria });
        if (r.ok) { hit = { indice: i, ...r }; break; }
      }
      if (hit) {
        usados.add(hit.indice);
        aciertos++;
        detalle.push({ esperado: el.canonico, dado: dadas[hit.indice], ok: true, via: hit.via });
      } else {
        detalle.push({ esperado: el.canonico, dado: null, ok: false, via: null });
      }
    }

    const sobrantes = dadas.filter((_, i) => !usados.has(i));
    const max = elementos.length || 1;
    let puntos = item.respuesta?.credito_parcial === false
      ? (aciertos === max ? max : 0)
      : aciertos;

    if (item.respuesta?.penaliza_sobrantes) {
      puntos = Math.max(0, puntos - sobrantes.length);
    }

    return { tipo: 'enumeracion', puntos, max, correcto: puntos === max, detalle, sobrantes };
  }

  function calificarSecuencia(item, entrada) {
    const dadas = trocear(entrada);
    const els = item.respuesta?.elementos || item.respuesta?.pasos || [];
    const detalle = [];
    let aciertos = 0;
    for (let i = 0; i < els.length; i++) {
      const r = dadas[i] ? coincide(dadas[i], formasDe(els[i]), { categoria: item.categoria })
                         : { ok: false, via: null };
      if (r.ok) aciertos++;
      detalle.push({ posicion: i + 1, esperado: els[i].canonico, dado: dadas[i] ?? null, ok: r.ok, via: r.via });
    }
    const max = els.length || 1;
    return { tipo: 'secuencia', puntos: aciertos, max, correcto: aciertos === max, detalle };
  }

  function calificarCorta(item, entrada) {
    const respObj = item.respuesta || {};
    const r = coincide(entrada, formasDe(respObj), { categoria: item.categoria });
    return {
      tipo: 'respuesta_corta',
      puntos: r.ok ? 1 : 0, max: 1, correcto: r.ok, via: r.via,
      detalle: [{ esperado: respObj.canonico || '', dado: String(entrada ?? '').trim(), ok: r.ok, via: r.via }]
    };
  }

  function parseNumero(s) {
    const t = limpiar(s).replace(',', '.');
    const m = t.match(/-?\d+(?:\.\d+)?/g);
    return m ? m.map(Number) : [];
  }

  function calificarNumerico(item, entrada) {
    const nums = parseNumero(entrada);
    const R = item.respuesta || {};
    let ok = false;
    if (nums.length) {
      if (R.rango) {
        const [lo, hi] = R.rango;
        ok = nums.every(n => n >= lo - (R.tol ?? 0) && n <= hi + (R.tol ?? 0));
      } else if (R.valor !== undefined) {
        const tol = R.tol ?? 0;
        ok = nums.some(n => Math.abs(n - R.valor) <= tol);
      }
    }
    const esperado = R.rango ? `${R.rango[0]}-${R.rango[1]} ${R.unidad ?? ''}`.trim()
                             : `${R.valor ?? ''} ${R.unidad ?? ''}`.trim();
    return {
      tipo: 'numerico', puntos: ok ? 1 : 0, max: 1, correcto: ok,
      detalle: [{ esperado, dado: String(entrada ?? '').trim(), ok }]
    };
  }

  function calificarCloze(item, entrada) {
    const resp = entrada && typeof entrada === 'object' ? entrada : {};
    const blancos = item.blancos || item.respuesta?.blancos || {};
    const claves = Object.keys(blancos);
    const detalle = [];
    let aciertos = 0;
    for (const k of claves) {
      const b = blancos[k];
      const r = coincide(resp[k], [b.canonico, ...(b.acepta || [])], { categoria: b.categoria });
      if (r.ok) aciertos++;
      detalle.push({ blanco: k, esperado: b.canonico, dado: resp[k] ?? null, ok: r.ok, via: r.via });
    }
    const max = claves.length || 1;
    return { tipo: 'cloze', puntos: aciertos, max, correcto: aciertos === max, detalle };
  }

  function calificarRelacion(item, entrada) {
    const resp = entrada && typeof entrada === 'object' ? entrada : {};
    const pares = item.respuesta?.pares || [];
    const detalle = [];
    let aciertos = 0;
    for (const par of pares) {
      const r = coincide(resp[par.clave], [par.canonico, ...(par.acepta || [])], { categoria: item.categoria });
      if (r.ok) aciertos++;
      detalle.push({ clave: par.clave, esperado: par.canonico, dado: resp[par.clave] ?? null, ok: r.ok, via: r.via });
    }
    const max = pares.length || 1;
    return { tipo: 'relacion', puntos: aciertos, max, correcto: aciertos === max, detalle };
  }

  const DESPACHO = {
    enumeracion: calificarEnumeracion,
    secuencia: calificarSecuencia,
    respuesta_corta: calificarCorta,
    numerico: calificarNumerico,
    cloze: calificarCloze,
    relacion: calificarRelacion
  };

  /** Punto de entrada unico. */
  function calificar(item, entrada) {
    const tipoNorm = String(item.tipo || item.type || '').toLowerCase();
    const fn = DESPACHO[tipoNorm];
    if (!fn) throw new Error(`Tipo de item no soportado: ${item.tipo || item.type}`);
    const res = fn(item, entrada);
    res.id = item.id;
    res.feedback = item.feedback ?? item.justificacion ?? null;
    res.fuente = item.fuente ?? null;
    res.avisoOrtografia = (res.detalle || []).some(d => d.ok && d.via === 'ortografia');
    return res;
  }

  return { normalizar, coincide, calificar, limpiar, trocear };
}

// Export singleton instance for immediate use
export const motorAnatomia = crearMotor(DIC);
