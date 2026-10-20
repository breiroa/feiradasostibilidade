// FeiraLab: a Feira (e todo o proceso que leva a ela) como laboratorio para estudar como avanzar nos retos ecosociais.
// Engade, despois da portada, unha sección de presentación e outra coas investigacións (2025–2026 e SENDA 2030).
// Fontes: solicitude SENDA 2030 (estudo de patróns de consumo de alimentos; actividade de investigación transversal)
// e a ficha da acción en TIAS lab. Idempotente: non engade nada se as seccións xa existen.
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
if (d.seccions.some((s) => s.id === 'fl-laboratorio')) {
  console.log('FeiraLab xa ten as seccións do laboratorio.');
  process.exit(0);
}

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
    tipo: 'cronoloxia',
    oculta: false,
    fondo: 'claro',
    etiqueta: 'Que investigamos',
    titulo: 'Do consumo de alimentos á cidadanía global.',
    fitos: [
      {
        data: '2025 – 2026',
        titulo: 'Que comemos nos fogares de Pontevedra e que pegada climática deixa?',
        texto:
          'Un estudo de ciencia cidadá sobre os patróns de consumo de alimentos, feito polo alumnado do IES Luís Seoane coa Universidade de Vigo e CIDEL Galicia. O alumnado recolleu enquisas en distintas zonas do concello para estimar as emisións asociadas e presentou os resultados no I Foro de Desenvolvemento Local, onde traballou con persoas do comité cidadán do clima en propostas de acción para Pontevedra. O aprendido serviu de base para deseñar SENDA 2030.',
        estado: 'feito',
      },
      {
        data: '2026 – 2027 · SENDA 2030',
        titulo: 'Como pode a ciencia cidadá contribuír á educación para o desenvolvemento e a cidadanía global?',
        texto:
          'Unha investigación acompaña todo o camiño cara á V Feira: cuestionarios ao alumnado ao comezo e ao final do curso, rexistro das actividades e valoracións do alumnado e do profesorado. O resultado será un informe aberto, con aprendizaxes e recomendacións prácticas para os centros educativos.',
        estado: 'agora',
      },
    ],
  },
];

const i = d.seccions.findIndex((s) => s.tipo === 'heroe');
d.seccions.splice(i + 1, 0, ...novas);
d.descricion = 'A Feira da Sostibilidade como laboratorio: investigación, acción e cidadanía crítica para avanzar fronte aos retos ecosociais.';

const fsql = path.join(RAIZ, 'semente', 'parche-feiralab.sql');
fs.writeFileSync(fsql, `UPDATE documentos SET datos = ${q(JSON.stringify(d))}, actualizado = datetime('now') WHERE coleccion = 'paxinas_libres' AND id = 'feiralab';\n`);
wr(`--file "${fsql}" -y`);
console.log('FeiraLab actualizado.');
