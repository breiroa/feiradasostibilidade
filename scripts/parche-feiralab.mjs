// FeiraLab: a Feira (e todo o proceso que leva a ela) como laboratorio para estudar como avanzar nos retos ecosociais.
// Engade, despois da portada, unha sección de presentación e outra coas investigacións (2025–2026 e SENDA 2030).
// Fontes: solicitude SENDA 2030 (estudo de patróns de consumo de alimentos; actividade de investigación transversal)
// e a ficha da acción en TIAS lab. Idempotente: se as seccións xa existen, substitúeas no seu sitio.
// Uso: node scripts/parche-feiralab.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const fila = JSON.parse(wr(`--json --command "SELECT datos FROM documentos WHERE coleccion='paxinas_libres' AND id='feiralab'"`))[0].results[0];
if (!fila) {
  console.log('Non existe a páxina FeiraLab.');
  process.exit(0);
}
const d = JSON.parse(fila.datos);

const novas = [
  {
    id: 'fl-laboratorio',
    tipo: 'texto_imaxe',
    oculta: false,
    fondo: 'branco',
    etiqueta: 'A Feira como laboratorio',
    titulo: 'Cada Feira é tamén unha pregunta de investigación.',
    corpo:
      '<p>A Feira e todo o que leva ata ela —a formación do profesorado, as investigacións do alumnado, os foros e as conferencias— funcionan tamén como un laboratorio: un espazo para estudar, coa comunidade educativa e co acompañamento da Universidade de Vigo, como avanzar fronte aos retos ecosociais.</p>' +
      '<p>Mentres o alumnado investiga e actúa, observamos que funciona, que dificultades aparecen e que aprendizaxes se poden levar a outros centros.</p>',
    imaxe: 'f-alumnado-presenta-investigacion',
    imaxeAlt: 'Alumnado presentando os resultados da investigación cidadá',
    posicion: 'dereita',
    botons: [],
  },
  {
    id: 'fl-investigacions',
    tipo: 'tarxetas',
    oculta: false,
    fondo: 'claro',
    etiqueta: 'Que investigamos',
    titulo: 'Unha pregunta por curso.',
    columnas: 2,
    items: [
      {
        etiqueta: '2025 – 2026 · Feito',
        titulo: 'Consumo de alimentos e clima',
        texto:
          'Que comemos nos fogares de Pontevedra e que pegada climática deixa? O alumnado do IES Luís Seoane fixo enquisas por todo o concello, coa Universidade de Vigo e CIDEL Galicia, e presentou os resultados no I Foro de Desenvolvemento Local.',
      },
      {
        etiqueta: '2026 – 2027 · SENDA 2030 · En marcha',
        titulo: 'Ciencia cidadá e cidadanía global',
        texto:
          'Pode a ciencia cidadá axudar a educar para unha cidadanía global? Estudámolo durante todo o curso, con cuestionarios ao alumnado ao comezo e ao final e valoracións do profesorado. O resultado será un informe aberto con recomendacións para os centros.',
      },
    ],
  },
];

// Se xa existen, substitúense no seu sitio; se non, van despois da portada
const ids = new Set(novas.map((s) => s.id));
if (d.seccions.some((s) => ids.has(s.id))) d.seccions = d.seccions.flatMap((s) => (s.id === novas[0].id ? novas : ids.has(s.id) ? [] : [s]));
else d.seccions.splice(d.seccions.findIndex((s) => s.tipo === 'heroe') + 1, 0, ...novas);
d.descricion = 'A Feira da Sostibilidade como laboratorio: investigación, acción e cidadanía crítica para avanzar fronte aos retos ecosociais.';

const fsql = path.join(RAIZ, 'semente', 'parche-feiralab.sql');
fs.writeFileSync(fsql, `UPDATE documentos SET datos = ${q(JSON.stringify(d))}, actualizado = datetime('now') WHERE coleccion = 'paxinas_libres' AND id = 'feiralab';\n`);
wr(`--file "${fsql}" -y`);
console.log('FeiraLab actualizado.');
