// Migra os contidos ao formato de SECCIÓNS (construtor de páxinas), sen perder nada:
//  - edicións: corpo, programa, galería, vídeos, grupos, centros, documentos e prensa → seccións
//  - edición 2027 → «V Feira da Sostibilidade · SENDA 2030», co relato do proxecto
//  - Inicio + A Feira → Inicio con seccións; novo FeiraLab; aviso legal → páxina libre; premios → pé
// Uso: node scripts/migrar-seccions.mjs --local | --remote   (é idempotente: se xa está migrado, non fai nada)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

const docs = JSON.parse(wr('--json --command "SELECT coleccion, id, datos, orde FROM documentos"'))[0].results.map((d) => ({ ...d, datos: JSON.parse(d.datos) }));
const atopar = (c, id) => docs.find((d) => d.coleccion === c && d.id === id);

if (docs.some((d) => d.coleccion === 'paxinas_libres' && d.id === 'feiralab')) {
  console.log('Xa estaba migrado: non se fai nada.');
  process.exit(0);
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = [];
const gardar = (c, id, datos, orde = 0) =>
  sql.push(`INSERT INTO documentos (coleccion, id, datos, orde) VALUES (${q(c)}, ${q(id)}, ${q(JSON.stringify(datos))}, ${orde}) ON CONFLICT(coleccion, id) DO UPDATE SET datos = excluded.datos, actualizado = datetime('now');`);
let n = 0;
const sid = () => `s${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const sec = (tipo, campos) => ({ id: sid(), tipo, oculta: false, fondo: 'claro', ...campos });

// ───── Edicións ─────
const senda = atopar('proxectos', 'senda-2030')?.datos;
for (const ed of docs.filter((d) => d.coleccion === 'edicions')) {
  const d = ed.datos;
  const s = [];
  if (ed.id === '2027' && senda) {
    d.titulo = 'V Feira da Sostibilidade · SENDA 2030';
    s.push(
      sec('texto_imaxe', {
        ancla: 'senda-2030', fondo: 'branco', etiqueta: 'O camiño ata a Feira', titulo: 'Unha Feira que se constrúe durante todo o curso.',
        corpo: `${d.corpo ?? ''}${senda.corpo ?? ''}`, imaxe: 'f-alumnado-presenta-investigacion', imaxeAlt: 'Alumnado presentando unha investigación de ciencia cidadá', posicion: 'dereita',
        botons: [{ texto: 'As actividades do proxecto', url: '#actividades', estilo: 'secundario' }],
      }),
      sec('cifras', { etiqueta: 'SENDA 2030', titulo: 'Un proxecto para toda a comunidade educativa.', texto: senda.resumo, cifras: senda.cifras ?? [] }),
      sec('cronoloxia', {
        fondo: 'branco', etiqueta: 'O itinerario', titulo: 'Investigar, contrastar, actuar.',
        fitos: [
          { data: 'Outono 2026', titulo: 'Arranque', texto: 'Coordinación cos centros participantes e liña de base.', estado: 'agora' },
          { data: 'Novembro 2026 – marzo 2027', titulo: 'Formación, laboratorio e ciencia cidadá', texto: 'Formación docente en EpDCG, laboratorio de propostas educativas, obradoiros de cidadanía global e microproxectos Eco-Étika nas aulas.', estado: 'proximo' },
          { data: 'Primavera 2027', titulo: 'Diálogo entre territorios', texto: 'Encontros local-global con docentes de América Latina, Eco-Étika Conecta e a campaña «Dálle a volta».', estado: 'proximo' },
          { data: '28–30 abril 2027', titulo: 'V Feira da Sostibilidade', texto: 'Tres xornadas no IES Luís Seoane co II Foro de Desenvolvemento Local e a I Conferencia COOPEDUGAL.', estado: 'proximo' },
          { data: 'Maio – setembro 2027', titulo: 'SENDA Aberta', texto: 'Sistematización, documental e guía «Así fixemos SENDA» para que outros centros poidan adaptar a experiencia.', estado: 'proximo' },
        ],
      }),
      sec('tarxetas', {
        etiqueta: 'Na Feira', titulo: 'Que haberá na V Feira.', columnas: 2,
        items: (d.programa ?? []).flatMap((dia) => dia.actividades ?? []).map((a) => ({ titulo: a.titulo, texto: a.descricion })),
      }),
      sec('actividades', { ancla: 'actividades', fondo: 'branco', etiqueta: 'Actividades do proxecto', titulo: 'Paso a paso cara á Feira.', texto: 'O estado de cada actividade actualízase ao longo do curso.', proxecto: 'senda-2030' }),
    );
  } else {
    if (d.corpo) s.push(sec('texto', { fondo: 'branco', etiqueta: 'A edición', corpo: d.corpo }));
    if (d.programa?.length) s.push(sec('programa', { fondo: 'branco', etiqueta: 'Programa', titulo: 'Que houbo na Feira.', dias: d.programa }));
  }
  if (d.galeria?.length) s.push(sec('galeria', { etiqueta: 'Galería', titulo: 'Imaxes da edición.', imaxes: d.galeria }));
  for (const v of d.videos ?? []) s.push(sec('video', { titulo: v.titulo, url: v.url }));
  const grupos = [...(d.grupos ?? [])];
  if (grupos.length) s.push(sec('logos', { fondo: 'verde', etiqueta: 'Quen participa', titulo: 'Centros e entidades.', texto: ed.id === '2027' && senda ? senda.financiamento : undefined, grupos }));
  if (d.centros?.length) s.push(sec('lista', { fondo: 'verde', titulo: 'Centros educativos', items: d.centros }));
  if (d.documentos?.length) s.push(sec('documentos', { fondo: 'branco', etiqueta: 'Documentos', items: d.documentos.map((x) => ({ titulo: x.titulo, url: x.url, ficheiro: x.ficheiro })) }));
  if (d.prensa?.length) s.push(sec('documentos', { fondo: 'branco', etiqueta: 'Na prensa', items: d.prensa.map((p) => ({ titulo: p.titulo ?? p.medio, detalle: p.titulo ? p.medio : undefined, url: p.url })) }));
  s.push(sec('noticias', { etiqueta: 'Actualidade', titulo: 'Noticias desta edición.', edicion: ed.id, numero: 6 }));
  if (d.estado === 'proxima') s.push(sec('chamada', { fondo: 'morado', titulo: 'Queres participar nesta edición?', texto: 'Centros educativos, entidades, empresas e medios: hai moitas formas de formar parte da Feira.', botons: [{ texto: 'Como participar', url: '/participa/', estilo: 'principal' }] }));

  const nova = { numero: d.numero, ano: d.ano, titulo: d.titulo, lema: d.lema, datas: d.datas, lugar: d.lugar, estado: d.estado, resumo: d.resumo, portada: d.portada, portadaAlt: d.portadaAlt, cifras: d.cifras ?? [], fitos: d.fitos ?? [], proxecto: d.proxecto, seccions: s };
  gardar('edicions', ed.id, JSON.parse(JSON.stringify(nova)), ed.orde);
}

// ───── Inicio (Inicio + A Feira) ─────
const ini = atopar('paxinas', 'inicio')?.datos ?? {};
const af = atopar('paxinas', 'a-feira')?.datos ?? {};
const eds = docs.filter((d) => d.coleccion === 'edicions').map((d) => d.datos).sort((a, b) => b.ano - a.ano);
const ultimaPasada = eds.find((e) => e.estado === 'pasada');
gardar('paxinas', 'inicio', {
  seccions: [
    sec('heroe', {
      etiqueta: ini.heroEtiqueta, titulo: ini.heroTitulo, destaque: ini.heroDestaque, texto: ini.heroTexto, imaxe: ini.heroImaxe, imaxeAlt: ini.heroImaxeAlt, cifras: ini.cifras ?? [],
      botons: [{ texto: 'V Feira · 28–30 abril 2027', url: '/edicions/2027/', estilo: 'principal' }, { texto: 'Que é a Feira', url: '#a-feira', estilo: 'secundario' }],
    }),
    sec('texto_imaxe', { ancla: 'a-feira', fondo: 'branco', etiqueta: 'A Feira', titulo: af.introTitulo, corpo: af.introCorpo, imaxe: af.introImaxe, imaxeAlt: af.introImaxeAlt, posicion: 'dereita', botons: [{ texto: 'Coñece FeiraLab', url: '/feiralab/', estilo: 'secundario' }] }),
    sec('edicion_actual', { etiqueta: 'Próxima edición' }),
    sec('tarxetas', {
      fondo: 'verde', etiqueta: 'FeiraLab', titulo: 'Máis ca unha feira: un laboratorio.', texto: 'Detrás da Feira hai un laboratorio de innovación educativa que traballa todo o curso con tres metodoloxías que se retroalimentan.', columnas: 3,
      items: (af.metodoloxias ?? []).map((m) => ({ etiqueta: m.sigla, titulo: m.lema, texto: m.texto, url: '/feiralab/' })),
    }),
    sec('edicions', { etiqueta: 'As edicións', titulo: ini.edicionsTitulo, texto: ini.edicionsTexto }),
    sec('cita', { fondo: 'verde', texto: ini.cita ?? 'O futuro non se explica.', destaque: ini.citaDestaque }),
    sec('noticias', { fondo: 'branco', etiqueta: 'Actualidade', titulo: 'O proceso en directo.', numero: 3 }),
    ultimaPasada?.galeria?.length ? sec('galeria', { etiqueta: ultimaPasada.titulo, titulo: 'Así foi a última Feira.', imaxes: ultimaPasada.galeria.slice(0, 8) }) : null,
    sec('logos', { fondo: 'branco', etiqueta: 'O ecosistema', titulo: ini.ecosistemaTitulo, texto: ini.ecosistemaTexto, grupos: [{ titulo: 'Colaboran', entidades: ini.ecosistemaEntidades ?? [] }] }),
    sec('chamada', { fondo: 'morado', etiqueta: 'Participa', titulo: ini.participaTitulo, texto: ini.participaTexto, botons: [{ texto: 'Como participar', url: '/participa/', estilo: 'principal' }, { texto: '@feiradasostibilidade', url: 'https://www.instagram.com/feiradasostibilidade', estilo: 'secundario' }] }),
  ].filter(Boolean).map((x) => JSON.parse(JSON.stringify(x))),
});

// ───── FeiraLab ─────
gardar('paxinas_libres', 'feiralab', JSON.parse(JSON.stringify({
  titulo: 'FeiraLab',
  descricion: 'A Feira da Sostibilidade como laboratorio de innovación educativa: investigación, acción e cidadanía crítica durante todo o curso.',
  nai: '',
  imaxe: af.heroImaxe,
  seccions: [
    sec('heroe', { etiqueta: af.heroEtiqueta ?? 'FeiraLab · Xeración Eco-Étika', titulo: af.heroTitulo, destaque: af.heroDestaque, texto: af.heroTexto, imaxe: af.heroImaxe, imaxeAlt: af.heroImaxeAlt }),
    sec('tarxetas', { fondo: 'verde', etiqueta: 'Como traballamos', titulo: af.metodoloxiasTitulo, columnas: 3, items: (af.metodoloxias ?? []).map((m) => ({ etiqueta: `${m.sigla} · ${m.nome}`, titulo: m.lema, texto: m.texto })) }),
    sec('tarxetas', { fondo: 'branco', etiqueta: 'Liñas de traballo', titulo: af.linhasTitulo, texto: af.linhasTexto, columnas: 3, items: (af.linhas ?? []).map((l) => ({ etiqueta: l.ods, titulo: l.titulo, texto: l.texto })) }),
    sec('cronoloxia', { fondo: 'escuro', etiqueta: 'Recoñecementos', titulo: af.premiosTitulo, fitos: (af.premios ?? []).map((p) => ({ data: p.ano, titulo: p.texto, estado: 'feito' })) }),
    sec('subpaxinas', { etiqueta: 'No laboratorio', titulo: 'Máis sobre FeiraLab.', nai: 'feiralab' }),
    sec('chamada', { fondo: 'morado', titulo: 'Queres traer o laboratorio ao teu centro?', texto: 'Escríbenos e contamos como participar na próxima Feira.', botons: [{ texto: 'Participa', url: '/participa/', estilo: 'principal' }] }),
  ],
})), 1);

// ───── Aviso legal → páxina libre ─────
const aviso = atopar('paxinas', 'aviso-legal')?.datos;
if (aviso) gardar('paxinas_libres', 'aviso-legal', { titulo: 'Aviso legal', nai: '', borrador: false, seccions: [sec('texto', { fondo: 'branco', corpo: aviso.corpo ?? '' })] }, 90);

// ───── Premios ao pé ─────
const ax = atopar('axustes', 'xeral')?.datos;
if (ax) {
  ax.pe = { ...(ax.pe ?? {}), premios: (af.premios ?? []).map((p) => ({ ano: p.ano, texto: p.texto })) };
  gardar('axustes', 'xeral', ax);
}

sql.push("DELETE FROM documentos WHERE coleccion = 'paxinas' AND id IN ('a-feira', 'aviso-legal');");

const ficheiro = path.join(RAIZ, 'semente', `migracion-seccions${modo === '--remote' ? '-remota' : ''}.sql`);
fs.writeFileSync(ficheiro, sql.join('\n') + '\n');
console.log(`Escribín ${sql.length} sentenzas en ${path.relative(RAIZ, ficheiro)}; aplicando…`);
wr(`--file "${ficheiro}" -y`);
console.log('Migración feita.');
