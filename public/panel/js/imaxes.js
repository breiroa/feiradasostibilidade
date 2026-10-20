// Subida de imaxes e ficheiros. As imaxes optimízanse NO NAVEGADOR antes de subir
// (WebP, tamaño grande ≤1600 px e miniatura ≤640 px), así a web vai lixeira e non gasta servidor.
import { api, aviso, el, mediaUrl, modal } from './nucleo.js';

const TIPOS_IMAXE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];

async function aWebp(bitmap, maxLado, calidade) {
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));
  const lenzo = document.createElement('canvas');
  lenzo.width = w;
  lenzo.height = h;
  const ctx = lenzo.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((ok) => lenzo.toBlob(ok, 'image/webp', calidade));
  if (!blob || blob.type !== 'image/webp') throw new Error('O navegador non puido converter a imaxe. Proba con Chrome, Edge ou Firefox actualizados.');
  return { blob, w, h };
}

/** Optimiza unha imaxe. Os logos gárdanse só nun tamaño e con máis calidade (mantén a transparencia). */
export async function optimizar(ficheiro, { logo = false } = {}) {
  if (!TIPOS_IMAXE.includes(ficheiro.type) && !/\.(jpe?g|png|webp|gif|avif)$/i.test(ficheiro.name)) {
    throw new Error('Ese ficheiro non é unha imaxe compatible (JPG, PNG, WebP).');
  }
  const bitmap = await createImageBitmap(ficheiro, { imageOrientation: 'from-image' });
  const g = await aWebp(bitmap, logo ? 800 : 1600, logo ? 0.92 : 0.82);
  const m = logo ? null : await aWebp(bitmap, 640, 0.78);
  bitmap.close?.();
  return { g: g.blob, m: m?.blob ?? null, ancho: g.w, alto: g.h };
}

/** Optimiza e sube unha imaxe. Devolve o elemento da biblioteca. */
export async function subirImaxe(ficheiro, { etiqueta = 'xeral', alt = '', logo = false } = {}) {
  const o = await optimizar(ficheiro, { logo });
  const f = new FormData();
  f.append('g', o.g, 'g.webp');
  if (o.m) f.append('m', o.m, 'm.webp');
  f.append('nome', ficheiro.name);
  f.append('alt', alt);
  f.append('etiqueta', etiqueta);
  f.append('ancho', String(o.ancho));
  f.append('alto', String(o.alto));
  return (await api('media', { metodo: 'POST', form: f })).item;
}

/** Sube un PDF tal cal */
export async function subirFicheiro(ficheiro, { etiqueta = 'documentos' } = {}) {
  if (ficheiro.type !== 'application/pdf' && !/\.pdf$/i.test(ficheiro.name)) throw new Error('De momento só se poden subir PDF.');
  if (ficheiro.size > 20 * 1024 * 1024) throw new Error('O PDF supera os 20 MB. Comprímeo ou enlázao desde outro sitio.');
  const f = new FormData();
  f.append('f', ficheiro, ficheiro.name);
  f.append('nome', ficheiro.name);
  f.append('etiqueta', etiqueta);
  return (await api('media', { metodo: 'POST', form: f })).item;
}

/** Zona para arrastrar e soltar ficheiros (ou premer para escoller) */
export function zonaSoltar({ texto = 'Arrastra aquí imaxes ou', multiple = false, aceptar = 'image/*', aoSoltar }) {
  const input = el('input', { type: 'file', accept: aceptar, multiple, hidden: true, onchange: () => { if (input.files.length) aoSoltar([...input.files]); input.value = ''; } });
  const z = el(
    'div',
    { class: 'zona-soltar' },
    el('span', { class: 'txt' }, texto),
    el('button', { type: 'button', class: 'btn-mini', onclick: () => input.click() }, multiple ? 'escoller ficheiros' : 'escoller ficheiro'),
    input,
  );
  z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('encima'); });
  z.addEventListener('dragleave', () => z.classList.remove('encima'));
  z.addEventListener('drop', (e) => {
    e.preventDefault();
    z.classList.remove('encima');
    const fs = [...(e.dataTransfer?.files ?? [])];
    if (fs.length) aoSoltar(multiple ? fs : fs.slice(0, 1));
  });
  return z;
}

/** Selector da biblioteca: resolve co elemento escollido (ou null) */
export async function escollerDaBiblioteca({ tipo = 'imaxe', etiqueta } = {}) {
  const { items } = await api('media');
  const lista = items.filter((m) => (tipo === 'imaxe' ? m.tipo.startsWith('image/') : !m.tipo.startsWith('image/')));
  return new Promise((ok) => {
    let escollido = null;
    let filtro = etiqueta && lista.some((m) => m.etiqueta === etiqueta) ? etiqueta : 'todas';
    const grella = el('div', { class: 'escoller-grella' });
    const etiquetas = ['todas', ...new Set(lista.map((m) => m.etiqueta))];
    const chips = el('div', { class: 'filtro-chips' });
    const pintar = () => {
      chips.replaceChildren(...etiquetas.map((t) => el('button', { type: 'button', class: t === filtro ? 'on' : '', onclick: () => { filtro = t; pintar(); } }, t)));
      const vistos = lista.filter((m) => filtro === 'todas' || m.etiqueta === filtro);
      grella.replaceChildren(
        ...(vistos.length
          ? vistos.map((m) =>
              el('button', { type: 'button', title: m.nome, onclick: () => { escollido = m; md.pechar(); } },
                tipo === 'imaxe' ? el('img', { src: mediaUrl(m.id, m.variantes.includes('m') ? 'm' : 'g'), alt: m.alt || '' }) : el('div', { class: 'bib-thumb doc' }, 'PDF'),
                el('span', {}, m.nome)))
          : [el('p', { class: 'muted' }, 'Non hai nada aquí aínda.')]),
      );
    };
    pintar();
    const md = modal(tipo === 'imaxe' ? 'Escoller imaxe da biblioteca' : 'Escoller ficheiro da biblioteca', el('div', {}, chips, grella), { ancho: true, aoPechar: () => ok(escollido) });
  });
}

/** Mostra o progreso dunha subida nun elemento */
export async function conProgreso(destino, texto, fn) {
  const s = el('span', { class: 'subindo' }, texto);
  destino.append(s);
  try {
    return await fn();
  } catch (e) {
    aviso(e.erros ? e.erros[0] : e.message, true);
    return null;
  } finally {
    s.remove();
  }
}
