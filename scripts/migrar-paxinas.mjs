// Pasa as páxinas fixas (Inicio, Participa, Actualidade, Recursos, Edicións) a páxinas construídas con seccións
// (colección paxinas_libres), para que se editen todas igual desde «Páxinas» no panel.
//  - Inicio: as seccións actuais de paxinas/inicio
//  - Participa: os textos actuais de paxinas/participa → cabeceira + tarxetas de perfís + sección de formulario
//  - Actualidade, Recursos, Edicións: cabeceira cos textos de sempre + sección de listado
// Idempotente: non toca as páxinas que xa existan. Garda antes unha copia en copias/.
// Uso: node scripts/migrar-paxinas.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const porDefecto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/paxinas-sistema.json'), 'utf8'));

const filas = JSON.parse(wr(`--json --command "SELECT coleccion, id, datos, orde, actualizado FROM documentos WHERE coleccion IN ('paxinas', 'paxinas_libres')"`))[0].results;
const copia = path.join(RAIZ, 'copias', `paxinas-antes-migrar-${modo.slice(2)}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.json`);
fs.mkdirSync(path.dirname(copia), { recursive: true });
fs.writeFileSync(copia, JSON.stringify(filas, null, 1));

const doc = (c, id) => {
  const f = filas.find((r) => r.coleccion === c && r.id === id);
  return f ? JSON.parse(f.datos) : null;
};
const tipoDe = (id) => (id === 'empresa' ? 'entidade' : id);

const novas = {};
const inicio = doc('paxinas', 'inicio');
novas.inicio = { ...porDefecto.inicio, seccions: inicio?.seccions ?? [] };

const pa = doc('paxinas', 'participa');
novas.participa = structuredClone(porDefecto.participa);
if (pa) {
  const cab = novas.participa.cabeceira;
  Object.assign(cab, { titulo: pa.heroTitulo ?? cab.titulo, destaque: pa.heroDestaque ?? cab.destaque, texto: pa.heroTexto ?? cab.texto, datas: pa.datas ?? cab.datas });
  const [perfis, form] = novas.participa.seccions;
  if (pa.perfis?.length) perfis.items = pa.perfis.map((p) => ({ titulo: p.titulo, texto: p.texto, url: `/participa/?tipo=${tipoDe(p.id)}#formulario`, boton: p.boton ?? 'Escríbenos' }));
  Object.assign(form, { titulo: pa.formularioTitulo ?? form.titulo, texto: pa.formularioTexto ?? form.texto, graciasTitulo: pa.graciasTitulo ?? form.graciasTitulo, graciasTexto: pa.graciasTexto ?? form.graciasTexto });
}
for (const id of ['actualidade', 'recursos', 'edicions']) novas[id] = porDefecto[id];

const sql = [];
let orde = 0;
for (const [id, datos] of Object.entries(novas)) {
  orde++;
  if (doc('paxinas_libres', id)) {
    console.log(`${id}: xa existe, non se toca.`);
    continue;
  }
  sql.push(`INSERT INTO documentos (coleccion, id, datos, orde) VALUES ('paxinas_libres', ${q(id)}, ${q(JSON.stringify(datos))}, ${-10 + orde});`);
  console.log(`${id}: creada.`);
}
if (!sql.length) process.exit(0);
const fsql = path.join(RAIZ, 'semente', 'migrar-paxinas.sql');
fs.writeFileSync(fsql, sql.join('\n') + '\n');
wr(`--file "${fsql}" -y`);
console.log(`Feito. Copia previa en ${path.relative(RAIZ, copia)}`);
