// Terceira volta de contidos (pedida polo usuario o 2026-10-20):
//  - logos do IES Luís Seoane e do CFR de Pontevedra (substitúe ao da Coruña)
//  - edición 2027 simplificada: cronoloxía como eixo, «Que haberá na Feira» con imaxes, sen códigos A1.x nin cifras da solicitude
//  - edición 2026 con datas, centros e prensa verificados (Diario de Pontevedra, Pontevedra Viva) e entidades citadas na prensa
//  - páxinas legais co IES Luís Seoane como responsable; Participa máis sinxela; datas reais das noticias da IV Feira
// Uso: node scripts/parche-3.mjs --local | --remote   (non pisa contidos editados no panel)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const docs = JSON.parse(wr('--json --command "SELECT coleccion, id, datos, orde FROM documentos"'))[0].results.map((d) => ({ ...d, datos: JSON.parse(d.datos) }));
const atopar = (c, id) => docs.find((d) => d.coleccion === c && d.id === id)?.datos;
const sql = [];
const gardar = (c, id, datos, orde = 100) =>
  sql.push(`INSERT INTO documentos (coleccion, id, datos, orde) VALUES (${q(c)}, ${q(id)}, ${q(JSON.stringify(datos))}, ${orde}) ON CONFLICT(coleccion, id) DO UPDATE SET datos = excluded.datos, actualizado = datetime('now');`);
const avisos = [];

// ───── Logos ─────
async function logo(ficheiro, id, alt) {
  const g = await sharp(path.join(RAIZ, 'orixinais/logos', ficheiro)).trim().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
  sql.push(`DELETE FROM media_bloques WHERE media_id = ${q(id)};`, `DELETE FROM media WHERE id = ${q(id)};`);
  sql.push(`INSERT INTO media (id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes) VALUES (${q(id)}, 'image/webp', ${q(ficheiro.replace('.png', '.webp'))}, ${q(alt)}, 'logos', ${g.info.width}, ${g.info.height}, ${g.data.length}, 'g');`);
  for (let n = 0, i = 0; i < g.data.length; n++, i += 40000) sql.push(`INSERT INTO media_bloques (media_id, variante, n, datos) VALUES (${q(id)}, 'g', ${n}, X'${g.data.subarray(i, i + 40000).toString('hex')}');`);
}
await logo('ies-luis-seoane.png', 'logo-ies-luis-seoane', 'IES Luís Seoane');
await logo('cfr-pontevedra.png', 'logo-cfr-pontevedra', 'Xunta de Galicia · Centro de Formación e Recursos de Pontevedra');
const ies = atopar('entidades', 'ies-luis-seoane');
if (ies) gardar('entidades', 'ies-luis-seoane', { ...ies, logo: 'logo-ies-luis-seoane' }, 1);
gardar('entidades', 'cfr-pontevedra', { ...(atopar('entidades', 'cfr-pontevedra') ?? {}), nome: 'CFR de Pontevedra · Xunta de Galicia', tipo: 'institucion', logo: 'logo-cfr-pontevedra' }, 2);

// Entidades citadas na prensa da IV Feira (Diario de Pontevedra, 29/04/2026)
const novas = { coxapo: 'Coxapo', aspanorcel: 'Aspanorcel', 'fundacion-balms': 'Fundación Balms para a infancia', 'asociacion-boa-vida': 'Asociación Boa Vida', aquelarre: 'Aquelarre', 'ecoloxistas-en-accion': 'Ecoloxistas en Acción', 'sembrando-bioxias': 'Sembrando Bioxías' };
let orde = 30;
for (const [id, nome] of Object.entries(novas)) if (!atopar('entidades', id)) gardar('entidades', id, { nome, tipo: 'entidade' }, orde++);

// CFR da Coruña → Pontevedra (no pé e en calquera grupo)
const cambiarCfr = (lista) => (Array.isArray(lista) ? [...new Set(lista.map((x) => (x === 'cfr-a-coruna' ? 'cfr-pontevedra' : x)))] : lista);
const ax = atopar('axustes', 'xeral');
if (ax) {
  ax.pe.grupos = ax.pe.grupos.map((g) => ({ ...g, entidades: cambiarCfr(g.entidades) }));
  gardar('axustes', 'xeral', ax, 0);
}
sql.push("DELETE FROM documentos WHERE coleccion = 'entidades' AND id = 'cfr-a-coruna';", "DELETE FROM media_bloques WHERE media_id = 'logo-cfr-a-coruna';", "DELETE FROM media WHERE id = 'logo-cfr-a-coruna';");

const sec = (tipo, campos) => ({ id: Math.random().toString(36).slice(2, 10), tipo, oculta: false, fondo: 'claro', ...campos });

// ───── Edición 2027 ─────
const e27 = atopar('edicions', '2027');
if (e27 && e27.seccions?.some((s) => s.tipo === 'actividades' && s.titulo === 'Paso a paso cara á Feira.')) {
  const crono = e27.seccions.find((s) => s.tipo === 'cronoloxia');
  const naFeira = e27.seccions.find((s) => s.tipo === 'tarxetas');
  const fotos = ['f-stand-alumnas', 'f-alumnado-presenta-investigacion', 'f-charla-auditorio', 'f-exposicion-carteis', 'f-xogo-inclusivo'];
  const altFotos = ['Alumnas explicando o seu stand', 'Alumnado presentando unha investigación', 'Charla no salón de actos', 'Exposición de carteis no corredor', 'Crianzas xogando a un xogo inclusivo'];
  e27.resumo = 'O punto de encontro de SENDA 2030: un curso de investigación, diálogo entre territorios e acción protagonizada polo alumnado, que se mostra en abril no IES Luís Seoane.';
  e27.cifras = [];
  e27.seccions = [
    { ...crono, ancla: 'senda-2030', fondo: 'branco', etiqueta: 'SENDA 2030 · O camiño ata a Feira', titulo: 'Investigar, contrastar, actuar.',
      texto: 'SENDA 2030. Xeración Eco-Étika é o proxecto de CIDEL Galicia e a Universidade de Vigo, co IES Luís Seoane, que une ciencia cidadá, práctica docente e participación xuvenil durante todo o curso. Así é o camiño:' },
    { ...naFeira, columnas: 3, etiqueta: 'Na Feira', titulo: 'Que haberá na V Feira.', items: (naFeira?.items ?? []).map((it, n) => ({ ...it, imaxe: fotos[n % fotos.length], imaxeAlt: altFotos[n % fotos.length] })) },
    sec('logos', { fondo: 'verde', etiqueta: 'Quen o fai posible', titulo: 'Organiza, impulsan e apoian.', texto: 'SENDA 2030 está financiado pola Xunta de Galicia a través da Cooperación Galega.',
      grupos: [{ titulo: 'Organiza', entidades: ['ies-luis-seoane'] }, { titulo: 'Impulsan', entidades: ['cidel-galicia', 'universidade-de-vigo'] }, { titulo: 'Co apoio de', entidades: ['cooperacion-galega', 'cfr-pontevedra'] }] }),
    sec('noticias', { fondo: 'branco', etiqueta: 'Actualidade', titulo: 'Noticias do camiño.', edicion: '2027', numero: 6 }),
    sec('chamada', { fondo: 'morado', titulo: 'Queres participar nesta edición?', texto: 'Centros educativos, entidades, empresas e medios: escríbenos e contámosche como.', botons: [{ texto: 'Participa', url: '/participa/', estilo: 'principal' }] }),
  ];
  gardar('edicions', '2027', e27, 973);
} else avisos.push('Edición 2027: xa fora editada no panel, non se tocou.');

// Sen cifras nin colaboracións que aínda non están confirmadas (veñen da solicitude, non da realidade)
const e27b = e27 ?? atopar('edicions', '2027');
if (e27b) {
  const antes = JSON.stringify(e27b.seccions);
  const limpar = (t) => t?.replace('Os 10 microproxectos', 'Os microproxectos').replace('Os 6 centros rurais', 'Os centros rurais').replace(', en colaboración co Concello de Pontevedra', '');
  e27b.seccions = e27b.seccions.map((s) => (s.tipo === 'tarxetas' ? { ...s, items: s.items.map((it) => ({ ...it, texto: limpar(it.texto) })) } : s));
  if (JSON.stringify(e27b.seccions) !== antes) gardar('edicions', '2027', e27b, 973);
}

// ───── Edición 2026 (datos verificados na prensa) ─────
const e26 = atopar('edicions', '2026');
if (e26 && e26.datas === 'Abril de 2026') {
  e26.datas = '28, 29 e 30 de abril de 2026';
  e26.cifras = (e26.cifras ?? []).filter((c) => !/^13$/.test(c.valor));
  e26.cifras.splice(2, 0, { valor: '14', etiqueta: 'centros educativos de Galicia, España, Romanía e Italia' });
  const centros = ['IES Luís Seoane', 'EEI Fina Casalderrey', 'CEP Marcos da Portela', 'IES de Poio', 'IES Valle-Inclán', 'IES Val do Asma', 'IES do Barral', 'IES Plurilingüe Rafael Dieste', 'CIFP A Xunqueira', 'IES Alexandre Bóveda', 'IES Monte Miravete (Murcia)', 'IES Alfonso VIII (Cuenca)', 'Colegiul Economic Regele Mihai I (Romanía)', 'ITCT A. Fossati–M. Da Passano (Italia)'];
  e26.seccions = e26.seccions.map((s) => {
    if (s.tipo === 'lista') return { ...s, titulo: 'Centros educativos', items: centros };
    if (s.tipo === 'logos') return { ...s, grupos: s.grupos.map((g) => (g.titulo === 'Colaboran' ? { ...g, entidades: [...new Set([...g.entidades, ...Object.keys(novas), 'cfr-pontevedra'])] } : g)) };
    if (s.tipo === 'documentos' && s.etiqueta === 'Na prensa') return { ...s, items: [
      { titulo: 'El IES Luís Seoane implica a más de 30 entidades y centros en la IV Feira da Sustentabilidade', detalle: 'Diario de Pontevedra · 29/04/2026', url: 'https://www.diariodepontevedra.es/articulo/pontevedra/ies-luis-seoane-implica-mas-30-entidades-centros-iv-feira-da-sustentabilidade/202604290500151445549.html' },
      { titulo: 'El IES Luís Seoane convierte Pontevedra en un referente de educación ambiental', detalle: 'Pontevedra Viva · 30/04/2026', url: 'https://www.pontevedraviva.com/es/general/ies-luis-seoane-pontevedra-referente-educacion-ambiental_516871_102.html' },
      { titulo: 'Feira da Sustentabilidade en Monte Porreiro, un «regalo divino» en tiempos de individualismo feroz', detalle: 'Diario de Pontevedra · 01/05/2026', url: 'https://www.diariodepontevedra.es/articulo/pontevedra/regalo-divino-tiempos-individualismo-feroz/202605011637381445935.html' },
      { titulo: 'El IES Luís Seoane clausura una exitosa Feira da Sustentabilidade (fotogalería)', detalle: 'Diario de Pontevedra · 01/05/2026', url: 'https://www.diariodepontevedra.es/album/pontevedra/ies-luis-seoane-clausura-exitosa-feira-da-sustentabilidade/202605011605381446039.html' },
    ] };
    return s;
  });
  gardar('edicions', '2026', e26, 974);
} else avisos.push('Edición 2026: xa fora editada, non se tocou.');

// Edición 2024: peza de prensa verificada
const e24 = atopar('edicions', '2024');
if (e24 && !e24.seccions?.some((s) => s.tipo === 'documentos' && s.etiqueta === 'Na prensa')) {
  const i = e24.seccions.findIndex((s) => s.tipo === 'noticias');
  e24.seccions.splice(i < 0 ? e24.seccions.length : i, 0, sec('documentos', { fondo: 'branco', etiqueta: 'Na prensa', items: [{ titulo: 'Regresa a Feira da Sostibilidade coa participación de máis estudantes', detalle: 'Pontevedra Viva', url: 'https://pontevedraviva.com/xeral/103434/regresa-eco-etika-sostibilidade-debate-estudantes-2024/' }] }));
  gardar('edicions', '2024', e24, 976);
}

// ───── Inicio: ecosistema coas novas entidades ─────
const ini = atopar('paxinas', 'inicio');
if (ini?.seccions) {
  ini.seccions = ini.seccions.map((s) => (s.tipo === 'logos' && s.etiqueta === 'O ecosistema' ? { ...s, grupos: s.grupos.map((g) => ({ ...g, entidades: [...new Set([...g.entidades, ...Object.keys(novas)])] })) } : s));
  gardar('paxinas', 'inicio', ini, 0);
}

// ───── Noticias da IV Feira: data real (a Feira foi o 28–30 de abril de 2026) ─────
for (const d of docs.filter((d) => d.coleccion === 'noticias' && d.datos.edicion === '2026' && d.datos.data === '2026-04-15')) gardar('noticias', d.id, { ...d.datos, data: '2026-04-29' }, d.orde);

// ───── Páxinas legais: IES Luís Seoane como responsable ─────
const RESP_VELLO = '<strong>[PENDENTE: nome da entidade responsable (IES Luís Seoane, CIDEL Galicia ou Universidade de Vigo)]</strong>, con NIF <strong>[PENDENTE: NIF]</strong> e enderezo en <strong>[PENDENTE: enderezo postal]</strong>. Correo de contacto: <strong>[PENDENTE: correo electrónico]</strong>.';
const RESP_NOVO = 'o <strong>IES Luís Seoane</strong>, centro público da Consellería de Educación da Xunta de Galicia, con enderezo na Rúa Luxemburgo, 1, 36162 Monte Porreiro (Pontevedra), teléfono 986 857 700 e correo <a href="mailto:ies.luis.seoane@edu.xunta.gal">ies.luis.seoane@edu.xunta.gal</a>. NIF: <strong>[PENDENTE: NIF]</strong>.';
for (const id of ['aviso-legal', 'privacidade', 'cookies', 'accesibilidade']) {
  const p = atopar('paxinas_libres', id);
  if (!p) continue;
  const antes = JSON.stringify(p);
  for (const s of p.seccions) if (s.corpo) s.corpo = s.corpo
    .replace(RESP_VELLO, RESP_NOVO)
    .replaceAll('<strong>[PENDENTE: correo electrónico]</strong>', '<a href="mailto:ies.luis.seoane@edu.xunta.gal">ies.luis.seoane@edu.xunta.gal</a>')
    .replace('<strong>[PENDENTE: entidade titular]</strong> comprométese', 'O IES Luís Seoane comprométese');
  if (JSON.stringify(p) !== antes) gardar('paxinas_libres', id, p, 90);
}

// ───── Participa máis sinxela ─────
const part = atopar('paxinas', 'participa');
if (part && part.perfis?.some((p) => p.accions?.length)) {
  part.heroTexto = 'A Feira constrúese entre moitas mans. Se queres participar, colaborar ou só saber máis, escríbenos.';
  part.perfis = [
    { id: 'centro', titulo: 'Centros educativos', texto: 'Trae á Feira o que investigou e creou o teu alumnado.', boton: 'Inscribir o centro' },
    { id: 'entidade', titulo: 'Entidades e colectivos', texto: 'Comparte as túas propostas cun stand, un obradoiro ou unha charla.', boton: 'Propoñer participación' },
    { id: 'empresa', titulo: 'Empresas e administracións', texto: 'Colabora con experiencias, recursos ou espazos de diálogo.', boton: 'Ofrecer colaboración' },
    { id: 'prensa', titulo: 'Prensa e medios', texto: 'Información, imaxes e entrevistas sobre a Feira.', boton: 'Contactar' },
  ];
  part.formularioTitulo = 'Cóntanos que tes en mente.';
  part.formularioTexto = 'Para participar ou simplemente preguntar: enche estes poucos campos e respondémosche axiña.';
  gardar('paxinas', 'participa', part, 0);
}

const f = path.join(RAIZ, 'semente', `parche-3${modo === '--remote' ? '-remoto' : ''}.sql`);
fs.writeFileSync(f, sql.join('\n') + '\n');
wr(`--file "${f}" -y`);
console.log(`Parche aplicado (${sql.length} sentenzas).`, avisos.join(' '));
