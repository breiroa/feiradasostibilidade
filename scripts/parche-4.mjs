// Cambios de contido (2026-10-21):
//  - «Feira da Sostibilidade: Senda 2030» na portada e no título para buscadores
//  - FeiraLab: sen a referencia a Monte Porreiro na ciencia cidadá, que pasa a ser a segunda metodoloxía; fóra «Recoñecementos» (xa están no pé)
//  - TIASLab (Post-Growth Innovation Lab) en «Impulsan» no pé, co seu logo
//  - Webs das entidades do ecosistema (os logos ligan sempre á web)
//  - NIF do IES no aviso legal e na privacidade
// Idempotente. Uso: node scripts/parche-4.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const filas = JSON.parse(wr(`--json --command "SELECT coleccion, id, datos, orde FROM documentos"`))[0].results;
const doc = (c, id) => {
  const f = filas.find((x) => x.coleccion === c && x.id === id);
  return f ? JSON.parse(f.datos) : null;
};
const sql = [];
const gardar = (c, id, d) => sql.push(`UPDATE documentos SET datos = ${q(JSON.stringify(d))}, actualizado = datetime('now'), editado_por = 'Revisión de contidos' WHERE coleccion = ${q(c)} AND id = ${q(id)};`);

// Webs oficiais das entidades (comprobadas)
const WEBS = {
  'cfr-pontevedra': 'https://centros.edu.xunta.gal/cfrpontevedra/aulavirtual/',
  adega: 'https://adega.gal/',
  'casa-grande-de-xanceda': 'https://www.casagrandexanceda.com/',
  cogami: 'https://cogami.gal/',
  'concello-de-pontevedra': 'https://www.pontevedra.gal/',
  'cruz-vermella': 'https://www2.cruzroja.es/es/web/cruzvermella',
  ec4rural: 'https://ec4rural.uvigo.gal/',
  'feitoria-verde': 'https://feitoriaverde.com/',
  'galicia-ambiental': 'https://www.galiciaambiental.org/',
  'o-colmenar-de-sara': 'https://elcolmenardesara.com/',
  'oxfam-intermon': 'https://www.oxfamintermon.org/',
  'sig-comercio-xusto': 'https://solidaridadgalicia.org/comercio-xusto/',
  'solidariedade-internacional': 'https://solidaridadgalicia.org/',
  coxapo: 'https://web.coxapo.com/',
  aspanorcel: 'https://asoporcel.es/gl/',
  'fundacion-balms': 'https://fundacionbalms.org/',
  'asociacion-boa-vida': 'https://boavida.org/',
  aquelarre: 'https://www.aquelarrecultural.org/',
  'ecoloxistas-en-accion': 'https://www.ecologistasenaccion.org/federaciones/galiza/',
  // Sen web oficial atopada: afectados-a57 (Salva o Lérez · Stop A-57), sembrando-bioxias
};

// ── Portada ──
const CC_TEXTO = 'Co acompañamento científico da Universidade de Vigo, o alumnado convértese en investigador activo e conecta o local co global.';
const ccSegunda = (p) => p.seccions.filter((s) => s.tipo === 'tarxetas').forEach((s) => {
  const i = s.items.findIndex((x) => x.titulo === 'Investigar con rigor e impacto real');
  if (i < 0) return;
  s.items[i].texto = CC_TEXTO;
  if (i !== 1) s.items.splice(1, 0, ...s.items.splice(i, 1));
});
const ini = doc('paxinas_libres', 'inicio');
const heroe = ini.seccions.find((s) => s.tipo === 'heroe');
heroe.texto = heroe.texto.replace('Dende 2023, a Feira da Sostibilidade converte', 'Dende 2023, a Feira da Sostibilidade: Senda 2030 converte');
ccSegunda(ini);
gardar('paxinas_libres', 'inicio', ini);

// ── FeiraLab ──
const fl = doc('paxinas_libres', 'feiralab');
ccSegunda(fl);
fl.seccions = fl.seccions.filter((s) => !(s.tipo === 'cronoloxia' && s.etiqueta === 'Recoñecementos'));
gardar('paxinas_libres', 'feiralab', fl);

// ── Buscadores: título da portada ──
const ax = doc('axustes', 'xeral');
ax.seo = { ...(ax.seo ?? {}), titulo: 'Feira da Sostibilidade: Senda 2030 · Pensa, consume e actúa' };
gardar('axustes', 'xeral', ax);

// ── TIASLab: entidade, logo e «Impulsan» no pé ──
if (!doc('entidades', 'tiaslab')) {
  const mid = 'logo-tiaslab';
  const g = await sharp(path.join(RAIZ, 'orixinais', 'logos', 'entidades', 'tiaslab.png')).trim().resize({ width: 800, height: 400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
  const nome = 'TIASLab · Post-Growth Innovation Lab (Universidade de Vigo)';
  sql.push(`DELETE FROM media_bloques WHERE media_id = ${q(mid)};`, `DELETE FROM media WHERE id = ${q(mid)};`);
  sql.push(`INSERT INTO media (id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes) VALUES (${q(mid)}, 'image/webp', 'tiaslab.webp', ${q(nome)}, 'logos', ${g.info.width}, ${g.info.height}, ${g.data.length}, 'g');`);
  for (let k = 0, i = 0; i < g.data.length; k++, i += 40000) sql.push(`INSERT INTO media_bloques (media_id, variante, n, datos) VALUES (${q(mid)}, 'g', ${k}, X'${g.data.subarray(i, i + 40000).toString('hex')}');`);
  const orde = Math.max(0, ...filas.filter((f) => f.coleccion === 'entidades').map((f) => f.orde ?? 0)) + 1;
  sql.push(`INSERT INTO documentos (coleccion, id, datos, orde, editado_por) VALUES ('entidades', 'tiaslab', ${q(JSON.stringify({ nome, tipo: 'institucion', logo: mid, web: 'https://tiaslab.uvigo.gal/' }))}, ${orde}, 'Revisión de contidos');`);
  console.log(`TIASLab: logo ${g.info.width}×${g.info.height}`);
}
const est = doc('estrutura', 'xeral');
const impulsan = est.pe.grupos.find((g) => g.titulo === 'Impulsan');
if (impulsan && !impulsan.entidades.includes('tiaslab')) impulsan.entidades.push('tiaslab');
gardar('estrutura', 'xeral', est);

// ── Webs das entidades ──
for (const [id, web] of Object.entries(WEBS)) {
  const e = doc('entidades', id);
  if (e && e.web !== web) gardar('entidades', id, { ...e, web });
}

// ── NIF do IES ──
for (const id of ['aviso-legal', 'privacidade']) {
  const p = doc('paxinas_libres', id);
  p.seccions = p.seccions.map((s) => (s.corpo && !s.corpo.includes('Q8655623J') ? { ...s, corpo: s.corpo.replace('Xunta de Galicia, con enderezo na Rúa Luxemburgo', 'Xunta de Galicia, con NIF Q8655623J e enderezo na Rúa Luxemburgo') } : s));
  if (!p.seccions.some((s) => s.corpo?.includes('Q8655623J'))) console.warn(`OLLO: non se puido engadir o NIF en ${id}`);
  gardar('paxinas_libres', id, p);
}

const fsql = path.join(RAIZ, 'semente', `parche-4-${modo.slice(2)}.sql`);
fs.writeFileSync(fsql, sql.join('\n') + '\n');
wr(`--file "${fsql}" -y`);
console.log(`Feito (${modo.slice(2)}): ${sql.length} operacións.`);
