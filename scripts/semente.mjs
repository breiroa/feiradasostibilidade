// Xera semente/semente.sql cos contidos iniciais da web para cargar en D1.
// Uso: node scripts/semente.mjs  (despois: npx wrangler d1 execute feira --local --file semente/semente.sql)
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { micromark } from 'micromark';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CONTIDO = path.join(RAIZ, 'semente', 'contido');
const SAIDA = path.join(RAIZ, 'semente', 'semente.sql');
const BLOQUE = 40_000; // bytes por fila de media_bloques (cada sentenza SQL < 100 KB en hexadecimal)

const sql = [];
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ── Lectura de ficheiros Markdown/YAML ──
function lerMd(ficheiro) {
  const txt = fs.readFileSync(ficheiro, 'utf8');
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return { datos: yaml.load(m[1]), corpo: m[2].trim() ? micromark(m[2].trim()) : '' };
}
const lerCarpeta = (col, ext = '.md') =>
  fs
    .readdirSync(path.join(CONTIDO, col))
    .filter((f) => f.endsWith(ext))
    .map((f) => ({ id: f.replace(/\.(md|ya?ml)$/, ''), ruta: path.join(CONTIDO, col, f) }));

// ── Imaxes → WebP en D1 ──
const mediaFeita = new Map(); // ruta absoluta → id
async function media(ruta, { id, alt = '', etiqueta = 'xeral', logo = false }) {
  const abs = path.resolve(ruta);
  if (mediaFeita.has(abs)) return mediaFeita.get(abs);
  const orixe = sharp(abs).rotate();
  const meta = await orixe.metadata();
  const base = () => (logo ? sharp(abs).trim() : sharp(abs).rotate());
  const g = await base().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: logo ? 90 : 80 }).toBuffer({ resolveWithObject: true });
  const variantes = { g: g.data };
  if (!logo) variantes.m = await base().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  sql.push(
    `INSERT INTO media (id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes) VALUES (${q(id)}, 'image/webp', ${q(path.basename(abs))}, ${q(alt)}, ${q(etiqueta)}, ${g.info.width}, ${g.info.height}, ${g.data.length}, ${q(Object.keys(variantes).join(','))});`,
  );
  for (const [v, buf] of Object.entries(variantes)) {
    for (let n = 0, i = 0; i < buf.length; n++, i += BLOQUE) {
      sql.push(`INSERT INTO media_bloques (media_id, variante, n, datos) VALUES (${q(id)}, '${v}', ${n}, X'${buf.subarray(i, i + BLOQUE).toString('hex')}');`);
    }
  }
  mediaFeita.set(abs, id);
  void meta;
  return id;
}
const idImaxe = (rel) => 'f-' + path.basename(rel).replace(/\.[a-z]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
/** Converte unha ruta relativa do Markdown antigo (../../assets/...) nun id de media */
async function mediaDesde(rel, alt, etiqueta) {
  if (!rel) return undefined;
  const abs = path.resolve(CONTIDO, 'x', rel.replace('../../assets/', '../../../src/assets/'));
  return media(abs, { id: idImaxe(rel), alt, etiqueta });
}

function doc(coleccion, id, datos, orde = 0) {
  sql.push(`INSERT INTO documentos (coleccion, id, datos, orde) VALUES (${q(coleccion)}, ${q(id)}, ${q(JSON.stringify(datos))}, ${orde});`);
}

// ── Limpeza ──
sql.push('DELETE FROM documentos;', 'DELETE FROM media;', 'DELETE FROM media_bloques;');

// ── Logos ──
const LOGOS = path.join(RAIZ, 'orixinais', 'logos');
const logoUvigo = await media(path.join(LOGOS, 'uvigo.webp'), { id: 'logo-uvigo', alt: 'Universidade de Vigo', etiqueta: 'logos', logo: true });
const logoCidel = await media(path.join(LOGOS, 'cidel-galicia.png'), { id: 'logo-cidel-galicia', alt: 'CIDEL Galicia', etiqueta: 'logos', logo: true });
const logoCoop = await media(path.join(LOGOS, 'cooperacion-galega.png'), { id: 'logo-cooperacion-galega', alt: 'Cooperación Galega · Xunta de Galicia', etiqueta: 'logos', logo: true });

// ── Entidades ──
const tipoEntidade = { 'ies-luis-seoane': 'centro', 'universidade-de-vigo': 'institucion', 'cooperacion-galega': 'institucion', 'concello-de-pontevedra': 'institucion', 'cfr-pontevedra': 'institucion' };
const logos = { 'universidade-de-vigo': logoUvigo, 'cidel-galicia': logoCidel, 'cooperacion-galega': logoCoop };
const nomes = { 'universidade-de-vigo': 'Universidade de Vigo', 'cooperacion-galega': 'Cooperación Galega · Xunta de Galicia' };
for (const { id, ruta } of lerCarpeta('entidades', '.yaml')) {
  const e = yaml.load(fs.readFileSync(ruta, 'utf8'));
  const datos = { nome: nomes[id] ?? e.nome, tipo: tipoEntidade[id] ?? 'entidade' };
  if (logos[id]) datos.logo = logos[id];
  if (e.web) datos.web = e.web;
  doc('entidades', id, datos, e.orde ?? 100);
}

// ── Edicións ──
const grupos = {
  2027: [
    { titulo: 'Organiza', entidades: ['ies-luis-seoane'] },
    { titulo: 'Impulsan', entidades: ['cidel-galicia', 'universidade-de-vigo'] },
    { titulo: 'Co apoio de', entidades: ['cooperacion-galega'] },
    { titulo: 'Colaboran', entidades: ['concello-de-pontevedra', 'cfr-pontevedra'] },
  ],
  2026: [
    { titulo: 'Organiza', entidades: ['ies-luis-seoane'] },
    { titulo: 'Impulsan', entidades: ['cidel-galicia', 'universidade-de-vigo'] },
    { titulo: 'Colaboran', entidades: ['oxfam-intermon', 'adega', 'cogami', 'solidariedade-internacional', 'afectados-a57', 'ec4rural', 'cruz-vermella', 'feitoria-verde', 'galicia-ambiental', 'sig-comercio-xusto', 'casa-grande-de-xanceda', 'o-colmenar-de-sara'] },
  ],
  2025: [
    { titulo: 'Organiza', entidades: ['ies-luis-seoane'] },
    { titulo: 'Impulsan', entidades: ['cidel-galicia', 'universidade-de-vigo'] },
  ],
  2024: [
    { titulo: 'Organiza', entidades: ['ies-luis-seoane'] },
    { titulo: 'Impulsan', entidades: ['cidel-galicia', 'universidade-de-vigo'] },
  ],
  2023: [
    { titulo: 'Organiza', entidades: ['ies-luis-seoane'] },
    { titulo: 'Impulsa', entidades: ['cidel-galicia'] },
  ],
};
for (const { id, ruta } of lerCarpeta('edicions')) {
  const { datos: d, corpo } = lerMd(ruta);
  const galeria = [];
  for (const g of d.galeria ?? []) galeria.push({ imaxe: await mediaDesde(g.imaxe, g.alt, 'edicions'), alt: g.alt });
  const ed = {
    numero: d.numero, ano: d.ano, titulo: d.titulo, lema: d.lema, datas: d.datas, lugar: d.lugar, estado: d.estado, resumo: d.resumo,
    corpo,
    portada: await mediaDesde(d.portada, d.portadaAlt, 'edicions'), portadaAlt: d.portadaAlt,
    cifras: d.cifras ?? [], fitos: d.fitos ?? [], programa: d.programa ?? [], centros: d.centros ?? [],
    grupos: grupos[id] ?? [], galeria, videos: d.videos ?? [], documentos: d.documentos ?? [], prensa: d.prensa ?? [],
    proxecto: d.proxecto,
  };
  doc('edicions', id, JSON.parse(JSON.stringify(ed)), 3000 - d.ano);
}

// ── Noticias ──
for (const { id, ruta } of lerCarpeta('noticias')) {
  const { datos: d, corpo } = lerMd(ruta);
  const data = d.data instanceof Date ? d.data.toISOString().slice(0, 10) : String(d.data);
  doc('noticias', id, JSON.parse(JSON.stringify({ titulo: d.titulo, data, resumo: d.resumo, edicion: d.edicion, imaxe: await mediaDesde(d.imaxe, d.imaxeAlt, 'noticias'), imaxeAlt: d.imaxeAlt, corpo, borrador: false })));
}

// ── Recursos ──
for (const { id, ruta } of lerCarpeta('recursos')) {
  const { datos: d, corpo } = lerMd(ruta);
  doc('recursos', id, JSON.parse(JSON.stringify({ ...d, imaxe: await mediaDesde(d.imaxe, d.imaxeAlt, 'recursos'), licenza: d.licenza ?? 'CC BY-SA 4.0', corpo })));
}

// ── Proxectos ──
for (const { id, ruta } of lerCarpeta('proxectos')) {
  const { datos: d, corpo } = lerMd(ruta);
  doc('proxectos', id, { ...d, subtitulo: 'Xeración Eco-Étika', corpo });
}

// ── Páxinas fixas e axustes ──
const paxinas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'semente', 'paxinas.json'), 'utf8'));
for (const [id, datos] of Object.entries(paxinas)) {
  // As imaxes das páxinas indícanse co nome do ficheiro en src/assets/legacy
  for (const [k, v] of Object.entries(datos)) {
    if (typeof v === 'string' && v.startsWith('legacy:')) datos[k] = await mediaDesde(`../../assets/legacy/${v.slice(7)}`, '', 'xeral');
  }
  doc('paxinas', id, datos);
}
doc('axustes', 'xeral', JSON.parse(fs.readFileSync(path.join(RAIZ, 'semente', 'axustes.json'), 'utf8')));

fs.writeFileSync(SAIDA, sql.join('\n') + '\n');
const kb = Math.round(fs.statSync(SAIDA).size / 1024);
console.log(`semente.sql: ${sql.length} sentenzas, ${kb} KB, ${mediaFeita.size} imaxes`);
