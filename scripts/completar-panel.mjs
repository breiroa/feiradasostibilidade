// Completa no panel o que a web xa mostra «de serie» pero que nunca se gardou, para que o panel amose o que se ve na web:
//  - Valores por defecto dos esquemas que faltan nos documentos (p. ex. o texto da licenza do pé). Só engade; nunca cambia nin borra.
//  - Logo e favicon na biblioteca (PNG, igual cós de serie) e asignados en Identidade visual e Axustes.
//  - Identidade visual gardada coas cores, o nome e a letra actuais.
//  - Imaxe xeral para compartir en redes e descricións que faltan.
// Idempotente. Uso: node scripts/completar-panel.mjs --local | --remote [--probar]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const probar = process.argv.includes('--probar');
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Os esquemas son TypeScript: Node (22.18+) impórtaos directamente
const { esquemas } = await import('../src/lib/esquemas.ts');

const filas = JSON.parse(wr(`--json --command "SELECT coleccion, id, datos FROM documentos"`))[0].results;
const media = new Set(JSON.parse(wr(`--json --command "SELECT id FROM media"`))[0].results.map((m) => m.id));
const docs = new Map(filas.map((f) => [`${f.coleccion}/${f.id}`, JSON.parse(f.datos)]));
const cambiados = new Set();
const sql = [];
const informe = [];

/** Engade a `orixe` as claves que só están en `completo` (recursivo). Devolve as rutas engadidas. */
function engadirFaltan(orixe, completo, ruta = '') {
  const novas = [];
  if (Array.isArray(orixe) && Array.isArray(completo)) {
    orixe.forEach((x, i) => { if (completo[i] !== undefined) novas.push(...engadirFaltan(x, completo[i], `${ruta}.${i}`)); });
  } else if (orixe && completo && typeof orixe === 'object' && typeof completo === 'object') {
    for (const [k, v] of Object.entries(completo)) {
      if (!(k in orixe)) { if (v !== undefined) { orixe[k] = v; novas.push(`${ruta}.${k}`.slice(1)); } }
      else novas.push(...engadirFaltan(orixe[k], v, `${ruta}.${k}`));
    }
  }
  return novas;
}

// ── 1. Valores por defecto ──
for (const [clave, d] of docs) {
  const [col] = clave.split('/');
  if (col === 'paxinas' || !esquemas[col]) continue; // «paxinas» é o formato antigo, só de respaldo
  const r = esquemas[col].safeParse(structuredClone(d));
  if (!r.success) { informe.push(`OLLO ${clave} non valida: ${r.error.issues.map((i) => i.path.join('.')).join(', ')}`); continue; }
  const novas = engadirFaltan(d, r.data);
  if (novas.length) { cambiados.add(clave); informe.push(`${clave}: ${novas.length} valores (${novas.slice(0, 6).join(', ')}${novas.length > 6 ? '…' : ''})`); }
}

// ── 2. Logo e favicon na biblioteca ──
async function subir(id, ficheiro, alt, miniatura) {
  if (media.has(id)) return;
  const orixinal = fs.readFileSync(path.join(RAIZ, 'public', ficheiro));
  const meta = await sharp(orixinal).metadata();
  const variantes = [['g', orixinal]];
  if (miniatura) variantes.push(['m', await sharp(orixinal).resize({ width: miniatura }).png({ compressionLevel: 9 }).toBuffer()]);
  sql.push(`INSERT INTO media (id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes) VALUES (${q(id)}, 'image/png', ${q(ficheiro)}, ${q(alt)}, 'logos', ${meta.width}, ${meta.height}, ${orixinal.length}, ${q(variantes.map((v) => v[0]).join(','))});`);
  for (const [v, buf] of variantes) for (let k = 0, i = 0; i < buf.length; k++, i += 40000) sql.push(`INSERT INTO media_bloques (media_id, variante, n, datos) VALUES (${q(id)}, ${q(v)}, ${k}, X'${buf.subarray(i, i + 40000).toString('hex')}');`);
  informe.push(`biblioteca: ${id} (${meta.width}×${meta.height})`);
}
await subir('logo-feira-da-sostibilidade', 'logo-feira.png', 'Logo da Feira da Sostibilidade', 200);
await subir('favicon-feira', 'favicon.png', 'Icona da web da Feira da Sostibilidade', 0);

// ── 3. Identidade visual ──
const SERIE = { principal: '#3c783c', secundaria: '#64508c', escura: '#1a1428', realce: '#8fb88f', crema: '#f7f4ee', fondo: '#f5f4f7' };
let ident = docs.get('identidade/xeral');
const identNova = !ident;
ident ??= {};
const antesIdent = JSON.stringify(ident);
ident.cores = { ...SERIE, ...(ident.cores ?? {}) };
ident.logo ??= 'logo-feira-da-sostibilidade';
ident.nomeAntes ??= 'Feira da';
ident.nomeDestacado ??= 'Sostibilidade';
ident.titulos ??= 'playfair';
if (JSON.stringify(ident) !== antesIdent) {
  informe.push('identidade/xeral: logo, nome, cores e letra');
  if (identNova) sql.push(`INSERT INTO documentos (coleccion, id, datos, editado_por) VALUES ('identidade', 'xeral', ${q(JSON.stringify(ident))}, 'Configuración inicial');`);
  else { docs.set('identidade/xeral', ident); cambiados.add('identidade/xeral'); }
}

// ── 4. Axustes: favicon e imaxe para compartir ──
const ax = docs.get('axustes/xeral');
if (!ax.favicon) { ax.favicon = 'favicon-feira'; cambiados.add('axustes/xeral'); informe.push('axustes: favicon'); }
if (!ax.seo?.imaxe && media.has('f-multitude-corredor')) { ax.seo = { ...(ax.seo ?? {}), imaxe: 'f-multitude-corredor' }; cambiados.add('axustes/xeral'); informe.push('axustes: imaxe para compartir'); }

// ── 5. Descricións que faltan (as que usan os buscadores) ──
const DESC = {
  inicio: null, // a da web (Axustes)
  'aviso-legal': 'Titularidade, condicións de uso e propiedade intelectual da web da Feira da Sostibilidade do IES Luís Seoane.',
  accesibilidade: 'Declaración de accesibilidade da web da Feira da Sostibilidade: situación de cumprimento, contido non accesible e como comunicarnos problemas.',
};
for (const [id, texto] of Object.entries(DESC)) {
  const p = docs.get(`paxinas_libres/${id}`);
  if (p && !p.descricion) { p.descricion = texto ?? ax.descricion; cambiados.add(`paxinas_libres/${id}`); informe.push(`paxinas_libres/${id}: descrición`); }
}

// ── Gardar ──
for (const clave of cambiados) {
  const [col, id] = clave.split('/');
  sql.push(`UPDATE documentos SET datos = ${q(JSON.stringify(docs.get(clave)))}, actualizado = datetime('now') WHERE coleccion = ${q(col)} AND id = ${q(id)};`);
}
console.log(informe.join('\n'));
if (probar) { console.log(`\n(proba: ${sql.length} operacións sen aplicar)`); process.exit(0); }
if (!sql.length) { console.log('Nada que completar.'); process.exit(0); }
const fsql = path.join(RAIZ, 'node_modules', '.cache', `completar-panel-${modo.slice(2)}.sql`);
fs.writeFileSync(fsql, sql.join('\n') + '\n');
wr(`--file "${fsql}" -y`);
console.log(`\nFeito (${modo.slice(2)}): ${sql.length} operacións.`);
