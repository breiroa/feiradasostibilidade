// Núcleo do panel: creación de elementos, chamadas á API, avisos, modais e estado de gardado.

export const estado = { csrf: '', admin: null };

// No panel compóñense vistas con elementos opcionais (cond ? el(...) : null).
// replaceChildren/append converterían null en texto "null": aquí ignóranse os baleiros.
for (const metodo of ['replaceChildren', 'append']) {
  const orixinal = Element.prototype[metodo];
  Element.prototype[metodo] = function (...nodos) {
    return orixinal.apply(this, nodos.flat(Infinity).filter((n) => n !== null && n !== undefined && n !== false));
  };
}

/** Crea un elemento: el('div', {class: 'x', onclick: fn}, ...fillos) */
export function el(tag, attrs = {}, ...fillos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of fillos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

export class ErroApi extends Error {
  constructor(erros, status) {
    super(erros.join(' '));
    this.erros = erros;
    this.status = status;
  }
}

/** Chamada á API do panel. Lanza ErroApi cos erros do servidor. */
export async function api(ruta, { metodo = 'GET', datos, form } = {}) {
  const opcions = { method: metodo, headers: {}, credentials: 'same-origin' };
  if (metodo !== 'GET') opcions.headers['X-CSRF'] = estado.csrf;
  if (form) opcions.body = form;
  else if (datos !== undefined) {
    opcions.headers['Content-Type'] = 'application/json';
    opcions.body = JSON.stringify(datos);
  }
  let r;
  try {
    r = await fetch(`/api/panel/${ruta}`, opcions);
  } catch {
    throw new ErroApi(['Non hai conexión co servidor.'], 0);
  }
  let corpo = {};
  try {
    corpo = await r.json();
  } catch { /* resposta baleira */ }
  if (r.status === 401 && ruta !== 'auth') {
    aviso('A sesión caducou. Volve entrar.', true);
    setTimeout(() => location.reload(), 1200);
  }
  if (!r.ok || corpo.ok === false) throw new ErroApi(corpo.erros || [`Erro ${r.status}`], r.status);
  return corpo;
}

/** Aviso breve na parte inferior */
export function aviso(texto, erro = false) {
  document.querySelector('.toast')?.remove();
  const t = el('div', { class: `toast${erro ? ' erro' : ''}`, role: 'status' }, texto);
  document.body.append(t);
  setTimeout(() => t.remove(), erro ? 5000 : 2200);
}

/** Indicador de gardado na barra superior */
export function gardado(e) {
  const s = document.querySelector('.estado-gardado');
  if (!s) return;
  const textos = { gardando: 'Gardando…', ok: '✓ Todo gardado', erro: 'Non se puido gardar' };
  s.className = `estado-gardado ${e}`;
  s.textContent = textos[e] ?? '';
}

/** Executa unha acción que garda, mostrando o estado e os erros */
export async function gardar(fn, { mensaxe = 'Gardado' } = {}) {
  gardado('gardando');
  try {
    const r = await fn();
    gardado('ok');
    if (mensaxe) aviso(mensaxe);
    return r;
  } catch (e) {
    gardado('erro');
    aviso(e.erros ? e.erros[0] : 'Erro ao gardar', true);
    throw e;
  }
}

/** Ventá modal. Devolve {pechar, dialog}. */
export function modal(titulo, corpo, { botons = [], ancho = false, aoPechar } = {}) {
  const d = el('dialog', { class: `modal${ancho ? ' ancho' : ''}` });
  const pechar = () => {
    d.close();
    d.remove();
    aoPechar?.();
  };
  d.append(
    el('div', { class: 'modal-cab' }, el('h2', {}, titulo), el('button', { class: 'modal-x', type: 'button', 'aria-label': 'Pechar', onclick: pechar }, '×')),
    el('div', { class: 'modal-corpo' }, corpo),
    botons.length ? el('div', { class: 'modal-pe' }, botons) : null,
  );
  d.addEventListener('cancel', (ev) => {
    ev.preventDefault();
    pechar();
  });
  document.body.append(d);
  d.showModal();
  return { pechar, dialog: d };
}

/** Pregunta de confirmación. Resolve true/false. */
export function confirmar(texto, { boton = 'Si, borrar', perigo = true, detalle } = {}) {
  return new Promise((ok) => {
    let resposta = false;
    const m = modal('Confirmar', el('div', {}, el('p', {}, texto), detalle ? el('p', { class: 'muted' }, detalle) : null), {
      aoPechar: () => ok(resposta),
      botons: [
        el('button', { class: 'btn-ghost', type: 'button', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { class: perigo ? 'btn-danger' : 'btn', type: 'button', onclick: () => { resposta = true; m.pechar(); } }, boton),
      ],
    });
  });
}

/** Caixa de erros dun formulario */
export function caixaErros(erros) {
  if (!erros?.length) return el('div', { hidden: true });
  return el('div', { class: 'errbox', role: 'alert' }, el('strong', {}, 'Revisa estes datos:'), el('ul', {}, erros.map((e) => el('li', {}, e))));
}

export const slug = (t) =>
  (t || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

const meses = ['xan', 'feb', 'mar', 'abr', 'mai', 'xuñ', 'xul', 'ago', 'set', 'out', 'nov', 'dec'];
/** "2026-10-20" ou "2026-10-20 16:11:13" → "20 out 2026" */
export function dataCurta(s) {
  if (!s) return '';
  const [a, m, d] = s.slice(0, 10).split('-').map(Number);
  return `${d} ${meses[m - 1]} ${a}`;
}

export const mediaUrl = (id, v = 'g') => `/media/${id}/${v}`;

/** Copia texto ao portapapeis */
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    aviso('Copiado');
  } catch {
    aviso('Non se puido copiar: selecciona e copia a man.', true);
  }
}

/** Cache simple das coleccións para os selectores (entidades, edicións…) */
const cache = new Map();
export async function coleccion(nome, { forzar = false } = {}) {
  if (!forzar && cache.has(nome)) return cache.get(nome);
  const r = await api(`documentos?coleccion=${nome}`);
  cache.set(nome, r.items);
  return r.items;
}
export const invalidar = (nome) => cache.delete(nome);
