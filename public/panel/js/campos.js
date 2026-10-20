// Campos de formulario reutilizables. Todos len e escriben directamente no obxecto `d` (os datos que se editan).
import { aviso, coleccion, el, mediaUrl, modal } from './nucleo.js';
import { conProgreso, escollerDaBiblioteca, subirFicheiro, subirImaxe, zonaSoltar } from './imaxes.js';

const campoBase = (etiqueta, control, { axuda, obrig, id } = {}) =>
  el('div', { class: 'campo' },
    etiqueta ? el('label', { for: id }, etiqueta, obrig ? el('span', { class: 'obrig' }, ' *') : null) : null,
    control,
    axuda ? el('div', { class: 'axuda' }, axuda) : null);

let contador = 0;
const novoId = () => `c${++contador}`;

/** Texto dunha liña (tipo: text, email, url, number, date, password) */
export function texto(d, clave, etiqueta, { tipo = 'text', axuda, obrig, placeholder, max, bloqueado, aoCambiar } = {}) {
  const id = novoId();
  const i = el('input', {
    id, type: tipo, value: d[clave] ?? '', placeholder, maxlength: max, readOnly: bloqueado,
    oninput: () => { d[clave] = tipo === 'number' ? (i.value === '' ? undefined : Number(i.value)) : i.value; aoCambiar?.(i.value); },
  });
  const c = campoBase(etiqueta, i, { axuda, obrig, id });
  if (bloqueado) c.classList.add('bloqueado');
  return c;
}

/** Texto de varias liñas */
export function area(d, clave, etiqueta, { axuda, obrig, filas = 3, placeholder } = {}) {
  const id = novoId();
  const t = el('textarea', { id, rows: filas, placeholder, oninput: () => { d[clave] = t.value; } });
  t.value = d[clave] ?? '';
  return campoBase(etiqueta, t, { axuda, obrig, id });
}

/** Despregable. opcions: [{valor, texto}] */
export function escolla(d, clave, etiqueta, opcions, { axuda, obrig, baleiro, aoCambiar } = {}) {
  const id = novoId();
  const s = el('select', { id, onchange: () => { d[clave] = s.value || undefined; aoCambiar?.(s.value); } },
    baleiro !== undefined ? el('option', { value: '' }, baleiro) : null,
    opcions.map((o) => el('option', { value: o.valor, selected: String(d[clave] ?? '') === String(o.valor) }, o.texto)));
  return campoBase(etiqueta, s, { axuda, obrig, id });
}

/** Caixa de verificación */
export function marca(d, clave, etiqueta, { axuda } = {}) {
  const c = el('input', { type: 'checkbox', checked: Boolean(d[clave]), onchange: () => { d[clave] = c.checked; } });
  return el('div', { class: 'campo' }, el('label', { class: 'check' }, c, etiqueta), axuda ? el('div', { class: 'axuda' }, axuda) : null);
}

/** Fieldset con título e axuda opcional */
export const bloque = (titulo, axuda, ...fillos) => el('fieldset', {}, el('legend', {}, titulo), axuda ? el('p', { class: 'axuda-bloque' }, axuda) : null, ...fillos);

// ── Chips arrastrables (para listas de textos e de entidades) ──
function chipsOrdenables(cont, lista, pintar) {
  let orixe = null;
  cont.querySelectorAll('.chip').forEach((ch, i) => {
    ch.draggable = true;
    ch.classList.add('arrastrable');
    ch.addEventListener('dragstart', () => { orixe = i; });
    ch.addEventListener('dragover', (e) => e.preventDefault());
    ch.addEventListener('drop', (e) => {
      e.preventDefault();
      if (orixe === null || orixe === i) return;
      const [x] = lista.splice(orixe, 1);
      lista.splice(i, 0, x);
      pintar();
    });
  });
}

/** Lista de textos curtos (fitos, temas, centros…): escribir + Intro para engadir */
export function listaTextos(d, clave, etiqueta, { axuda, placeholder = 'Escribe e preme Intro' } = {}) {
  if (!Array.isArray(d[clave])) d[clave] = [];
  const lista = d[clave];
  const cont = el('div', { class: 'chips' });
  const entrada = el('input', { type: 'text', placeholder });
  const engadir = () => {
    const v = entrada.value.trim();
    if (v) { lista.push(v); entrada.value = ''; pintar(); entrada.focus(); }
  };
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); engadir(); }
    if (e.key === 'Backspace' && !entrada.value && lista.length) { lista.pop(); pintar(); entrada.focus(); }
  });
  entrada.addEventListener('blur', engadir);
  function pintar() {
    cont.replaceChildren(...lista.map((t, i) => el('span', { class: 'chip' }, t, el('button', { type: 'button', title: 'Quitar', onclick: () => { lista.splice(i, 1); pintar(); } }, '×'))), entrada);
    chipsOrdenables(cont, lista, pintar);
  }
  pintar();
  return campoBase(etiqueta, cont, { axuda: axuda ?? 'Arrastra para cambiar a orde.' });
}

/** Selector de elementos doutra colección (entidades, recursos…); garda a lista de ids en orde */
export function refs(d, clave, etiqueta, { colec, nomeDe = (x) => x.datos.nome ?? x.datos.titulo ?? x.id, engadir = '+ Engadir…', axuda } = {}) {
  if (!Array.isArray(d[clave])) d[clave] = [];
  const lista = d[clave];
  const cont = el('div', { class: 'chips' });
  const sel = el('select', { style: { border: '0', flex: '1', minWidth: '180px', font: '.92rem var(--sans)', background: 'transparent' } });
  let todas = [];
  const nome = (id) => { const x = todas.find((e) => e.id === id); return x ? nomeDe(x) : id; };
  function pintar() {
    sel.replaceChildren(el('option', { value: '' }, engadir),
      todas.filter((e) => !lista.includes(e.id)).sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), 'gl')).map((e) => el('option', { value: e.id }, nomeDe(e))));
    cont.replaceChildren(...lista.map((id, i) => el('span', { class: 'chip' }, nome(id), el('button', { type: 'button', title: 'Quitar', onclick: () => { lista.splice(i, 1); pintar(); } }, '×'))), sel);
    chipsOrdenables(cont, lista, pintar);
  }
  sel.addEventListener('change', () => { if (sel.value) { lista.push(sel.value); pintar(); } });
  coleccion(colec).then((e) => { todas = e; pintar(); });
  pintar();
  return campoBase(etiqueta, cont, { axuda: axuda ?? 'Arrastra para cambiar a orde.' });
}

/** Selector de entidades (logos) con busca; garda a lista de ids en orde */
export const entidades = (d, clave, etiqueta, { axuda } = {}) =>
  refs(d, clave, etiqueta, { colec: 'entidades', engadir: '+ Engadir entidade…', axuda: axuda ?? 'Arrastra para cambiar a orde. As entidades novas créanse en «Entidades e logos».' });

/** Despregable cos elementos doutra colección (unha soa escolla) */
export function refUnica(d, clave, etiqueta, { colec, nomeDe = (x) => x.datos.titulo ?? x.datos.nomeCurto ?? x.datos.nome ?? x.id, baleiro = '— Ningún —', obrig, axuda, ordenar } = {}) {
  const cont = el('div');
  coleccion(colec).then((xs) => {
    const lista = ordenar ? [...xs].sort(ordenar) : xs;
    cont.replaceChildren(escolla(d, clave, etiqueta, lista.map((x) => ({ valor: x.id, texto: nomeDe(x) })), { baleiro: obrig ? undefined : baleiro, obrig, axuda }));
    if (obrig && !d[clave] && lista.length) d[clave] = lista[0].id;
  });
  return cont;
}

/**
 * Repetidor: lista de elementos editables (cifras, programa, vídeos…).
 * pintarItem(item) devolve os campos do elemento; novo() crea un baleiro.
 */
export function repetidor(d, clave, etiqueta, { novo, pintarItem, engadirTexto = '+ Engadir', axuda } = {}) {
  if (!Array.isArray(d[clave])) d[clave] = [];
  const lista = d[clave];
  const cont = el('div', { class: 'rep' });
  function pintar() {
    cont.replaceChildren(...lista.map((item, i) =>
      el('div', { class: 'rep-item' },
        el('div', { class: 'grow' }, pintarItem(item, i)),
        el('div', { class: 'rep-ctrl' },
          el('button', { type: 'button', class: 'icobtn', title: 'Subir', disabled: i === 0, onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; pintar(); } }, '↑'),
          el('button', { type: 'button', class: 'icobtn', title: 'Baixar', disabled: i === lista.length - 1, onclick: () => { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; pintar(); } }, '↓'),
          el('button', { type: 'button', class: 'icobtn perigo', title: 'Quitar', onclick: () => { lista.splice(i, 1); pintar(); } }, '×')))));
  }
  pintar();
  return el('div', { class: 'campo' },
    etiqueta ? el('div', { class: 'etiqueta' }, etiqueta) : null,
    axuda ? el('div', { class: 'axuda', style: { marginBottom: '8px' } }, axuda) : null,
    cont,
    el('button', { type: 'button', class: 'btn-mini', onclick: () => { lista.push(novo()); pintar(); } }, engadirTexto));
}

/** Imaxe única: subir (arrastrar), escoller da biblioteca ou quitar. claveAlt opcional. */
export function imaxe(d, clave, etiqueta, { claveAlt, etiquetaBib = 'xeral', logo = false, axuda } = {}) {
  const prev = el('img', { class: `imaxe-prev${logo ? ' logo' : ''}`, alt: '' });
  const ctrl = el('div', { class: 'imaxe-ctrl' });
  const altCampo = claveAlt ? texto(d, claveAlt, 'Descrición da imaxe', { axuda: 'Que se ve na foto, en poucas palabras (para persoas que usan lectores de pantalla).' }) : null;
  const quitar = el('button', { type: 'button', class: 'btn-mini', onclick: () => { d[clave] = undefined; pintar(); } }, 'Quitar');
  const zona = zonaSoltar({
    texto: 'Arrastra unha imaxe ou',
    aoSoltar: async ([f]) => {
      const item = await conProgreso(ctrl, 'Optimizando e subindo…', () => subirImaxe(f, { etiqueta: etiquetaBib, logo, alt: claveAlt ? d[claveAlt] ?? '' : '' }));
      if (item) { d[clave] = item.id; pintar(); aviso('Imaxe subida'); }
    },
  });
  const bib = el('button', { type: 'button', class: 'btn-mini', onclick: async () => { const m = await escollerDaBiblioteca({ etiqueta: etiquetaBib }); if (m) { d[clave] = m.id; if (claveAlt && !d[claveAlt] && m.alt) d[claveAlt] = m.alt; pintar(); } } }, 'Escoller da biblioteca');
  function pintar() {
    prev.hidden = !d[clave];
    if (d[clave]) prev.src = mediaUrl(d[clave], logo ? 'g' : 'm');
    quitar.hidden = !d[clave];
  }
  ctrl.append(zona, el('div', { class: 'imaxe-btns' }, bib, quitar));
  pintar();
  return el('div', {}, campoBase(etiqueta, el('div', { class: 'imaxe-campo' }, prev, ctrl), { axuda }), altCampo);
}

/** Galería: varias imaxes con descrición, ordenables */
export function galeria(d, clave, etiqueta, { etiquetaBib = 'edicions' } = {}) {
  if (!Array.isArray(d[clave])) d[clave] = [];
  const lista = d[clave];
  const grella = el('div', { class: 'galeria-edit' });
  const estadoSubida = el('div');
  function pintar() {
    grella.replaceChildren(...lista.map((it, i) => {
      const alt = el('input', { type: 'text', value: it.alt ?? '', placeholder: 'Descrición', oninput: () => { it.alt = alt.value; } });
      return el('div', { class: 'galeria-item' },
        el('img', { src: mediaUrl(it.imaxe, 'm'), alt: '' }),
        alt,
        el('div', { class: 'ctrl' },
          el('button', { type: 'button', class: 'icobtn', title: 'Mover á esquerda', disabled: i === 0, onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; pintar(); } }, '←'),
          el('button', { type: 'button', class: 'icobtn perigo', title: 'Quitar da galería', onclick: () => { lista.splice(i, 1); pintar(); } }, '×'),
          el('button', { type: 'button', class: 'icobtn', title: 'Mover á dereita', disabled: i === lista.length - 1, onclick: () => { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; pintar(); } }, '→')));
    }));
  }
  const zona = zonaSoltar({
    texto: 'Arrastra aquí varias fotos ou',
    multiple: true,
    aoSoltar: async (fs) => {
      for (const [n, f] of fs.entries()) {
        const item = await conProgreso(estadoSubida, `Subindo ${n + 1} de ${fs.length}…`, () => subirImaxe(f, { etiqueta: etiquetaBib }));
        if (item) { lista.push({ imaxe: item.id, alt: '' }); pintar(); }
      }
    },
  });
  const bib = el('button', { type: 'button', class: 'btn-mini', onclick: async () => { const m = await escollerDaBiblioteca({ etiqueta: etiquetaBib }); if (m) { lista.push({ imaxe: m.id, alt: m.alt || '' }); pintar(); } } }, 'Engadir da biblioteca');
  pintar();
  return el('div', { class: 'campo' }, el('div', { class: 'etiqueta' }, etiqueta), grella, zona, el('div', { style: { marginTop: '8px' } }, bib), estadoSubida);
}

/** Ficheiro (PDF) ou ligazón: para documentos e recursos */
export function ficheiro(d, clave, etiqueta, { axuda } = {}) {
  const info = el('span', { class: 'muted' });
  const cont = el('div', { class: 'imaxe-ctrl' });
  const quitar = el('button', { type: 'button', class: 'btn-mini', onclick: () => { d[clave] = undefined; pintar(); } }, 'Quitar');
  function pintar() {
    info.replaceChildren(d[clave] ? el('a', { href: mediaUrl(d[clave], 'f'), target: '_blank' }, 'Ver o PDF subido ↗') : 'Sen ficheiro');
    quitar.hidden = !d[clave];
  }
  cont.append(
    zonaSoltar({
      texto: 'Arrastra un PDF ou',
      aceptar: 'application/pdf',
      aoSoltar: async ([f]) => {
        const item = await conProgreso(cont, 'Subindo…', () => subirFicheiro(f));
        if (item) { d[clave] = item.id; pintar(); aviso('Ficheiro subido'); }
      },
    }),
    el('div', { class: 'imaxe-btns' }, info,
      el('button', { type: 'button', class: 'btn-mini', onclick: async () => { const m = await escollerDaBiblioteca({ tipo: 'ficheiro' }); if (m) { d[clave] = m.id; pintar(); } } }, 'Escoller da biblioteca'),
      quitar));
  pintar();
  return campoBase(etiqueta, cont, { axuda });
}

/** Editor de texto enriquecido (negriña, cursiva, títulos, listas, ligazóns, imaxes) */
export function rico(d, clave, etiqueta, { axuda, placeholder = 'Escribe aquí…' } = {}) {
  const area = el('div', { class: 'rte-area', contentEditable: 'true', 'data-placeholder': placeholder, role: 'textbox', 'aria-multiline': 'true' });
  area.innerHTML = d[clave] ?? '';
  const gardar = () => { d[clave] = area.innerHTML.replace(/^(<br>|\s)+$/, ''); };
  area.addEventListener('input', gardar);
  // Pegar sempre como texto limpo (mantendo parágrafos)
  area.addEventListener('paste', (e) => {
    e.preventDefault();
    const txt = e.clipboardData.getData('text/plain');
    const html = txt.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('');
    document.execCommand('insertHTML', false, html);
    gardar();
  });
  if (!area.innerHTML.trim()) area.innerHTML = '';
  const cmd = (c, v) => () => { area.focus(); document.execCommand(c, false, v); gardar(); };
  const bloque = (tag) => () => { area.focus(); document.execCommand('formatBlock', false, tag); gardar(); };
  const ligazon = () => {
    const sel = window.getSelection();
    const rango = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const datos = { url: 'https://' };
    const m = modal('Engadir ligazón', texto(datos, 'url', 'Enderezo', { tipo: 'url', axuda: 'Comeza por https:// (ou / para páxinas desta web).' }), {
      botons: [el('button', { class: 'btn-ghost', type: 'button', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { class: 'btn', type: 'button', onclick: () => {
          m.pechar();
          if (!/^(https?:\/\/|mailto:|\/)/.test(datos.url.trim())) return aviso('O enderezo debe comezar por https://, mailto: ou /', true);
          area.focus();
          if (rango) { sel.removeAllRanges(); sel.addRange(rango); }
          if (rango && !rango.collapsed) document.execCommand('createLink', false, datos.url.trim());
          else document.execCommand('insertHTML', false, `<a href="${datos.url.trim().replace(/"/g, '&quot;')}">${datos.url.trim().replace(/</g, '&lt;')}</a>`);
          gardar();
        } }, 'Engadir')],
    });
  };
  const inserirImaxe = async () => {
    const sel = window.getSelection();
    const rango = sel && sel.rangeCount && area.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    const m = await escollerDaBiblioteca({ etiqueta: 'noticias' });
    if (!m) return;
    area.focus();
    if (rango) { sel.removeAllRanges(); sel.addRange(rango); }
    document.execCommand('insertHTML', false, `<img src="${mediaUrl(m.id, 'g')}" alt="${(m.alt || '').replace(/"/g, '&quot;')}">`);
    gardar();
  };
  const b = (txt, titulo, fn) => el('button', { type: 'button', title: titulo, onmousedown: (e) => e.preventDefault(), onclick: fn }, txt);
  const barra = el('div', { class: 'rte-barra' },
    b('B', 'Negriña', cmd('bold')), b('I', 'Cursiva', cmd('italic')),
    el('span', { class: 'sep' }),
    b('Título', 'Título de sección', bloque('h2')), b('Subtítulo', 'Subtítulo', bloque('h3')), b('¶', 'Parágrafo normal', bloque('p')),
    el('span', { class: 'sep' }),
    b('• Lista', 'Lista', cmd('insertUnorderedList')), b('1. Lista', 'Lista numerada', cmd('insertOrderedList')), b('❝', 'Cita', bloque('blockquote')),
    el('span', { class: 'sep' }),
    b('🔗', 'Engadir ligazón (selecciona antes o texto)', ligazon), b('Sen ligazón', 'Quitar ligazón', cmd('unlink')), b('🖼', 'Inserir imaxe da biblioteca', inserirImaxe),
    el('span', { class: 'sep' }),
    b('Limpar', 'Quitar formato do texto seleccionado', cmd('removeFormat')));
  return campoBase(etiqueta, el('div', { class: 'rte' }, barra, area), { axuda });
}
