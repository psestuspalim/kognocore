#!/usr/bin/env node
/**
 * validar.mjs — valida un bloque del banco sin dependencias externas.
 *
 * Uso:  node scripts/validar.mjs <bloque.json> [--dic ruta/sinonimos.json]
 *
 * Tres capas:
 *   1. ESTRUCTURA      campos obligatorios, tipos, patrones de ID, marcadores de cloze.
 *   2. AUTOCONSISTENCIA cada canonico y cada "acepta" debe calificar como correcto
 *                      al pasarlo por el motor real. Si no, el alumno que escribe
 *                      exactamente lo que el banco dice aceptar seria marcado mal.
 *   3. AMBIGUEDAD      dentro de un mismo item, ninguna forma de un elemento debe
 *                      coincidir con otra forma de un elemento distinto (p. ej. dos
 *                      elementos que el normalizador colapsa en la misma cadena).
 *
 * Sale con codigo 1 si hay errores. Las advertencias no bloquean.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearMotor } from './normalizador.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const archivo = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--dic');
const iDic = args.indexOf('--dic');
const rutaDic = iDic >= 0 ? args[iDic + 1] : path.join(aqui, '../assets/sinonimos.json');
const PODAR = args.includes('--podar');      // reescribe el archivo sin variantes redundantes
const VERBOSO = args.includes('--verboso');  // lista cada redundancia
let totalRedundantes = 0;

if (!archivo) {
  console.error('Uso: node scripts/validar.mjs <bloque.json> [--dic sinonimos.json]');
  process.exit(2);
}

const DIC = JSON.parse(fs.readFileSync(rutaDic, 'utf8'));
const motor = crearMotor(DIC);
let B;
try { B = JSON.parse(fs.readFileSync(archivo, 'utf8')); }
catch (e) { console.error(`JSON ilegible: ${e.message}`); process.exit(1); }

const errores = [];
const avisos = [];
const E = (id, m) => errores.push(`[${id}] ${m}`);
const W = (id, m) => avisos.push(`[${id}] ${m}`);

const TIPOS = new Set(['enumeracion', 'secuencia', 'respuesta_corta', 'numerico', 'cloze', 'relacion']);
const CATEGORIAS = new Set(Object.keys(DIC.prefijos_categoria || {}));
const esTexto = v => typeof v === 'string' && v.trim().length > 0;

// ---------------------------------------------------------------- 1. estructura
const b = B.bloque || {};
if (!/^P[1-3]-B\d{2}$/.test(b.id || '')) E('bloque', `id invalido: "${b.id}" (esperado P1-B05)`);
for (const k of ['titulo', 'sesion', 'paginas']) if (!esTexto(b[k])) E('bloque', `falta "${k}"`);
if (![1, 2, 3].includes(b.parcial)) E('bloque', 'parcial debe ser 1, 2 o 3');
if (b.id && b.parcial && Number(b.id[1]) !== b.parcial) E('bloque', `id ${b.id} no corresponde a parcial ${b.parcial}`);
if (!Array.isArray(B.items) || !B.items.length) { E('bloque', 'items vacio'); fin(); }

const vistos = new Set();

function chequearElemento(id, el, donde) {
  if (!el || !esTexto(el.canonico)) { E(id, `${donde}: falta canonico`); return false; }
  if (el.acepta && !Array.isArray(el.acepta)) { E(id, `${donde}: "acepta" debe ser arreglo`); return false; }
  for (const a of el.acepta || []) {
    if (!esTexto(a)) E(id, `${donde}: entrada vacia en acepta`);
    else if (!motor.normalizar(a)) E(id, `${donde}: "${a}" queda vacio tras normalizar (solo palabras vacias)`);
  }
  if (!motor.normalizar(el.canonico)) W(id, `${donde}: canonico "${el.canonico}" queda vacio tras normalizar`);
  return true;
}

for (const it of B.items) {
  const id = it.id || '(sin id)';
  if (!/^P[1-3]-B\d{2}-\d{3}$/.test(it.id || '')) E(id, 'id invalido (esperado P1-B05-001)');
  else if (b.id && !it.id.startsWith(b.id + '-')) E(id, `id no pertenece al bloque ${b.id}`);
  if (vistos.has(it.id)) E(id, 'id duplicado');
  vistos.add(it.id);

  if (!TIPOS.has(it.tipo)) { E(id, `tipo desconocido "${it.tipo}"`); continue; }
  if (!esTexto(it.prompt)) E(id, 'falta prompt');
  if (!it.fuente || it.fuente.pag === undefined || it.fuente.pag === '') E(id, 'falta fuente.pag');
  if (![1, 2, 3].includes(it.dificultad)) E(id, 'dificultad debe ser 1, 2 o 3');
  if (it.categoria && !CATEGORIAS.has(it.categoria)) E(id, `categoria "${it.categoria}" no existe en sinonimos.json`);
  if (!esTexto(it.feedback)) W(id, 'sin feedback');

  const R = it.respuesta;
  switch (it.tipo) {
    case 'enumeracion':
    case 'secuencia':
      if (!R || !Array.isArray(R.elementos) || R.elementos.length < 2) E(id, 'requiere respuesta.elementos (>=2)');
      else R.elementos.forEach((el, i) => chequearElemento(id, el, `elemento ${i + 1}`));
      break;
    case 'respuesta_corta':
      chequearElemento(id, R, 'respuesta');
      break;
    case 'numerico': {
      if (!R) { E(id, 'falta respuesta'); break; }
      const tieneV = typeof R.valor === 'number', tieneR = Array.isArray(R.rango);
      if (tieneV === tieneR) E(id, 'numerico requiere exactamente uno: valor o rango');
      if (tieneR && (R.rango.length !== 2 || R.rango[0] > R.rango[1])) E(id, 'rango invalido');
      if (R.tol !== undefined && (typeof R.tol !== 'number' || R.tol < 0)) E(id, 'tol invalida');
      if (!esTexto(R.unidad)) W(id, 'numerico sin unidad');
      break;
    }
    case 'cloze': {
      if (!esTexto(it.texto)) { E(id, 'cloze requiere texto'); break; }
      if (!it.blancos || typeof it.blancos !== 'object') { E(id, 'cloze requiere blancos'); break; }
      const enTexto = new Set([...it.texto.matchAll(/\{\{(c\d+)\}\}/g)].map(m => m[1]));
      const enBlancos = new Set(Object.keys(it.blancos));
      for (const k of enTexto) if (!enBlancos.has(k)) E(id, `marcador {{${k}}} sin definicion en blancos`);
      for (const k of enBlancos) {
        if (!/^c\d+$/.test(k)) E(id, `clave de blanco invalida "${k}"`);
        if (!enTexto.has(k)) E(id, `blanco ${k} no aparece en el texto`);
        chequearElemento(id, it.blancos[k], `blanco ${k}`);
      }
      if (/\{\{c\d+::/.test(it.texto)) E(id, 'usa {{c1}} sin respuesta embebida; la respuesta va en blancos');
      break;
    }
    case 'relacion':
      if (!R || !Array.isArray(R.pares) || R.pares.length < 2) E(id, 'requiere respuesta.pares (>=2)');
      else R.pares.forEach((p, i) => {
        if (!esTexto(p.clave)) E(id, `par ${i + 1}: falta clave`);
        chequearElemento(id, p, `par ${i + 1}`);
      });
      break;
  }
}

if (errores.length) fin();   // no tiene sentido simular sobre una estructura rota

// ---------------------------------------------------------- 2. autoconsistencia
const formas = el => [el.canonico, ...(el.acepta || [])];

for (const it of B.items) {
  const id = it.id;
  const opts = { categoria: it.categoria };
  switch (it.tipo) {
    case 'respuesta_corta':
      for (const f of formas(it.respuesta))
        if (!motor.calificar(it, f).correcto) E(id, `la forma aceptada "${f}" NO califica como correcta`);
      break;
    case 'enumeracion':
    case 'secuencia': {
      const els = it.respuesta.elementos;
      // Respuesta completa con canonicos.
      const r = motor.calificar(it, els.map(e => e.canonico));
      if (!r.correcto) E(id, `la lista de canonicos obtiene ${r.puntos}/${r.max}`);
      // Cada variante sustituida en su posicion.
      els.forEach((el, i) => {
        for (const f of el.acepta || []) {
          const lista = els.map(e => e.canonico); lista[i] = f;
          const rr = motor.calificar(it, lista);
          if (!rr.correcto) E(id, `variante "${f}" del elemento ${i + 1} rompe la calificacion (${rr.puntos}/${rr.max})`);
        }
      });
      break;
    }
    case 'cloze':
      for (const [k, bl] of Object.entries(it.blancos))
        for (const f of formas(bl))
          if (!motor.coincide(f, formas(bl), { categoria: bl.categoria }).ok)
            E(id, `blanco ${k}: "${f}" no califica`);
      break;
    case 'relacion':
      for (const p of it.respuesta.pares)
        for (const f of formas(p))
          if (!motor.coincide(f, formas(p), opts).ok) E(id, `par "${p.clave}": "${f}" no califica`);
      break;
    case 'numerico': {
      const R = it.respuesta;
      const prueba = R.rango ? `${R.rango[0]}` : `${R.valor}`;
      if (!motor.calificar(it, prueba).correcto) E(id, `el valor esperado ${prueba} no califica`);
      break;
    }
  }
}

// --------------------------------------------------------------- 3. ambiguedad
function colisiones(id, grupos, etiqueta, opts = {}) {
  for (let i = 0; i < grupos.length; i++)
    for (let j = i + 1; j < grupos.length; j++)
      for (const f of formas(grupos[i])) {
        const r = motor.coincide(f, formas(grupos[j]), opts);
        if (r.ok) {
          const msg = `${etiqueta} ${i + 1} ("${f}") colisiona con ${etiqueta} ${j + 1} ("${grupos[j].canonico}") via ${r.via}`;
          r.via === 'ortografia' ? W(id, msg + ' — considera bajar la tolerancia o reformular') : E(id, msg);
        }
      }
}

for (const it of B.items) {
  const opts = { categoria: it.categoria };
  if (it.tipo === 'enumeracion' || it.tipo === 'secuencia') colisiones(it.id, it.respuesta.elementos, 'elemento', opts);
  if (it.tipo === 'relacion') colisiones(it.id, it.respuesta.pares, 'par', opts);

  // Redundancia: variantes de "acepta" que el diccionario global ya cubre.
  // Con --podar se eliminan del archivo; sin el, se reportan agrupadas.
  const redundantes = [];
  const revisar = el => {
    const canon = motor.normalizar(el.canonico, el.categoria ? { categoria: el.categoria } : opts);
    const antes = el.acepta || [];
    const quedan = antes.filter(a => {
      const red = motor.normalizar(a, el.categoria ? { categoria: el.categoria } : opts) === canon;
      if (red) redundantes.push(a);
      return !red;
    });
    if (PODAR && quedan.length !== antes.length) {
      if (quedan.length) el.acepta = quedan; else delete el.acepta;
    }
  };
  if (it.respuesta?.elementos) it.respuesta.elementos.forEach(revisar);
  if (it.respuesta?.pares) it.respuesta.pares.forEach(revisar);
  if (it.tipo === 'respuesta_corta') revisar(it.respuesta);
  if (it.blancos) Object.values(it.blancos).forEach(revisar);
  if (redundantes.length) {
    totalRedundantes += redundantes.length;
    if (VERBOSO) W(it.id, `${redundantes.length} variante(s) redundante(s): ${redundantes.join(' | ')}`);
  }

  // Fuga de respuesta en el prompt.
  if (it.tipo === 'respuesta_corta') {
    const c = motor.normalizar(it.respuesta.canonico, opts).split(' ').filter(t => t.length > 3 || /\d/.test(t));
    const p = new Set(motor.normalizar(it.prompt).split(' '));
    if (c.length && c.every(t => p.has(t))) W(it.id, 'el prompt contiene todos los terminos de la respuesta');
  }
}

fin();

// -------------------------------------------------------------------- reporte
function fin() {
  const items = Array.isArray(B?.items) ? B.items : [];
  const tipos = {};
  let puntos = 0;
  for (const it of items) {
    tipos[it.tipo] = (tipos[it.tipo] || 0) + 1;
    puntos += it.respuesta?.elementos?.length || it.respuesta?.pares?.length
      || (it.blancos ? Object.keys(it.blancos).length : 1);
  }
  console.log(`\nBloque ${B?.bloque?.id ?? '?'} — ${items.length} items, ${puntos} puntos`);
  console.log('Tipos:', JSON.stringify(tipos));
  if (totalRedundantes) {
    console.log(PODAR
      ? `\nPodadas ${totalRedundantes} variantes redundantes (ya cubiertas por el diccionario).`
      : `\n${totalRedundantes} variantes en "acepta" ya las cubre el diccionario. Usa --podar para limpiarlas o --verboso para verlas.`);
  }
  if (PODAR && !errores.length && totalRedundantes) {
    fs.writeFileSync(archivo, JSON.stringify(B, null, 2) + '\n');
    console.log(`Archivo reescrito: ${archivo}`);
  }
  if (avisos.length) { console.log(`\nAvisos (${avisos.length}):`); avisos.forEach(a => console.log('  - ' + a)); }
  if (errores.length) { console.log(`\nERRORES (${errores.length}):`); errores.forEach(e => console.log('  x ' + e)); }
  console.log(errores.length ? '\nRESULTADO: INVALIDO\n' : '\nRESULTADO: VALIDO\n');
  process.exit(errores.length ? 1 : 0);
}
