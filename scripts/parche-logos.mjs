// Sube os logos oficiais das entidades (orixinais/logos/entidades/<id>.*) e asígnallos.
// Non toca entidades que xa teñan logo. Uso: node scripts/parche-logos.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR = path.join(RAIZ, 'orixinais', 'logos', 'entidades');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const ents = Object.fromEntries(JSON.parse(wr(`--json --command "SELECT id, datos FROM documentos WHERE coleccion='entidades'"`))[0].results.map((r) => [r.id, JSON.parse(r.datos)]));
const nomes = { 'feitoria-verde': 'Feitoría Verde-Lilá' }; // nome actual da cooperativa (o do seu logo)
const sql = [];
let n = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /\.(svg|png|jpe?g|webp)$/i.test(f))) {
  const id = f.replace(/\.[a-z]+$/i, '');
  const e = ents[id];
  if (!e || e.logo) continue;
  const mid = `logo-${id}`;
  const g = await sharp(path.join(DIR, f), { density: 300 }).trim().resize({ width: 800, height: 400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
  sql.push(`DELETE FROM media_bloques WHERE media_id = ${q(mid)};`, `DELETE FROM media WHERE id = ${q(mid)};`);
  sql.push(`INSERT INTO media (id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes) VALUES (${q(mid)}, 'image/webp', ${q(id + '.webp')}, ${q(nomes[id] ?? e.nome)}, 'logos', ${g.info.width}, ${g.info.height}, ${g.data.length}, 'g');`);
  for (let k = 0, i = 0; i < g.data.length; k++, i += 40000) sql.push(`INSERT INTO media_bloques (media_id, variante, n, datos) VALUES (${q(mid)}, 'g', ${k}, X'${g.data.subarray(i, i + 40000).toString('hex')}');`);
  sql.push(`UPDATE documentos SET datos = ${q(JSON.stringify({ ...e, nome: nomes[id] ?? e.nome, logo: mid }))}, actualizado = datetime('now') WHERE coleccion = 'entidades' AND id = ${q(id)};`);
  n++;
  console.log(`${id}: ${g.info.width}×${g.info.height}, ${Math.round(g.data.length / 1024)} KB`);
}
if (!n) {
  console.log('Non hai logos novos que subir.');
  process.exit(0);
}
const fsql = path.join(RAIZ, 'semente', 'parche-logos.sql');
fs.writeFileSync(fsql, sql.join('\n') + '\n');
wr(`--file "${fsql}" -y`);
console.log(`${n} logos subidos.`);
