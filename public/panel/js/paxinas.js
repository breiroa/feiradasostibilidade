// «Páxinas»: todas as páxinas da web nun só sitio (crear, editar con vista previa, duplicar, borrar e recuperar).
import { api, caixaErros, coleccion, confirmar, dataCurta, dataHora, el, gardar, invalidar, modal, slug as slugify } from './nucleo.js';
import * as c from './campos.js';
import { editorVista } from './editor-vista.js';
import { menuEPe } from './menu.js';
import { gardarPaxinaComoModelo, modelosPaxina, modelosSeccion, pestanaModelos } from './modelos.js';

const FIXAS = ['inicio', 'feiralab', 'participa', 'actualidade', 'recursos', 'edicions'];
const SEN_FILLAS = ['inicio', 'participa', 'actualidade', 'recursos', 'edicions'];
const LEGAIS = ['aviso-legal', 'privacidade', 'cookies', 'accesibilidade'];
const RUTAS_FIXAS = { inicio: '/', feiralab: '/feiralab/', participa: '/participa/', actualidade: '/actualidade/', recursos: '/recursos/', edicions: '/edicions/' };
const novoId = () => Math.random().toString(36).slice(2, 10);

export const rutaDe = (id, d) => RUTAS_FIXAS[id] ?? (d.nai ? `/${d.nai}/${id}/` : `/${id}/`);
const pestanas = [['', 'Todas as páxinas'], ['_menu', 'Menú e pé'], ['_modelos', 'Modelos'], ['_papeleira', 'Papeleira']];

function cabeceira(activa) {
  return [
    el('div', { class: 'cab' },
      el('div', {}, el('h1', {}, 'Páxinas'), el('p', { class: 'muted' }, 'Todas as páxinas da web. Cada unha constrúese con seccións e edítase con vista previa ao lado.')),
      activa === '' ? el('button', { class: 'btn', type: 'button', onclick: () => novaPaxina() }, '+ Nova páxina') : null),
    el('nav', { class: 'pestanas', 'aria-label': 'Apartados de Páxinas' }, pestanas.map(([k, t]) => el('a', { href: `#/paxinas${k ? `/${k}` : ''}`, class: k === activa ? 'activo' : '' }, t))),
  ];
}

/** Ruta #/paxinas[/id|/_menu|/_modelos|/_papeleira] */
export async function paxinas(main, id) {
  if (!id) return lista(main);
  if (id === '_menu') { main.replaceChildren(...cabeceira('_menu'), el('div', { id: 'pestana' })); return menuEPe(main.querySelector('#pestana')); }
  if (id === '_modelos') { main.replaceChildren(...cabeceira('_modelos'), el('div', { id: 'pestana' })); return pestanaModelos(main.querySelector('#pestana')); }
  if (id === '_papeleira') return papeleira(main);
  return editar(main, id);
}

// ───────── Lista ─────────
async function lista(main) {
  const items = await coleccion('paxinas_libres', { forzar: true });
  const f = { q: '' };
  const corpo = el('div', { class: 'paxinas-arbore' });
  const fillas = (id) => items.filter((p) => p.datos.nai === id);

  const fila = (it, nivel = 0) => {
    const d = it.datos;
    const fixa = FIXAS.includes(it.id);
    const url = rutaDe(it.id, d);
    const irs = fillas(it.id);
    const ctrl = (txt, titulo, fn, extra = '') => el('button', { type: 'button', class: `icobtn ${extra}`, title: titulo, 'aria-label': titulo, onclick: (e) => { e.stopPropagation(); fn(); } }, txt);
    return el('div', { class: `pax-fila nivel-${nivel}`, onclick: () => { location.hash = `#/paxinas/${it.id}`; } },
      el('div', { class: 'pax-nome' },
        nivel ? el('span', { class: 'pax-rama', 'aria-hidden': 'true' }, '└') : null,
        el('b', {}, d.titulo),
        fixa ? el('span', { class: 'pill' }, 'Fixa') : null,
        d.borrador ? el('span', { class: 'pill aviso' }, 'Borrador') : null,
        el('small', { class: 'muted' }, url)),
      el('div', { class: 'pax-info muted' }, `${(d.seccions ?? []).length} seccións`, el('br'), it.actualizado ? `${dataHora(it.actualizado)}${it.editadoPor ? ` · ${it.editadoPor}` : ''}` : ''),
      el('div', { class: 'accions' },
        nivel ? [ctrl('↑', 'Subir', () => moverFilla(it, -1)), ctrl('↓', 'Baixar', () => moverFilla(it, 1))] : null,
        ctrl('✎', 'Editar', () => { location.hash = `#/paxinas/${it.id}`; }),
        d.borrador ? null : el('a', { class: 'icobtn', href: url, target: '_blank', title: 'Ver na web', 'aria-label': 'Ver na web', onclick: (e) => e.stopPropagation() }, '↗'),
        ctrl('⧉', 'Duplicar', () => duplicar(it)),
        ctrl('☆', 'Gardar como modelo', () => gardarPaxinaComoModelo(it.datos)),
        fixa ? null : ctrl('🗑', 'Borrar (vai á papeleira)', () => borrar(it), 'perigo')),
      irs.length && !f.q ? el('div', { class: 'pax-fillas', onclick: (e) => e.stopPropagation() }, irs.map((x) => fila(x, 1))) : null);
  };

  function pintar() {
    const q = f.q.toLowerCase();
    const vistos = q ? items.filter((p) => p.datos.titulo.toLowerCase().includes(q) || p.id.includes(q)) : null;
    const grupo = (titulo, lista) => (lista.length ? el('section', { class: 'pax-grupo' }, el('h2', {}, titulo), lista.map((x) => fila(x))) : null);
    if (vistos) { corpo.replaceChildren(vistos.length ? grupo('Resultados', vistos) : el('p', { class: 'muted' }, 'Ningunha páxina coincide.')); return; }
    const raiz = items.filter((p) => !p.datos.nai);
    corpo.replaceChildren(
      grupo('Páxinas principais', FIXAS.map((id) => raiz.find((p) => p.id === id)).filter(Boolean)),
      grupo('Outras páxinas', raiz.filter((p) => !FIXAS.includes(p.id) && !LEGAIS.includes(p.id))),
      grupo('Páxinas legais', raiz.filter((p) => LEGAIS.includes(p.id))),
      // Subpáxinas cuxa páxina nai xa non existe
      grupo('Sen páxina nai', items.filter((p) => p.datos.nai && !items.some((x) => x.id === p.datos.nai))),
    );
  }

  async function moverFilla(it, delta) {
    const irmas = fillas(it.datos.nai);
    const i = irmas.indexOf(it);
    const j = i + delta;
    if (j < 0 || j >= irmas.length) return;
    [irmas[i], irmas[j]] = [irmas[j], irmas[i]];
    // Reordenar só as irmás, mantendo o resto da orde
    const ordeIrmas = irmas.map((x) => x.orde).sort((a, b) => a - b);
    irmas.forEach((x, n) => { x.orde = ordeIrmas[n]; });
    items.sort((a, b) => a.orde - b.orde);
    pintar();
    await gardar(() => api('documentos', { metodo: 'PATCH', datos: { coleccion: 'paxinas_libres', ids: items.map((x) => x.id) } }), { mensaxe: 'Orde gardada' });
    invalidar('paxinas_libres');
  }

  async function duplicar(it) {
    const datos = { ...structuredClone(it.datos), titulo: `${it.datos.titulo} (copia)`, borrador: true };
    datos.seccions = (datos.seccions ?? []).map((s) => ({ ...s, id: novoId() }));
    if (SEN_FILLAS.includes(it.id) || it.id === 'feiralab') datos.nai = '';
    const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'paxinas_libres', novo: true, id: slugify(datos.titulo), datos } }), { mensaxe: 'Páxina duplicada (en borrador)' });
    invalidar('paxinas_libres');
    location.hash = `#/paxinas/${r.id}`;
  }

  async function borrar(it) {
    if (!(await confirmar(`Borrar a páxina «${it.datos.titulo}»?`, { detalle: 'Vai á papeleira: poderás recuperala desde «Papeleira».' }))) return;
    try {
      await gardar(() => api('documentos', { metodo: 'DELETE', datos: { coleccion: 'paxinas_libres', id: it.id } }), { mensaxe: 'Movida á papeleira' });
      items.splice(items.indexOf(it), 1);
      invalidar('paxinas_libres');
      pintar();
    } catch (e) {
      if (e.status === 409) modal('Non se pode borrar aínda', el('div', {}, caixaErros(e.erros), el('p', { class: 'muted' }, 'Cambia ou quita esas ligazóns e subpáxinas e volve tentalo.')));
    }
  }

  main.replaceChildren(
    ...cabeceira(''),
    el('div', { class: 'barra-filtros' }, el('input', { type: 'search', placeholder: 'Buscar páxinas…', oninput: (e) => { f.q = e.target.value; pintar(); } })),
    corpo);
  pintar();
}

// ───────── Nova páxina ─────────
export async function novaPaxina({ nai = '' } = {}) {
  const items = await coleccion('paxinas_libres', { forzar: true });
  const modelos = await modelosPaxina();
  const d = { titulo: '', nai, desde: 'branco', modelo: modelos[0]?.id ?? '', copia: '' };
  const idCampo = { id: '', manual: false };
  const erros = el('div');
  const enderezo = el('input', { type: 'text', id: 'enderezo-nova', placeholder: 'a-miña-paxina', oninput: (e) => { idCampo.id = slugify(e.target.value); idCampo.manual = true; previa(); } });
  const vistaUrl = el('div', { class: 'axuda' });
  const previa = () => { vistaUrl.textContent = `Enderezo: ${d.nai ? `/${d.nai}/` : '/'}${idCampo.id || '…'}/`; };
  const nais = [{ valor: '', texto: '— Ningunha (páxina principal) —' }, ...items.filter((p) => !p.datos.nai && !SEN_FILLAS.includes(p.id)).map((p) => ({ valor: p.id, texto: p.datos.titulo }))];
  const desde = el('div');
  const pintarDesde = () => desde.replaceChildren(
    c.escolla(d, 'desde', 'Comezar', [{ valor: 'branco', texto: 'En branco' }, { valor: 'modelo', texto: 'Desde un modelo' }, { valor: 'copia', texto: 'Copiando outra páxina' }], { aoCambiar: pintarDesde }),
    d.desde === 'modelo' ? c.escolla(d, 'modelo', 'Modelo', modelos.map((m) => ({ valor: m.id, texto: `${m.nome}${m.desc ? ` — ${m.desc}` : ''}` }))) : null,
    d.desde === 'copia' ? c.escolla(d, 'copia', 'Páxina que copiar', items.map((p) => ({ valor: p.id, texto: p.datos.titulo })), { baleiro: 'Escolle…' }) : null);
  pintarDesde();
  previa();

  const crear = async () => {
    erros.replaceChildren();
    if (!d.titulo.trim()) { erros.replaceChildren(caixaErros(['Escribe un título.'])); return; }
    let base = { seccions: [{ id: novoId(), tipo: 'texto', oculta: false, fondo: 'branco', corpo: '', estreito: true }] };
    if (d.desde === 'modelo') base = structuredClone(modelos.find((m) => m.id === d.modelo)?.datos ?? base);
    if (d.desde === 'copia' && d.copia) base = structuredClone(items.find((p) => p.id === d.copia)?.datos ?? base);
    const datos = { ...base, titulo: d.titulo.trim(), nai: d.nai, borrador: true, seccions: (base.seccions ?? []).map((s) => ({ ...s, id: novoId() })) };
    try {
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'paxinas_libres', novo: true, id: idCampo.id || slugify(d.titulo), datos } }), { mensaxe: 'Páxina creada (en borrador)' });
      invalidar('paxinas_libres');
      m.pechar();
      location.hash = `#/paxinas/${r.id}`;
    } catch (e) {
      erros.replaceChildren(caixaErros(e.erros ?? ['Non se puido crear.']));
    }
  };
  const m = modal('Nova páxina', el('div', {},
    erros,
    c.texto(d, 'titulo', 'Título', { obrig: true, aoCambiar: (v) => { if (!idCampo.manual) { idCampo.id = slugify(v); enderezo.value = idCampo.id; previa(); } } }),
    el('div', { class: 'campo' }, el('label', { for: 'enderezo-nova' }, 'Enderezo'), enderezo, vistaUrl),
    c.escolla(d, 'nai', 'Dentro de', nais, { aoCambiar: previa, axuda: 'Se a metes dentro doutra páxina, o enderezo será /esa-paxina/esta/ e aparecerá nas súas «Subpáxinas».' }),
    desde,
    el('p', { class: 'muted' }, 'Créase como borrador: non se verá na web ata que desmarques «Borrador» e gardes.')), {
    botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'), el('button', { type: 'button', class: 'btn', onclick: crear }, 'Crear e editar')],
  });
}

// ───────── Editor dunha páxina ─────────
async function editar(main, id) {
  const items = await coleccion('paxinas_libres', { forzar: true });
  const it = items.find((x) => x.id === id);
  if (!it) {
    main.replaceChildren(el('a', { class: 'volver', href: '#/paxinas' }, '← Páxinas'), el('div', { class: 'baleiro' }, 'Non se atopou esta páxina. Quizais se borrou (mira na Papeleira).'));
    return;
  }
  const d = structuredClone(it.datos);
  const fixa = FIXAS.includes(id);
  const nais = [{ valor: '', texto: '— Ningunha (páxina principal) —' },
    ...items.filter((p) => p.id !== id && !p.datos.nai && !SEN_FILLAS.includes(p.id)).map((p) => ({ valor: p.id, texto: p.datos.titulo }))];
  const tenFillas = items.some((p) => p.datos.nai === id);
  editorVista(main, {
    coleccion: 'paxinas_libres', id, d, item: it,
    titulo: (x) => x.titulo,
    volver: ['#/paxinas', 'Páxinas'],
    verNaWeb: (i, x) => (x.borrador ? null : rutaDe(i, x)),
    naiTitulo: (x) => items.find((p) => p.id === x.nai)?.datos.titulo ?? '',
    modelos: modelosSeccion(),
    axustes: (x) => axustesPaxina(x, { id, fixa, nais, tenFillas }),
  });
}

function axustesPaxina(d, { id, fixa, nais, tenFillas }) {
  if (!d.cabeceira) d.cabeceira = { datas: [] };
  const cab = d.cabeceira;
  return [
    c.texto(d, 'titulo', 'Título da páxina', { obrig: true, axuda: 'Sae na pestana do navegador, nos menús e nas tarxetas.' }),
    el('div', { class: 'fila2' },
      fixa || tenFillas
        ? el('div', { class: 'campo' }, el('label', {}, 'Enderezo'), el('input', { type: 'text', value: rutaDe(id, d), disabled: true }), el('div', { class: 'axuda' }, fixa ? 'Páxina fixa da web.' : 'Ten subpáxinas, así que vai na raíz.'))
        : c.escolla(d, 'nai', 'Dentro de', nais),
      fixa ? null : c.marca(d, 'borrador', 'Borrador (aínda non publicar)')),
    c.area(d, 'descricion', 'Descrición', { filas: 2, axuda: 'Para buscadores e redes; tamén sae nas tarxetas de subpáxinas.' }),
    c.imaxe(d, 'imaxe', 'Imaxe para compartir en redes (opcional)'),
    c.bloque('Cabeceira sinxela', 'Só se mostra se a primeira sección non é unha «Portada». Se deixas o título baleiro, úsase o título da páxina.',
      el('div', { class: 'fila2' }, c.texto(cab, 'etiqueta', 'Etiqueta pequena'), c.texto(cab, 'titulo', 'Título grande')),
      el('div', { class: 'fila2' }, c.texto(cab, 'destaque', 'Final do título en cor'), el('div')),
      c.area(cab, 'texto', 'Texto', { filas: 2 }),
      c.imaxe(cab, 'imaxe', 'Foto (opcional)', { claveAlt: 'imaxeAlt' }),
      c.repetidor(cab, 'datas', 'Datas destacadas (opcional)', { novo: () => ({ data: '', texto: '' }), engadirTexto: '+ Engadir data',
        pintarItem: (x) => el('div', { class: 'fila2' }, c.texto(x, 'data', 'Data'), c.texto(x, 'texto', 'Que pasa')) })),
  ];
}

// ───────── Papeleira ─────────
const nomesColeccion = { paxinas_libres: 'Páxina', noticias: 'Noticia', recursos: 'Recurso', edicions: 'Edición', entidades: 'Entidade', proxectos: 'Proxecto', modelos: 'Modelo' };
async function papeleira(main) {
  const { items } = await api('versions?papeleira=1');
  const corpo = el('tbody');
  const pintar = () => corpo.replaceChildren(items.length
    ? items.map((it) => el('tr', {},
      el('td', {}, el('b', {}, it.titulo), el('br'), el('small', { class: 'muted' }, nomesColeccion[it.coleccion] ?? it.coleccion)),
      el('td', { class: 'muted' }, `${dataHora(it.creado)}${it.autor ? ` · ${it.autor}` : ''}`),
      el('td', {}, el('button', { type: 'button', class: 'btn btn-peq', onclick: () => recuperar(it) }, 'Recuperar'))))
    : el('tr', {}, el('td', { colspan: 3, class: 'muted' }, 'A papeleira está baleira.')));
  async function recuperar(it) {
    const { version } = await api(`versions?version=${it.id}`);
    const datos = version.datos;
    const tentar = () => api('documentos', { metodo: 'POST', datos: { coleccion: it.coleccion, id: it.docId, novo: true, datos, accion: 'restaurado' } });
    let r;
    try {
      r = await gardar(tentar, { mensaxe: 'Recuperado' });
    } catch (e) {
      // Se a súa páxina nai xa non existe, recupérase como páxina principal
      if (it.coleccion !== 'paxinas_libres' || !datos.nai) return;
      datos.nai = '';
      r = await gardar(tentar, { mensaxe: 'Recuperada como páxina principal' });
    }
    invalidar(it.coleccion);
    items.splice(items.indexOf(it), 1);
    pintar();
    if (it.coleccion === 'paxinas_libres') location.hash = `#/paxinas/${r.id}`;
  }
  main.replaceChildren(...cabeceira('_papeleira'),
    el('p', { class: 'muted' }, 'Páxinas, noticias, recursos e outros contidos borrados. Ao recuperalos volven tal como estaban.'),
    el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, el('th', {}, 'Contido'), el('th', {}, 'Borrado'), el('th', {}))), corpo)));
  pintar();
}
