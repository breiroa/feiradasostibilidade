// «Identidade visual»: cores, logo, nome e tipografía de toda a web, con vista previa ao momento.
// Só para superadministración. Cada cor ten «De serie» para volver á orixinal.
import { api, caixaErros, coleccion, el, estado, gardar, invalidar } from './nucleo.js';
import { sucio } from './coleccions.js';
import * as c from './campos.js';

const SERIE = { principal: '#3c783c', secundaria: '#64508c', escura: '#1a1428', realce: '#8fb88f', crema: '#f7f4ee', fondo: '#f5f4f7' };
const CORES = [
  ['principal', 'Cor principal', 'Botóns, ligazóns, cifras e destacados.'],
  ['secundaria', 'Cor secundaria', 'Etiquetas, detalles e degradados.'],
  ['escura', 'Cor escura', 'Cabeceira, pé, portadas e títulos.'],
  ['realce', 'Realce sobre escuro', 'A palabra destacada do nome e os títulos sobre fondo escuro.'],
  ['crema', 'Fondo cálido', 'Seccións de fondo crema e a franxa clara do pé.'],
  ['fondo', 'Fondo da web', 'O fondo xeral das páxinas.'],
];
const PALETAS = [
  ['De serie', {}],
  ['Bosque', { principal: '#2f6b3a', secundaria: '#8a5a2b', escura: '#14231a', realce: '#9cc98a', crema: '#f6f1e6' }],
  ['Océano', { principal: '#1f6f8b', secundaria: '#5a4fa0', escura: '#0f1d2b', realce: '#86c5da', crema: '#eef5f7', fondo: '#f3f6f8' }],
  ['Terra', { principal: '#a0522d', secundaria: '#556b2f', escura: '#2a1a12', realce: '#e3a87a', crema: '#f8efe4' }],
];

export async function identidade(main) {
  const [docs, paxs] = await Promise.all([coleccion('identidade', { forzar: true }), coleccion('paxinas_libres')]);
  const item = docs.find((x) => x.id === 'xeral');
  const d = structuredClone(item?.datos ?? {});
  d.cores ??= {};
  d.titulos ??= 'playfair';
  let actualizado = item?.actualizado;
  let gardadoJSON = JSON.stringify(d);
  const erros = el('div');
  const bGardar = el('button', { type: 'button', class: 'btn btn-peq', onclick: () => gardarTodo() }, 'Gardar');
  const marcar = () => { sucio.valor = JSON.stringify(d) !== gardadoJSON; bGardar.classList.toggle('pendente', sucio.valor); programar(); };

  // ── Cores ──
  const filaCor = ([k, nome, axuda]) => {
    const entrada = el('input', { type: 'color', value: d.cores[k] ?? SERIE[k], 'aria-label': nome, oninput: (e) => { d.cores[k] = e.target.value; txt.value = e.target.value; marcar(); } });
    const txt = el('input', { type: 'text', class: 'cor-hex', value: d.cores[k] ?? SERIE[k], maxLength: 7, 'aria-label': `${nome} (código)`, oninput: (e) => {
      const v = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { d.cores[k] = v.toLowerCase(); entrada.value = d.cores[k]; marcar(); }
    } });
    const serie = el('button', { type: 'button', class: 'btn-mini', title: 'Volver á cor orixinal', onclick: () => { delete d.cores[k]; entrada.value = txt.value = SERIE[k]; marcar(); } }, 'De serie');
    return el('div', { class: 'cor-fila' }, entrada, el('div', { class: 'cor-texto' }, el('b', {}, nome), el('small', {}, axuda)), txt, serie);
  };
  const cores = el('div', { class: 'cores' });
  const pintarCores = () => cores.replaceChildren(...CORES.map(filaCor));
  pintarCores();
  const paletas = el('div', { class: 'chips' }, PALETAS.map(([nome, p]) => el('button', { type: 'button', class: 'chip paleta', onclick: () => { d.cores = { ...p }; pintarCores(); marcar(); } },
    el('span', { class: 'paleta-mostra' }, ['principal', 'secundaria', 'escura', 'crema'].map((k) => el('i', { style: { background: p[k] ?? SERIE[k] } }))), nome)));

  // ── Vista previa ──
  const nomeIframe = `ident-${Math.random().toString(36).slice(2, 8)}`;
  const iframe = el('iframe', { name: nomeIframe, title: 'Vista previa da web coa identidade visual', class: 'ident-iframe' });
  const campo = (name, value = '') => el('input', { type: 'hidden', name, value });
  const fVista = el('form', { method: 'post', action: '/vista-previa', target: nomeIframe, hidden: true }, campo('csrf'), campo('coleccion', 'identidade'), campo('id', 'inicio'), campo('datos'), campo('so_ver', '1'));
  let enviado = null;
  let t;
  function programar() { clearTimeout(t); t = setTimeout(enviarVista, 500); }
  function enviarVista(forzar = false) {
    const json = JSON.stringify(d);
    if (json === enviado && !forzar) return;
    enviado = json;
    fVista.elements.csrf.value = estado.csrf;
    fVista.elements.datos.value = json;
    fVista.submit();
  }
  const opcionsPaxina = paxs.filter((p) => !p.datos.borrador && !p.datos.nai).map((p) => el('option', { value: p.id }, p.datos.titulo));
  const selPaxina = el('select', { 'aria-label': 'Páxina da vista previa', onchange: (e) => { fVista.elements.id.value = e.target.value; enviarVista(true); } }, opcionsPaxina);
  selPaxina.value = 'inicio';

  const form = el('form', { class: 'ed-form', novalidate: true, onsubmit: (e) => e.preventDefault(), oninput: marcar, onchange: marcar, onclick: () => setTimeout(marcar, 50) },
    c.bloque('Cores', 'Escolle as cores da web. As versións máis claras e máis escuras calcúlanse soas.',
      el('div', { class: 'campo' }, el('label', {}, 'Paletas para empezar'), paletas),
      cores,
      el('p', { class: 'axuda' }, 'Consello: a cor principal e a escura deben contrastar ben co branco, para que os textos se lean.')),
    c.bloque('Logo e nome', 'O logo e o nome que saen na cabeceira e no pé. O logo, mellor en PNG con fondo transparente.',
      c.imaxe(d, 'logo', 'Logo (baleiro = o de serie)', { etiquetaBib: 'logos', logo: true }),
      el('div', { class: 'fila2' },
        c.texto(d, 'nomeAntes', 'Nome: primeira parte', { placeholder: 'Feira da' }),
        c.texto(d, 'nomeDestacado', 'Nome: parte destacada', { placeholder: 'Sostibilidade' }))),
    c.bloque('Tipografía', null,
      c.escolla(d, 'titulos', 'Letra dos títulos', [
        { valor: 'playfair', texto: 'Playfair Display (elegante, de serie)' },
        { valor: 'dmsans', texto: 'DM Sans (moderna, sen remates)' },
        { valor: 'georgia', texto: 'Georgia (clásica)' },
      ])));

  async function gardarTodo() {
    erros.replaceChildren();
    try {
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'identidade', id: 'xeral', datos: d, actualizado } }), { mensaxe: 'Identidade visual gardada' });
      actualizado = r.actualizado;
      gardadoJSON = JSON.stringify(d);
      marcar();
      invalidar('identidade');
    } catch (e) { if (e.erros) erros.replaceChildren(caixaErros(e.erros)); }
  }

  const columna = el('div', { class: 'ed-col' },
    el('div', { class: 'ed-barra' }, el('a', { class: 'volver', href: '#/' }, '← Resumo'), el('div', { class: 'ed-barra-dereita' }, bGardar)),
    el('div', { class: 'ed-cab' }, el('h1', { class: 'ed-titulo' }, 'Identidade visual')),
    el('p', { class: 'muted' }, 'Os cambios vense á dereita ao momento; na web, despois de gardar.'),
    erros, form);
  const vista = el('div', { class: 'ed-vista' },
    el('div', { class: 'ed-vista-barra' }, el('span', { class: 'muted' }, 'Vista previa:'), selPaxina, el('span', { class: 'espazo' }),
      el('button', { type: 'button', class: 'btn-ghost btn-peq', title: 'Recargar', onclick: () => enviarVista(true) }, '⟳')),
    el('div', { class: 'ed-marco ident-marco' }, iframe), fVista);
  main.classList.add('main-editor');
  main.replaceChildren(el('div', { class: 'ed-dividido' }, columna, vista));
  // A vista previa móstrase como nun ordenador (1280 px), reducida para caber
  const marco = vista.querySelector('.ident-marco');
  const escalar = () => {
    const k = Math.min(1, marco.clientWidth / 1280);
    Object.assign(iframe.style, { width: '1280px', height: `${marco.clientHeight / k}px`, transform: `scale(${k})` });
  };
  const ro = new ResizeObserver(escalar);
  ro.observe(marco);
  window.addEventListener('hashchange', () => ro.disconnect(), { once: true });
  gardadoJSON = JSON.stringify(d);
  sucio.valor = false;
  setTimeout(() => enviarVista(true), 0);
}
