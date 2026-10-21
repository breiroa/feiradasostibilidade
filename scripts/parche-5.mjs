// Nomes unificados (2026-10-21):
//  - As edicións chámanse sempre «N Feira da Sostibilidade» (a V xa non leva «· SENDA 2030» no título nin na portada)
//  - SENDA 2030 é o nome marco: escríbese igual en todas partes («Feira da Sostibilidade: SENDA 2030»)
//  - As mencións ao proxecto SENDA 2030 (CIDEL Galicia e Universidade de Vigo) quedan como están
// Idempotente. Uso: node scripts/parche-5.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const filas = JSON.parse(wr(`--json --command "SELECT coleccion, id, datos FROM documentos WHERE (coleccion = 'paxinas_libres' AND id IN ('inicio', '2027')) OR coleccion = 'axustes'"`))[0].results;
const doc = (c, id) => JSON.parse(filas.find((f) => f.coleccion === c && f.id === id).datos);
const sql = [];
const gardar = (c, id, d) => sql.push(`UPDATE documentos SET datos = ${q(JSON.stringify(d))}, actualizado = datetime('now'), editado_por = 'Revisión de contidos' WHERE coleccion = ${q(c)} AND id = ${q(id)};`);
const marco = (t) => t.replace(/Feira da Sostibilidade: Senda 2030/g, 'Feira da Sostibilidade: SENDA 2030');

// V edición: título e portada coma as demais
const v = doc('paxinas_libres', '2027');
v.titulo = v.titulo.replace(/\s*·\s*SENDA 2030\s*$/i, '');
for (const s of v.seccions) if (s.tipo === 'heroe' && /^SENDA 2030$/i.test(s.destaque ?? '')) delete s.destaque;
gardar('paxinas_libres', '2027', v);

// Nome marco escrito sempre igual
const ini = doc('paxinas_libres', 'inicio');
for (const s of ini.seccions) if (s.tipo === 'heroe' && s.texto) s.texto = marco(s.texto);
gardar('paxinas_libres', 'inicio', ini);
const ax = doc('axustes', 'xeral');
if (ax.seo?.titulo) ax.seo.titulo = marco(ax.seo.titulo);
gardar('axustes', 'xeral', ax);

const fsql = path.join(RAIZ, 'node_modules', '.cache', `parche-5-${modo.slice(2)}.sql`);
fs.mkdirSync(path.dirname(fsql), { recursive: true });
fs.writeFileSync(fsql, sql.join('\n') + '\n');
wr(`--file "${fsql}" -y`);
console.log(`Feito (${modo.slice(2)}): «${v.titulo}», portada e título para buscadores.`);
