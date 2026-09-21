import fs from 'node:fs';
import { crearMotor } from './normalizador.js';

const DIC = JSON.parse(fs.readFileSync(new URL('../assets/sinonimos.json', import.meta.url)));
const BANCO = JSON.parse(fs.readFileSync(new URL('../assets/ejemplo-bloque.json', import.meta.url)));
const motor = crearMotor(DIC);
const item = id => BANCO.items.find(i => i.id === id);

let pasa = 0, falla = 0;
function t(desc, cond) {
  if (cond) { pasa++; console.log(`  ok   ${desc}`); }
  else { falla++; console.log(`  FALLA ${desc}`); }
}

console.log('\n== Equivalencia TA <-> clasica ==');
t('"apófisis espinosa" == "proceso espinoso"',
  motor.coincide('apófisis espinosa', ['proceso espinoso']).ok);
t('"agujero transverso" == "foramen transverso"',
  motor.coincide('agujero transverso', ['foramen transverso']).ok);
t('"canal vertebral" == "conducto vertebral"',
  motor.coincide('canal vertebral', ['conducto vertebral']).ok);
t('"ganglio linfático" == "nódulo linfático"',
  motor.coincide('ganglio linfatico', ['nódulo linfático']).ok);
t('"apófisis odontoides" == "diente del axis"',
  motor.coincide('apófisis odontoides', ['diente del axis']).ok);
t('"articulación interapofisaria" == "articulación cigapofisaria"',
  motor.coincide('articulacion interapofisaria', ['articulación cigapofisaria']).ok);

console.log('\n== Acentos, mayusculas, articulos, orden ==');
t('"CENTRUM" == "centrum"', motor.coincide('CENTRUM', ['centrum']).ok);
t('"el hiato del sacro" == "hiato sacro"',
  motor.coincide('el hiato del sacro', ['hiato sacro']).ok);
t('"anterior ligamento longitudinal" == "ligamento longitudinal anterior"',
  motor.coincide('anterior ligamento longitudinal', ['ligamento longitudinal anterior']).ok);
t('"coxis" == "cóccix"', motor.coincide('coxis', ['cóccix']).ok);
t('"epifisis anulares" == "epífisis anular"',
  motor.coincide('epifisis anulares', ['epífisis anular']).ok);

console.log('\n== Prefijo de categoria ==');
t('"C1" == "atlas" (categoria vertebra)',
  motor.coincide('C1', ['el atlas (C1)'], { categoria: 'vertebra' }).ok);
t('"sacrococcígeo" == "ligamento sacrococcígeo membranoso" NO debe pasar entero, pero "ligamento sacrococcigeo" si',
  motor.coincide('ligamento sacrococcigeo', ['ligamento sacrococcígeo'], { categoria: 'ligamento' }).ok);

console.log('\n== Tolerancia ortografica ==');
t('"esternocleidomastoideo" mal escrito pasa',
  motor.coincide('esternocleidomastoide', ['esternocleidomastoideo']).ok);
t('"cigapofisaria" con un typo pasa',
  motor.coincide('cigapofisiaria', ['cigapofisaria']).ok);
t('"atlas" != "axis" (palabra corta, sin tolerancia)',
  !motor.coincide('atlas', ['axis']).ok);
t('"L4" != "L5" (no confundir niveles)',
  !motor.coincide('L4', ['L5']).ok);

console.log('\n== Tokens protegidos (regresion) ==');
t('"epifisis anular superior" NO califica contra "...inferior"',
  !motor.coincide('epifisis anular superior', ['epífisis anular del borde inferior del cuerpo vertebral']).ok);
t('"desplazamiento del 50%" NO califica contra "25%"',
  !motor.coincide('desplazamiento del 50%', ['subluxación anterior con desplazamiento anterior del 25%']).ok);
t('"aductor largo" NO califica contra "abductor largo"',
  !motor.coincide('aductor largo', ['abductor largo']).ok);
t('"proceso espinoso de L4" NO califica contra "L5"',
  !motor.coincide('proceso espinoso de L4', ['proceso espinoso de L5']).ok);
t('"arteria circunfleja humeral medial" NO contra "lateral"',
  !motor.coincide('arteria circunfleja humeral medial', ['arteria circunfleja humeral lateral']).ok);
t('"hemiarco neural izquierda" (genero) SI contra "izquierdo"',
  motor.coincide('hemiarco neural izquierda', ['hemiarco neural izquierdo']).ok);
t('typo fuera de protegidas sigue tolerado: "epifisis anlar superior"',
  motor.coincide('epifisis anlar superior', ['epifisis anular superior']).ok);

const r5 = motor.calificar(item('P1-B05-003'),
  ['vertice del proceso espinoso', 'vertice proceso transverso derecho', 'vertice proceso transverso izquierdo',
   'epifisis anular superior', 'epifisis anular superior']);
t('repetir "superior" dos veces NO da 5/5', r5.puntos === 4);

console.log('\n== Enumeracion con credito parcial ==');
const r1 = motor.calificar(item('P1-B05-001'),
  'el centrum\napofisis... perdon, hemiarco neural derecho\nhemiarco neural izquierdo');
t('3/3 con terminologia mixta y ruido', r1.puntos === 3 && r1.correcto);

const r2 = motor.calificar(item('P1-B05-001'), 'centro endocondral, arco neural derecho');
t('2/3 con credito parcial', r2.puntos === 2 && !r2.correcto);

const r3 = motor.calificar(item('P1-B05-003'),
  ['punta de la apofisis espinosa',
   'punta de la apofisis transversa derecha',
   'punta de la apofisis transversa izquierda',
   'epifisis anular superior',
   'epifisis anular inferior']);
t('5/5 centros secundarios en terminologia clasica', r3.puntos === 5);

console.log('\n== Numerico ==');
t('"8va semana" -> 8', motor.calificar(item('P1-B05-002'), '8va semana').correcto);
t('"octava" (texto) NO califica', !motor.calificar(item('P1-B05-002'), 'octava semana').correcto);
t('"2.5 cm" con tolerancia 0.5', motor.calificar(item('P1-B05-018'), '2.5 cm').correcto);
t('"2,5" (coma decimal)', motor.calificar(item('P1-B05-018'), '2,5').correcto);
t('"3 cm" dentro de tolerancia', motor.calificar(item('P1-B05-018'), '3 cm').correcto);
t('"5 cm" fuera de tolerancia', !motor.calificar(item('P1-B05-018'), '5 cm').correcto);
t('rango 1-2%: "1" pasa', motor.calificar(item('P1-B05-013'), '1%').correcto);
t('rango 1-2%: "1 a 2" pasa', motor.calificar(item('P1-B05-013'), '1 a 2 %').correcto);
t('rango 1-2%: "5" no pasa', !motor.calificar(item('P1-B05-013'), '5%').correcto);

console.log('\n== Cloze ==');
const rc = motor.calificar(item('P1-B05-020'),
  { c1: 'interarticular', c2: 'espondilolisis traumatica', c3: 'hiperextension', c4: 'verdugo' });
t('4/4 sin acentos y con sinonimo "verdugo"', rc.puntos === 4);

const rc2 = motor.calificar(item('P1-B05-006'),
  { c1: 'apofisis odontoides', c2: 'C2', c3: 'disco IV' });
t('3/3 con odontoides, C2 y disco IV', rc2.puntos === 3);

console.log('\n== Relacion y secuencia ==');
const rr = motor.calificar(item('P1-B05-025'),
  { 'En los cuerpos vertebrales': 'espondilosis', 'En las articulaciones cigapofisarias': 'osteoartritis' });
t('2/2 relacion con sinonimo', rr.puntos === 2);

const rs = motor.calificar(item('P1-B05-021'),
  'esguince en flexion\nsubluxacion anterior\ndesplazamiento del 50%\nluxacion completa');
t('4/4 secuencia en orden', rs.puntos === 4);

const rs2 = motor.calificar(item('P1-B05-021'),
  'luxacion completa\nesguince en flexion\nsubluxacion anterior\ndesplazamiento del 50%');
t('secuencia desordenada NO da 4/4', rs2.puntos < 4);

console.log('\n== Aviso ortografico ==');
const ro = motor.calificar(item('P1-B05-019'), 'fractura de Jeferson');
t('acierta con aviso de ortografia', ro.correcto && ro.avisoOrtografia);

console.log(`\n---\n${pasa} pasan, ${falla} fallan\n`);
process.exit(falla ? 1 : 0);
