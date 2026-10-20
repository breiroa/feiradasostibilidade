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

// ───────── Lista (árbore) ─────────
// Arrastrar unha páxina: enriba ou debaixo doutra para reordenar; no medio para metela dentro (subpáxina).
// As edicións aparecen como subpáxinas de «Edicións».
async function lista(main) {
  const [items, eds] = await Promise.all([coleccion('paxinas_libres', { forzar: true }), coleccion('edicions', { forzar: true })]);
  const f = { q: '' };
  const corpo = el('div', { class: 'paxinas-arbore' });
  const fillas = (id) => items.filter((p) => p.datos.nai === id);
  let arrastrada = null;

  const ctrl = (txt, titulo, fn, extra = '') => el('button', { type: 'button', class: `icobtn ${extra}`, title: titulo, 'aria-label': titulo, onclick: (e) => { e.stopPropagation(); fn(); } }, txt);
  const info = (it) => (it.actualizado ? `${dataHora(it.actualizado)}${it.editadoPor ? ` · ${it.editadoPor}` : ''}` : '');

  // Pode «it» ter subpáxinas? (non as fixas especiais, nin as que xa son subpáxinas)
  const podeSerNai = (it) => !it.datos.nai && !SEN_FILLAS.includes(it.id);
  const podeMoverse = (it) => it.id !== 'inicio';

  function fila(it, nivel = 0) {
    const d = it.datos;
    const fixa = FIXAS.includes(it.id);
    const url = rutaDe(it.id, d);
    const irs = fillas(it.id);
    const r = el('div', { class: `pax-fila nivel-${nivel}`, 'data-id': it.id, draggable: podeMoverse(it) && !f.q, onclick: (e) => { if (!e.target.closest('.pax-fillas')) location.hash = `#/paxinas/${it.id}`; } },
      el('div', { class: 'pax-nome' },
        podeMoverse(it) && !f.q ? el('span', { class: 'pax-asa', title: 'Arrastra para mover', 'aria-hidden': 'true' }, '⠿') : el('span', { class: 'pax-asa baleira' }),
        el('b', {}, d.titulo),
        fixa ? el('span', { class: 'pill', title: 'Páxina fixa da web: non se borra' }, 'Fixa') : null,
        d.borrador ? el('span', { class: 'pill aviso' }, 'Borrador') : null,
        el('small', { class: 'muted' }, url)),
      el('div', { class: 'pax-info muted' }, `${(d.seccions ?? []).length} seccións`, el('br'), info(it)),
      el('div', { class: 'accions' },
        ctrl('✎', 'Editar', () => { location.hash = `#/paxinas/${it.id}`; }),
        d.borrador ? null : el('a', { class: 'icobtn', href: url, target: '_blank', title: 'Ver na web', 'aria-label': 'Ver na web', onclick: (e) => e.stopPropagation() }, '↗'),
        podeSerNai(it) && !LEGAIS.includes(it.id) ? ctrl('+', 'Nova subpáxina dentro desta', () => novaPaxina({ nai: it.id })) : null,
        ctrl('⧉', 'Duplicar', () => duplicar(it)),
        ctrl('☆', 'Gardar como modelo', () => gardarPaxinaComoModelo(it.datos)),
        fixa ? null : ctrl('🗑', 'Borrar (vai á papeleira)', () => borrar(it), 'perigo')),
      it.id === 'edicions' && !f.q
        ? el('div', { class: 'pax-fillas', onclick: (e) => e.stopPropagation() }, [...eds].sort((a, b) => b.datos.ano - a.datos.ano).map(filaEdicion), el('button', { type: 'button', class: 'btn-mini', onclick: () => novaPaxina({ nai: 'edicions' }) }, '+ Nova edición'))
        : irs.length && !f.q ? el('div', { class: 'pax-fillas', onclick: (e) => e.stopPropagation() }, irs.map((x) => fila(x, 1))) : null);
    arrastrable(r, it);
    return r;
  }

  function filaEdicion(e) {
    const d = e.datos;
    return el('div', { class: 'pax-fila nivel-1 edicion', onclick: () => { location.hash = `#/edicions/${e.id}`; } },
      el('div', { class: 'pax-nome' }, el('span', { class: 'pax-asa baleira' }), el('b', {}, d.titulo),
        el('span', { class: `pill ${d.estado === 'proxima' ? 'verde' : ''}` }, d.estado === 'proxima' ? 'Próxima' : 'Pasada'),
        el('small', { class: 'muted' }, `/edicions/${e.id}/`)),
      el('div', { class: 'pax-info muted' }, `${(d.seccions ?? []).length} seccións`, el('br'), info(e)),
      el('div', { class: 'accions' },
        ctrl('✎', 'Editar', () => { location.hash = `#/edicions/${e.id}`; }),
        el('a', { class: 'icobtn', href: `/edicions/${e.id}/`, target: '_blank', title: 'Ver na web', 'aria-label': 'Ver na web', onclick: (ev) => ev.stopPropagation() }, '↗'),
        ctrl('🗑', 'Borrar a edición (vai á papeleira)', () => borrarEdicion(e), 'perigo')));
  }

  // ── Arrastrar ──
  function zona(e, r) {
    const b = r.getBoundingClientRect();
    const y = (e.clientY - b.top) / Math.min(b.height, 64);
    return y < 0.3 ? 'antes' : y > 0.7 && b.height <= 64 ? 'despois' : y > 0.7 ? 'despois' : 'dentro';
  }
  function arrastrable(r, it) {
    r.addEventListener('dragstart', (e) => { e.stopPropagation(); arrastrada = it; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', it.id); r.classList.add('arrastrando'); });
    r.addEventListener('dragend', () => { arrastrada = null; corpo.querySelectorAll('.arrastrando, .soltar-antes, .soltar-despois, .soltar-dentro').forEach((x) => x.classList.remove('arrastrando', 'soltar-antes', 'soltar-despois', 'soltar-dentro')); });
    r.addEventListener('dragover', (e) => {
      if (!arrastrada || arrastrada === it || e.target.closest('.pax-fila') !== r) return;
      const z = zona(e, r);
      const valida = z === 'dentro' ? podeMeter(arrastrada, it) : podePor(arrastrada, it);
      r.classList.remove('soltar-antes', 'soltar-despois', 'soltar-dentro');
      if (!valida) return;
      e.preventDefault();
      e.stopPropagation();
      r.classList.add(`soltar-${z}`);
    });
    r.addEventListener('dragleave', (e) => { if (!r.contains(e.relatedTarget)) r.classList.remove('soltar-antes', 'soltar-despois', 'soltar-dentro'); });
    r.addEventListener('drop', (e) => {
      if (!arrastrada || e.target.closest('.pax-fila') !== r) return;
      e.preventDefault();
      e.stopPropagation();
      const z = r.classList.contains('soltar-dentro') ? 'dentro' : r.classList.contains('soltar-antes') ? 'antes' : r.classList.contains('soltar-despois') ? 'despois' : null;
      const a = arrastrada;
      arrastrada = null;
      if (z) mover(a, it, z);
    });
  }
  // Meter «a» dentro de «b»: b pode ter fillas, a non ten fillas propias e non é fixa
  const podeMeter = (a, b) => podeSerNai(b) && !FIXAS.includes(a.id) && !fillas(a.id).length && !LEGAIS.includes(b.id);
  // Poñer «a» ao carón de «b»: se b é subpáxina, a pasa a ser irmá (mesmas condicións que meter)
  const podePor = (a, b) => (b.datos.nai ? podeMeter(a, items.find((x) => x.id === b.datos.nai) ?? b) : true);

  async function mover(a, b, z) {
    const novaNai = z === 'dentro' ? b.id : b.datos.nai || '';
    // Nova orde: quitar «a» e poñela antes/despois de «b» (ou ao final das fillas de «b»)
    const resto = items.filter((x) => x !== a);
    let pos;
    if (z === 'dentro') {
      const irs = resto.filter((x) => x.datos.nai === b.id);
      pos = resto.indexOf(irs.length ? irs.at(-1) : b) + 1;
    } else pos = resto.indexOf(b) + (z === 'despois' ? 1 : 0);
    resto.splice(pos, 0, a);
    try {
      if ((a.datos.nai || '') !== novaNai) {
        const datos = { ...a.datos, nai: novaNai };
        await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'paxinas_libres', id: a.id, datos } }), { mensaxe: novaNai ? `Agora é subpáxina de «${b.datos.titulo}»` : 'Agora é unha páxina principal' });
        a.datos = datos;
      }
      await gardar(() => api('documentos', { metodo: 'PATCH', datos: { coleccion: 'paxinas_libres', ids: resto.map((x) => x.id) } }), { mensaxe: null });
      items.splice(0, items.length, ...resto);
      invalidar('paxinas_libres');
      pintar();
    } catch (e) {
      if (e.erros) modal('Non se puido mover', caixaErros(e.erros));
    }
  }

  function pintar() {
    const q = f.q.toLowerCase();
    if (q) {
      const vistos = items.filter((p) => p.datos.titulo.toLowerCase().includes(q) || p.id.includes(q));
      const vistasEds = eds.filter((e) => e.datos.titulo.toLowerCase().includes(q) || e.id.includes(q));
      corpo.replaceChildren(vistos.length || vistasEds.length
        ? el('section', { class: 'pax-grupo' }, el('h2', {}, 'Resultados'), vistos.map((x) => fila(x)), vistasEds.map(filaEdicion))
        : el('p', { class: 'muted' }, 'Ningunha páxina coincide.'));
      return;
    }
    const raiz = items.filter((p) => !p.datos.nai);
    const grupo = (titulo, lista, axuda) => (lista.length ? el('section', { class: 'pax-grupo' }, el('h2', {}, titulo), axuda ? el('p', { class: 'muted pax-axuda' }, axuda) : null, lista.map((x) => fila(x))) : null);
    corpo.replaceChildren(
      grupo('Páxinas da web', raiz.filter((p) => !LEGAIS.includes(p.id)), 'Arrastra ⠿ unha páxina enriba ou debaixo doutra para ordenala, ou sobre o centro doutra para metela dentro (subpáxina).'),
      grupo('Páxinas legais', raiz.filter((p) => LEGAIS.includes(p.id))),
      grupo('Sen páxina nai', items.filter((p) => p.datos.nai && !items.some((x) => x.id === p.datos.nai))),
    );
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

  async function borrarEdicion(e) {
    if (!(await confirmar(`Borrar a edición «${e.datos.titulo}»?`, { detalle: 'Vai á papeleira: poderás recuperala desde «Papeleira».' }))) return;
    try {
      await gardar(() => api('documentos', { metodo: 'DELETE', datos: { coleccion: 'edicions', id: e.id } }), { mensaxe: 'Movida á papeleira' });
      eds.splice(eds.indexOf(e), 1);
      invalidar('edicions');
      pintar();
    } catch (err) {
      if (err.status === 409) modal('Non se pode borrar aínda', el('div', {}, caixaErros(err.erros), el('p', { class: 'muted' }, 'Quita esas referencias (noticias, recursos, axustes…) e volve tentalo.')));
    }
  }

  main.replaceChildren(
    ...cabeceira(''),
    el('div', { class: 'barra-filtros' }, el('input', { type: 'search', placeholder: 'Buscar páxinas e edicións…', oninput: (e) => { f.q = e.target.value; pintar(); } })),
    corpo);
  pintar();
}

// ───────── Nova páxina (ou nova edición, se vai dentro de Edicións) ─────────
export async function novaPaxina({ nai = '' } = {}) {
  const [items, eds] = await Promise.all([coleccion('paxinas_libres', { forzar: true }), coleccion('edicions', { forzar: true })]);
  const modelos = await modelosPaxina();
  const ultima = [...eds].sort((a, b) => b.datos.ano - a.datos.ano)[0]?.datos;
  const d = { titulo: '', nai, desde: 'branco', modelo: modelos[0]?.id ?? '', copia: '', ano: (ultima?.ano ?? new Date().getFullYear()) + 1 };
  const idCampo = { id: '', manual: false };
  const erros = el('div');
  const enderezo = el('input', { type: 'text', id: 'enderezo-nova', placeholder: 'a-miña-paxina', oninput: (e) => { idCampo.id = slugify(e.target.value); idCampo.manual = true; previa(); } });
  const vistaUrl = el('div', { class: 'axuda' });
  const previa = () => { vistaUrl.textContent = `Enderezo: ${d.nai ? `/${d.nai}/` : '/'}${idCampo.id || '…'}/`; };
  const nais = [{ valor: '', texto: '— Ningunha (páxina principal) —' }, ...items.filter((p) => !p.datos.nai && (!SEN_FILLAS.includes(p.id) || p.id === 'edicions')).map((p) => ({ valor: p.id, texto: p.id === 'edicions' ? 'Edicións (crea unha edición nova da Feira)' : p.datos.titulo }))];
  const variable = el('div');
  const pintarVariable = () => {
    const edicion = d.nai === 'edicions';
    variable.replaceChildren(
      edicion
        ? el('div', { class: 'fila2' }, c.texto(d, 'ano', 'Ano da edición', { tipo: 'number', obrig: true, axuda: 'Será o enderezo: /edicions/ano/' }), el('div'))
        : el('div', { class: 'campo' }, el('label', { for: 'enderezo-nova' }, 'Enderezo'), enderezo, vistaUrl),
      edicion ? null : c.escolla(d, 'desde', 'Comezar', [{ valor: 'branco', texto: 'En branco' }, { valor: 'modelo', texto: 'Desde un modelo' }, { valor: 'copia', texto: 'Copiando outra páxina' }], { aoCambiar: pintarVariable }),
      !edicion && d.desde === 'modelo' ? c.escolla(d, 'modelo', 'Modelo', modelos.map((m) => ({ valor: m.id, texto: `${m.nome}${m.desc ? ` — ${m.desc}` : ''}` }))) : null,
      !edicion && d.desde === 'copia' ? c.escolla(d, 'copia', 'Páxina que copiar', items.map((p) => ({ valor: p.id, texto: p.datos.titulo })), { baleiro: 'Escolle…' }) : null,
      el('p', { class: 'muted' }, edicion ? 'A edición nova copia as seccións da anterior para non partir de cero. Créase como «próxima».' : 'Créase como borrador: non se verá na web ata que a publiques.'));
    previa();
  };
  pintarVariable();

  const crear = async () => {
    erros.replaceChildren();
    if (!d.titulo.trim()) { erros.replaceChildren(caixaErros(['Escribe un título.'])); return; }
    try {
      if (d.nai === 'edicions') {
        const datos = {
          numero: (ultima?.numero ?? 0) + 1, ano: Number(d.ano), titulo: d.titulo.trim(), datas: 'Por concretar', lugar: ultima?.lugar ?? 'IES Luís Seoane · Monte Porreiro, Pontevedra',
          estado: 'proxima', resumo: 'Por escribir.', cifras: [], fitos: [],
          seccions: structuredClone(ultima?.seccions ?? []).map((s) => ({ ...s, id: novoId() })),
        };
        const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'edicions', novo: true, datos } }), { mensaxe: 'Edición creada' });
        invalidar('edicions');
        m.pechar();
        location.hash = `#/edicions/${r.id}`;
        return;
      }
      let base = { seccions: [{ id: novoId(), tipo: 'texto', oculta: false, fondo: 'branco', corpo: '<p>Escribe aquí o texto da páxina.</p>', estreito: true }] };
      if (d.desde === 'modelo') base = structuredClone(modelos.find((x) => x.id === d.modelo)?.datos ?? base);
      if (d.desde === 'copia' && d.copia) base = structuredClone(items.find((p) => p.id === d.copia)?.datos ?? base);
      const datos = { ...base, titulo: d.titulo.trim(), nai: d.nai, borrador: true, seccions: (base.seccions ?? []).map((s) => ({ ...s, id: novoId() })) };
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'paxinas_libres', novo: true, id: idCampo.id || slugify(d.titulo), datos } }), { mensaxe: 'Páxina creada (en borrador)' });
      invalidar('paxinas_libres');
      m.pechar();
      location.hash = `#/paxinas/${r.id}`;
    } catch (e) {
      erros.replaceChildren(caixaErros(e.erros ?? ['Non se puido crear.']));
    }
  };
  const m = modal(nai === 'edicions' ? 'Nova edición' : 'Nova páxina', el('div', {},
    erros,
    c.texto(d, 'titulo', 'Título', { obrig: true, placeholder: nai === 'edicions' ? 'VI Feira da Sostibilidade' : '', aoCambiar: (v) => { if (!idCampo.manual) { idCampo.id = slugify(v); enderezo.value = idCampo.id; previa(); } } }),
    c.escolla(d, 'nai', 'Dentro de', nais, { aoCambiar: pintarVariable, axuda: 'Se a metes dentro doutra páxina, o enderezo será /esa-paxina/esta/ e aparecerá no seu submenú.' }),
    variable), {
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
    ...items.filter((p) => p.id !== id && !p.datos.nai && !SEN_FILLAS.includes(p.id) && !LEGAIS.includes(p.id)).map((p) => ({ valor: p.id, texto: p.datos.titulo }))];
  const tenFillas = items.some((p) => p.datos.nai === id);
  editorVista(main, {
    coleccion: 'paxinas_libres', id, d, item: it,
    titulo: (x) => x.titulo,
    volver: ['#/paxinas', 'Páxinas'],
    verNaWeb: (i, x) => (x.borrador ? null : rutaDe(i, x)),
    naiTitulo: (x) => items.find((p) => p.id === x.nai)?.datos.titulo ?? '',
    modelos: modelosSeccion(),
    conBorrador: !fixa,
    pestanaAxustes: 'Páxina',
    axustes: (x) => axustesPaxina(x, { id, fixa, nais, tenFillas }),
  });
}

function axustesPaxina(d, { id, fixa, nais, tenFillas }) {
  if (!d.cabeceira) d.cabeceira = { datas: [] };
  const cab = d.cabeceira;
  return [
    c.bloque('Datos da páxina', null,
      c.texto(d, 'titulo', 'Título da páxina', { obrig: true, axuda: 'Sae na pestana do navegador, nos menús e nas tarxetas.' }),
      fixa || tenFillas
        ? el('div', { class: 'campo' }, el('label', {}, 'Enderezo'), el('input', { type: 'text', value: rutaDe(id, d), disabled: true }), el('div', { class: 'axuda' }, fixa ? 'Páxina fixa da web.' : 'Ten subpáxinas, así que vai na raíz.'))
        : c.escolla(d, 'nai', 'Dentro de', nais, { axuda: `Enderezo: ${rutaDe(id, d)}` }),
      c.area(d, 'descricion', 'Descrición', { filas: 2, axuda: 'Para buscadores e redes; tamén sae nas tarxetas de subpáxinas.' }),
      c.imaxe(d, 'imaxe', 'Imaxe para compartir en redes (opcional)')),
    c.bloque('Cabeceira sinxela', 'Só se ve se a primeira sección non é unha «Portada». Os textos tamén se poden escribir directamente na vista previa.',
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
