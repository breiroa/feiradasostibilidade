// Vista xenérica "lista + editor" para as coleccións de contido.
import { api, caixaErros, coleccion, confirmar, el, gardar, invalidar } from './nucleo.js';

export const sucio = { valor: false };

/**
 * config = {
 *   coleccion, titulo, intro, singular, novoTexto,
 *   columnas: [{titulo, valor: (item) => Node|string, clase}],
 *   filtrar?: (items, filtros) => items, filtros?: (estado, repintar) => Node,
 *   ordenable?: bool, novo: () => datos, editor: (d, {id, novo}) => Node[], titular: (d) => string,
 *   verNaWeb?: (id, d) => url, idEditable?: bool
 * }
 */
export async function vistaLista(main, config) {
  const items = await coleccion(config.coleccion, { forzar: true });
  const filtros = {};
  const corpoTaboa = el('tbody');
  const taboa = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {}, config.columnas.map((c) => el('th', {}, c.titulo)), el('th', {}))),
    corpoTaboa);

  function pintar() {
    const vistos = config.filtrar ? config.filtrar(items, filtros) : items;
    if (!vistos.length) {
      corpoTaboa.replaceChildren(el('tr', {}, el('td', { colspan: config.columnas.length + 1, class: 'muted' }, items.length ? 'Ningún elemento coincide cos filtros.' : 'Aínda non hai nada. Preme «' + config.novoTexto + '».')));
      return;
    }
    corpoTaboa.replaceChildren(...vistos.map((it) => {
      const i = items.indexOf(it);
      const abrir = () => { location.hash = `#/${config.coleccion}/${encodeURIComponent(it.id)}`; };
      const tr = el('tr', { class: 'clicable' },
        config.columnas.map((c) => el('td', { class: c.clase }, c.valor(it))),
        el('td', {}, el('div', { class: 'accions' },
          config.ordenable ? [
            el('button', { class: 'icobtn', title: 'Subir', disabled: i === 0 || vistos.length !== items.length, onclick: (e) => { e.stopPropagation(); mover(i, -1); } }, '↑'),
            el('button', { class: 'icobtn', title: 'Baixar', disabled: i === items.length - 1 || vistos.length !== items.length, onclick: (e) => { e.stopPropagation(); mover(i, 1); } }, '↓'),
          ] : null,
          el('button', { class: 'icobtn', title: 'Editar', onclick: (e) => { e.stopPropagation(); abrir(); } }, '✎'),
          el('button', { class: 'icobtn perigo', title: 'Borrar', onclick: (e) => { e.stopPropagation(); borrar(it); } }, '🗑'))));
      tr.addEventListener('click', abrir);
      return tr;
    }));
  }

  async function mover(i, delta) {
    const j = i + delta;
    [items[i], items[j]] = [items[j], items[i]];
    pintar();
    await gardar(() => api('documentos', { metodo: 'PATCH', datos: { coleccion: config.coleccion, ids: items.map((x) => x.id) } }), { mensaxe: 'Orde gardada' });
    invalidar(config.coleccion);
  }

  async function borrar(it) {
    if (!(await confirmar(`Borrar «${config.titular(it.datos)}»?`, { detalle: 'Non se pode desfacer.' }))) return;
    await gardar(() => api('documentos', { metodo: 'DELETE', datos: { coleccion: config.coleccion, id: it.id } }), { mensaxe: 'Borrado' });
    items.splice(items.indexOf(it), 1);
    invalidar(config.coleccion);
    pintar();
  }

  main.replaceChildren(
    el('div', { class: 'cab' },
      el('div', {}, el('h1', {}, config.titulo), config.intro ? el('p', { class: 'muted' }, config.intro) : null),
      el('a', { class: 'btn', href: `#/${config.coleccion}/novo` }, `+ ${config.novoTexto}`)),
    config.filtros ? el('div', { class: 'barra-filtros' }, config.filtros(filtros, pintar, items)) : null,
    el('div', { class: 'tbl-wrap' }, taboa),
  );
  pintar();
}

export async function vistaEditor(main, config, id) {
  const novo = id === 'novo';
  let datos;
  if (novo) datos = config.novo();
  else {
    const items = await coleccion(config.coleccion, { forzar: true });
    const it = items.find((x) => x.id === id);
    if (!it) {
      main.replaceChildren(el('a', { class: 'volver', href: `#/${config.coleccion}` }, '← Volver'), el('div', { class: 'baleiro' }, 'Non se atopou este elemento. Quizais se borrou.'));
      return;
    }
    datos = structuredClone(it.datos);
  }
  const d = datos;
  const erros = el('div');
  const idCampo = { id: '' };
  const formulario = el('form', {
    novalidate: true,
    onsubmit: (e) => e.preventDefault(),
    oninput: () => { sucio.valor = true; },
    onchange: () => { sucio.valor = true; },
  });

  async function enviar() {
    erros.replaceChildren();
    try {
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: config.coleccion, id: novo ? idCampo.id : id, novo, datos: d } }));
      sucio.valor = false;
      invalidar(config.coleccion);
      if (novo) location.hash = `#/${config.coleccion}/${encodeURIComponent(r.id)}`;
      else {
        const t = main.querySelector('h1');
        if (t) t.textContent = config.titular(d) || config.singular;
      }
    } catch (e) {
      if (e.erros) erros.replaceChildren(caixaErros(e.erros));
      erros.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const ver = !novo && config.verNaWeb ? config.verNaWeb(id, d) : null;
  formulario.append(
    ...config.editor(d, { id, novo, idCampo }),
    el('div', { class: 'accions-form' },
      el('button', { class: 'btn', type: 'button', onclick: enviar }, novo ? 'Crear' : 'Gardar cambios'),
      el('a', { class: 'btn-ghost', href: `#/${config.coleccion}` }, 'Volver á lista'),
      el('span', { class: 'espazo' }),
      ver ? el('a', { class: 'btn-ghost', href: ver, target: '_blank' }, 'Ver na web ↗') : null),
  );
  main.replaceChildren(
    el('a', { class: 'volver', href: `#/${config.coleccion}` }, `← ${config.titulo}`),
    el('div', { class: 'cab' }, el('h1', {}, novo ? `${config.novoTexto}` : config.titular(d) || config.singular)),
    erros,
    formulario,
  );
  sucio.valor = false;
}
