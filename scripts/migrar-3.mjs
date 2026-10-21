// 3ª volta da estrutura de contidos (pedida o 2026-10-21):
//  1. As edicións pasan a ser páxinas (subpáxinas de «Edicións», id = ano) cun bloque «edicion».
//     A portada e a presentación automáticas convértense en seccións normais (editables).
//  2. Fóra os proxectos (o seu contido xa está nas páxinas).
//  3. Menús (colección «menus»): principal (cos anos das edicións escritos a man) e legais.
//  4. Cabeceira e pé (colección «estrutura»), que saen de Axustes. CFR de Pontevedra no grupo de quen apoia.
//  5. Axustes: contactos flexibles, SEO, tipos de recurso.
//  6. Modelos de serie gardados como documentos editables.
//  7. Ecosistema: nomes segundo os logos novos. CFR tamén como apoio na IV Feira.
// Idempotente e con copia previa en copias/. Uso: node scripts/migrar-3.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const romanos = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const filas = JSON.parse(wr('--json --command "SELECT coleccion, id, datos, orde, actualizado FROM documentos"'))[0].results;
const copia = path.join(RAIZ, 'copias', `documentos-antes-migrar3-${modo.slice(2)}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.json`);
fs.mkdirSync(path.dirname(copia), { recursive: true });
fs.writeFileSync(copia, JSON.stringify(filas, null, 1));

const docs = filas.map((r) => ({ ...r, datos: JSON.parse(r.datos) }));
const atopar = (c, id) => docs.find((d) => d.coleccion === c && d.id === id)?.datos;
const de = (c) => docs.filter((d) => d.coleccion === c);
const sql = [];
const gardar = (c, id, datos, orde = 100) =>
  sql.push(`INSERT INTO documentos (coleccion, id, datos, orde, editado_por) VALUES (${q(c)}, ${q(id)}, ${q(JSON.stringify(datos))}, ${orde}, 'Migración') ON CONFLICT(coleccion, id) DO UPDATE SET datos = excluded.datos, actualizado = datetime('now'), editado_por = 'Migración';`);
const borrar = (c, id) => sql.push(`DELETE FROM documentos WHERE coleccion = ${q(c)} AND id = ${q(id)};`);
const log = (...a) => console.log(...a);

// ── 1. Edicións → páxinas ──
const edicions = de('edicions').sort((a, b) => b.datos.ano - a.datos.ano);
for (const { id, datos: e } of edicions) {
  if (atopar('paxinas_libres', id)) { log(`edición ${id}: xa é páxina`); borrar('edicions', id); continue; }
  const [titulo, ...resto] = e.titulo.split(' · ');
  const botons = e.estado === 'proxima'
    ? [...(e.proxecto ? [{ texto: 'O camiño ata a Feira', url: '#senda-2030', estilo: 'principal' }] : []), { texto: 'Participa na Feira', url: '/participa/', estilo: e.proxecto ? 'secundario' : 'principal' }]
    : [];
  const portada = {
    id: 'portada', tipo: 'heroe', oculta: false, fondo: 'escuro',
    etiqueta: `${romanos[e.numero] ?? e.numero} edición · ${e.datas}`, titulo, destaque: resto.join(' · ') || e.lema || undefined,
    texto: e.lugar, imaxe: e.portada, imaxeAlt: e.portadaAlt, botons, cifras: [],
  };
  const presentacion = {
    id: 'presentacion', tipo: 'presentacion', oculta: false, fondo: 'branco', etiqueta: 'A edición',
    lema: resto.length ? e.lema : undefined, texto: e.resumo, chips: e.fitos ?? [], cifras: e.cifras ?? [],
  };
  const seccions = (e.seccions ?? []).map((s) => {
    // CFR de Pontevedra tamén apoia a IV Feira (ao mesmo nivel ca quen financia)
    if (id === '2026' && s.tipo === 'logos' && !s.grupos.some((g) => g.entidades.includes('cfr-pontevedra'))) {
      const i = s.grupos.findIndex((g) => /impulsa/i.test(g.titulo));
      s.grupos.splice(i + 1, 0, { titulo: 'Co apoio de', entidades: ['cfr-pontevedra'] });
    }
    return s;
  });
  const paxina = {
    titulo: e.titulo, descricion: e.resumo, nai: 'edicions', imaxe: e.portada, imaxeAlt: e.portadaAlt, borrador: false,
    edicion: { numero: e.numero, ano: e.ano, datas: e.datas, lugar: e.lugar, estado: e.estado, lema: e.lema, cifras: e.cifras ?? [], fitos: e.fitos ?? [] },
    seccions: [portada, presentacion, ...seccions],
  };
  gardar('paxinas_libres', id, paxina, 3000 - e.ano);
  borrar('edicions', id);
  log(`edición ${id}: pasa a páxina /edicions/${id}/`);
}

// ── 2. Proxectos fóra (están na copia) ──
for (const { id } of de('proxectos')) { borrar('proxectos', id); log(`proxecto ${id}: retirado`); }

// ── 3. Menús ──
const anos = [...edicions.map((e) => ({ id: e.id, ano: e.datos.ano })), ...de('paxinas_libres').filter((p) => p.datos.edicion).map((p) => ({ id: p.id, ano: p.datos.edicion.ano }))]
  .filter((x, i, l) => l.findIndex((y) => y.id === x.id) === i)
  .sort((a, b) => b.ano - a.ano);
const pax = (paxina, extra = {}) => ({ tipo: 'paxina', paxina, fillos: [], auto: false, ...extra });
if (!atopar('menus', 'principal')) {
  gardar('menus', 'principal', {
    nome: 'Menú principal',
    items: [pax('inicio'), pax('feiralab'), pax('edicions', { fillos: anos.map((a) => ({ tipo: 'paxina', paxina: a.id, texto: String(a.ano) })) }), pax('actualidade'), pax('recursos'), pax('participa')],
  }, 1);
  log('menú principal creado');
}
if (!atopar('menus', 'legais')) {
  gardar('menus', 'legais', { nome: 'Ligazóns legais', items: [['aviso-legal', 'Aviso legal'], ['privacidade', 'Privacidade'], ['cookies', 'Cookies'], ['accesibilidade', 'Accesibilidade']].map(([p, texto]) => ({ tipo: 'paxina', paxina: p, texto, fillos: [], auto: false })) }, 2);
  log('menú legal creado');
}
for (const { id } of de('navegacion')) borrar('navegacion', id);

// ── 4. Cabeceira e pé ──
const ax = atopar('axustes', 'xeral') ?? {};
if (!atopar('estrutura', 'xeral')) {
  const peVello = ax.pe ?? { texto: '', grupos: [], premios: [] };
  // Quen apoia economicamente (Cooperación Galega e CFR de Pontevedra) vai no mesmo grupo
  const grupos = [];
  for (const g of peVello.grupos ?? []) {
    if (/colabora/i.test(g.titulo) && g.entidades.includes('cfr-pontevedra')) continue;
    if (/apoio/i.test(g.titulo)) grupos.push({ titulo: g.titulo, entidades: [...new Set([...g.entidades, 'cfr-pontevedra'])] });
    else grupos.push(g);
  }
  gardar('estrutura', 'xeral', {
    cabeceira: { menu: 'principal', boton: {} },
    pe: { texto: peVello.texto ?? '', grupos, premios: peVello.premios ?? [], menu: 'principal', tituloMenu: 'Navegación', menuLegal: 'legais', tituloContactos: 'Síguenos' },
  }, 1);
  log('cabeceira e pé creados (CFR en «Co apoio de»)');
}

// ── 5. Axustes ──
if (ax.nome && !ax.contactos) {
  const contactos = [];
  if (ax.instagram) contactos.push({ tipo: 'instagram', etiqueta: ax.instagramUsuario ? `Instagram ${ax.instagramUsuario}` : 'Instagram', valor: ax.instagram });
  if (ax.correo) contactos.push({ tipo: 'correo', valor: ax.correo });
  if (ax.webIes) contactos.push({ tipo: 'web', etiqueta: 'Web do IES Luís Seoane', valor: ax.webIes });
  const { instagram, instagramUsuario, correo, webIes, pe, ...resto } = ax;
  gardar('axustes', 'xeral', {
    ...resto, contactos, seo: { indexar: true, idioma: 'gl' },
    tiposRecurso: [
      { id: 'xogo', nome: 'Xogo educativo' }, { id: 'podcast', nome: 'Podcast' }, { id: 'estudo', nome: 'Estudo e investigación' },
      { id: 'guia', nome: 'Guía' }, { id: 'audiovisual', nome: 'Audiovisual' }, { id: 'obradoiro', nome: 'Obradoiro' }, { id: 'outro', nome: 'Outro' },
    ],
  }, 1);
  log('axustes: contactos, SEO e tipos de recurso');
}

// ── 6. Modelos de serie (editables) ──
const s = (tipo, extra = {}) => ({ id: tipo, tipo, oculta: false, fondo: 'claro', ...extra });
const deSerie = {
  'serie-texto': { tipo: 'paxina', nome: 'Páxina de texto', desc: 'Cabeceira sinxela e un bloque de texto', seccions: [s('texto', { fondo: 'branco', corpo: '<p>Escribe aquí o texto da páxina.</p>', estreito: true })] },
  'serie-presentacion': { tipo: 'paxina', nome: 'Presentación con portada', desc: 'Foto grande, texto e imaxe, tarxetas e chamada', seccions: [
    s('heroe', { fondo: 'escuro', titulo: 'Título da páxina.', destaque: 'Unha frase destacada.', texto: 'Unha ou dúas frases de presentación.', botons: [], cifras: [] }),
    s('texto_imaxe', { fondo: 'branco', etiqueta: 'Que é', titulo: 'Explica a idea principal.', corpo: '<p>Texto da presentación.</p>', posicion: 'dereita', botons: [] }),
    s('tarxetas', { fondo: 'claro', etiqueta: 'Como', titulo: 'Tres puntos clave.', columnas: 3, numerar: true, items: [{ titulo: 'Primeiro' }, { titulo: 'Segundo' }, { titulo: 'Terceiro' }] }),
    s('chamada', { fondo: 'morado', titulo: 'Queres participar?', texto: 'Escríbenos e contámosche.', botons: [{ texto: 'Participa', url: '/participa/', estilo: 'principal' }] }),
  ] },
  'serie-proxecto': { tipo: 'paxina', nome: 'Proxecto', desc: 'Portada, presentación, cronoloxía, galería e chamada', seccions: [
    s('heroe', { fondo: 'escuro', titulo: 'Nome do proxecto.', destaque: 'O lema.', texto: 'Curso 2026–2027', botons: [], cifras: [] }),
    s('texto_imaxe', { fondo: 'branco', etiqueta: 'O proxecto', titulo: 'De que trata.', corpo: '<p>Obxectivos e contexto.</p>', posicion: 'dereita', botons: [] }),
    s('cronoloxia', { fondo: 'claro', etiqueta: 'Paso a paso', titulo: 'O camiño.', fitos: [{ data: 'Outono', titulo: 'Primeiro paso', estado: 'feito' }, { data: 'Inverno', titulo: 'Segundo paso', estado: 'agora' }, { data: 'Primavera', titulo: 'Na Feira', estado: 'proximo' }] }),
    s('galeria', { fondo: 'branco', etiqueta: 'Imaxes', titulo: 'Así vai.', modo: 'carrusel', imaxes: [] }),
    s('chamada', { fondo: 'morado', titulo: 'Queres sumarte?', botons: [{ texto: 'Participa', url: '/participa/', estilo: 'principal' }] }),
  ] },
  'serie-edicion': { tipo: 'paxina', nome: 'Edición da Feira', desc: 'Portada, presentación, programa, galería, logos e noticias', seccions: [
    s('heroe', { fondo: 'escuro', etiqueta: 'Edición · datas', titulo: 'Feira da Sostibilidade', destaque: 'Lema', texto: 'IES Luís Seoane · Monte Porreiro, Pontevedra', botons: [{ texto: 'Participa na Feira', url: '/participa/', estilo: 'principal' }], cifras: [] }),
    s('presentacion', { fondo: 'branco', etiqueta: 'A edición', texto: 'Resumo da edición.', chips: [], cifras: [] }),
    s('programa', { fondo: 'branco', etiqueta: 'Programa', titulo: 'Tres días de Feira.', dias: [] }),
    s('galeria', { fondo: 'claro', etiqueta: 'Galería', titulo: 'Imaxes da edición.', modo: 'carrusel', imaxes: [] }),
    s('logos', { fondo: 'verde', etiqueta: 'Quen participa', titulo: 'Centros e entidades.', grupos: [{ titulo: 'Organiza', entidades: ['ies-luis-seoane'] }, { titulo: 'Impulsan', entidades: ['cidel-galicia', 'universidade-de-vigo'] }] }),
    s('noticias', { fondo: 'branco', etiqueta: 'Actualidade', titulo: 'Noticias desta edición.', numero: 3 }),
  ] },
  'serie-faq': { tipo: 'paxina', nome: 'Preguntas frecuentes', desc: 'Cabeceira e acordeón de preguntas', seccions: [
    s('acordeon', { fondo: 'branco', etiqueta: 'Dúbidas', titulo: 'Preguntas frecuentes.', items: [{ pregunta: 'Primeira pregunta?', corpo: '<p>Resposta.</p>' }, { pregunta: 'Segunda pregunta?', corpo: '<p>Resposta.</p>' }] }),
  ] },
};
let o = 1;
for (const [id, m] of Object.entries(deSerie)) if (!atopar('modelos', id)) { gardar('modelos', id, m, o++); log(`modelo ${id}`); }
for (const { id, datos: m } of de('modelos')) if (m.tipo === 'seccion') gardar('modelos', id, { tipo: 'seccions', nome: m.nome, desc: m.desc, seccions: [m.seccion] });

// ── 7. Ecosistema: nomes como nos logos ──
const nomes = { aspanorcel: 'Asoporcel', 'afectados-a57': 'Salva o Lérez · Stop A-57', 'o-colmenar-de-sara': 'El Colmenar de Sara' };
for (const [id, nome] of Object.entries(nomes)) {
  const e = atopar('entidades', id);
  if (e && e.nome !== nome) { gardar('entidades', id, { ...e, nome }); log(`entidade ${id}: ${nome}`); }
}

if (!sql.length) { log('Nada que cambiar.'); process.exit(0); }
const fsql = path.join(RAIZ, 'semente', `migrar-3-${modo.slice(2)}.sql`);
fs.writeFileSync(fsql, sql.join('\n') + '\n');
wr(`--file "${fsql}" -y`);
log(`Feito (${sql.length} cambios). Copia previa en ${path.relative(RAIZ, copia)}`);
