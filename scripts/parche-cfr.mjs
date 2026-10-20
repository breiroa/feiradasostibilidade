// Engade o logo do CFR (rehecho en vectorial) como entidade e ponno no pé (grupo «Colabora»).
// Uso: node scripts/parche-cfr.mjs --local | --remote   (idempotente)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const ID = 'cfr-a-coruna';
const LOGO = 'logo-cfr-a-coruna';
const existe = JSON.parse(wr(`--json --command "SELECT COUNT(*) n FROM documentos WHERE coleccion='entidades' AND id='${ID}'"`))[0].results[0].n;
if (existe) {
  console.log('O CFR xa estaba engadido.');
  process.exit(0);
}

const sql = [];
const g = await sharp(path.join(RAIZ, 'orixinais/logos/cfr-a-coruna.png')).trim().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
sql.push(`DELETE FROM media WHERE id = ${q(LOGO)};`, `DELETE FROM media_bloques WHERE media_id = ${q(LOGO)};`);
sql.push(`INSERT INTO media (id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes) VALUES (${q(LOGO)}, 'image/webp', 'cfr-a-coruna.webp', 'Xunta de Galicia · Centro de Formación e Recursos da Coruña', 'logos', ${g.info.width}, ${g.info.height}, ${g.data.length}, 'g');`);
sql.push(`INSERT INTO media_bloques (media_id, variante, n, datos) VALUES (${q(LOGO)}, 'g', 0, X'${g.data.toString('hex')}');`);
sql.push(`INSERT INTO documentos (coleccion, id, datos, orde) VALUES ('entidades', ${q(ID)}, ${q(JSON.stringify({ nome: 'CFR da Coruña · Xunta de Galicia', tipo: 'institucion', logo: LOGO }))}, 3);`);

const ax = JSON.parse(JSON.parse(wr(`--json --command "SELECT datos FROM documentos WHERE coleccion='axustes' AND id='xeral'"`))[0].results[0].datos);
ax.pe ??= { texto: '', grupos: [], premios: [] };
if (!ax.pe.grupos.some((gr) => gr.entidades?.includes(ID))) ax.pe.grupos.push({ titulo: 'Colabora', entidades: [ID] });
sql.push(`UPDATE documentos SET datos = ${q(JSON.stringify(ax))}, actualizado = datetime('now') WHERE coleccion = 'axustes' AND id = 'xeral';`);

const f = path.join(RAIZ, 'semente', 'parche-cfr.sql');
fs.writeFileSync(f, sql.join('\n') + '\n');
wr(`--file "${f}" -y`);
console.log(`CFR engadido (logo ${g.info.width}×${g.info.height}, ${Math.round(g.data.length / 1024)} KB).`);
