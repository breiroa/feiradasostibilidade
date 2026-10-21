// Arranque do panel: comproba o acceso, debuxa a estrutura e xestiona a navegación (#/sección/elemento).
import { api, aviso, coleccion, el, estado } from './nucleo.js';
import { pantallaActivar2fa, pantallaCodigo, pantallaConfiguracion, pantallaConvite, pantallaEntrar } from './acceso.js';
import { sucio, vistaEditor, vistaLista } from './coleccions.js';
import * as contidos from './contidos.js';
import * as outras from './outras.js';
import { paxinas } from './paxinas.js';
import { menus } from './menu.js';
import { cabeceiraPe } from './estrutura.js';
import { modelos } from './modelos.js';
import { recursos } from './recursos.js';
import { diagnostico } from './diagnostico.js';


// O panel úsase só no dominio principal (as sesións son por dominio)
if (/\.workers\.dev$|^www\./.test(location.hostname)) {
  location.replace(`https://feiradasostibilidade.com${location.pathname}${location.search}${location.hash}`);
}

const app = document.getElementById('app');

const menu = [
  { zona: null, items: [{ ruta: '', texto: 'Resumo', icona: '◔' }] },
  { zona: 'Contido', items: [
    { ruta: 'estrutura', texto: 'Cabeceira e pé', icona: '▤' },
    { ruta: 'paxinas', texto: 'Páxinas', icona: '⊞' },
    { ruta: 'menus', texto: 'Menús', icona: '☰' },
    { ruta: 'modelos', texto: 'Modelos', icona: '☆' },
    { ruta: 'noticias', texto: 'Noticias', icona: '✎' },
    { ruta: 'recursos', texto: 'Recursos', icona: '◫' },
    { ruta: 'entidades', texto: 'Ecosistema', icona: '◇' },
    { ruta: 'biblioteca', texto: 'Biblioteca', icona: '▦' },
  ] },
  { zona: 'Sistema', items: [
    { ruta: 'admins', texto: 'Administración', icona: '👤', superadmin: true },
    { ruta: 'axustes', texto: 'Axustes', icona: '⚙' },
    { ruta: 'diagnostico', texto: 'Diagnóstico', icona: '✚' },
  ] },
];

let main, nav;

function estrutura() {
  nav = el('nav', { class: 'nav', 'aria-label': 'Seccións do panel' });
  main = el('main', { class: 'main', id: 'contido' });
  app.replaceChildren(
    el('header', { class: 'top' },
      el('div', { class: 'top-marca' }, el('img', { src: '/logo-feira.png', alt: '' }), el('span', {}, 'Feira da ', el('em', {}, 'Sostibilidade'), ' · panel')),
      el('div', { class: 'top-accions' },
        el('span', { class: 'estado-gardado', 'aria-live': 'polite' }),
        el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver a web ↗'),
        el('a', { class: 'btn-ghost top-conta', href: '#/conta', title: 'A miña conta: contrasinal e verificación en dous pasos' }, `👤 ${estado.admin.nome.split(' ')[0]}`),
        el('button', { class: 'btn-ghost', type: 'button', onclick: sair }, 'Saír'))),
    el('div', { class: 'corpo-panel' }, nav, main),
  );
}

function pintarMenu(ruta) {
  // As edicións editanse dentro de «Páxinas e edicións»
  const s0 = ruta.split('/')[0];
  const seccion = { edicions: 'paxinas', mensaxes: 'diagnostico' }[s0] ?? s0;
  nav.replaceChildren(...menu.flatMap((z) => [
    z.zona ? el('div', { class: 'nav-zona' }, z.zona) : null,
    ...z.items.filter((i) => !i.superadmin || estado.admin.rol === 'superadmin').map((i) =>
      el('a', { href: `#/${i.ruta}`, class: seccion === i.ruta ? 'activo' : '' },
        el('span', { 'aria-hidden': 'true' }, i.icona), i.texto,
      )),
  ]).filter(Boolean));
}

const rutas = {
  '': () => outras.inicio(main),
  estrutura: () => cabeceiraPe(main),
  paxinas: (id) => paxinas(main, id),
  menus: (id) => menus(main, id),
  modelos: (id) => modelos(main, id),
  noticias: (id) => (id ? vistaEditor(main, contidos.noticias, id) : vistaLista(main, contidos.noticias)),
  recursos: (id) => recursos(main, id),
  entidades: (id) => (id ? vistaEditor(main, contidos.entidades, id) : vistaLista(main, contidos.entidades)),
  biblioteca: () => outras.biblioteca(main),
  admins: () => outras.admins(main),
  axustes: () => outras.axustes(main),
  diagnostico: () => diagnostico(main),
  conta: () => outras.conta(main, { aoRestablecer2fa: () => pantallaActivar2fa(aoAcceder) }),
  // Enderezos vellos
  edicions: (id) => location.replace(`#/paxinas${id && id !== 'novo' ? `/${id}` : ''}`),
  paxinas_libres: (id) => location.replace(`#/paxinas${id && id !== 'novo' ? `/${id}` : ''}`),
  mensaxes: () => outras.inscricions(main),
  inscricions: () => location.replace('#/mensaxes'),
  proxectos: () => location.replace('#/paxinas'),
};

let rutaActual = null;
async function navegar() {
  const ruta = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (ruta === rutaActual) return;
  if (sucio.valor && rutaActual !== null && !window.confirm('Tes cambios sen gardar. Saír igualmente?')) {
    history.replaceState(null, '', `#/${rutaActual}`);
    return;
  }
  sucio.valor = false;
  rutaActual = ruta;
  const [seccion, id] = ruta.split('/');
  pintarMenu(ruta);
  main.className = 'main';
  main.replaceChildren(el('p', { class: 'muted' }, 'Cargando…'));
  try {
    await (rutas[seccion] ?? rutas[''])(id);
    pintarMenu(ruta);
    main.focus?.();
    window.scrollTo(0, 0);
  } catch (e) {
    main.replaceChildren(el('div', { class: 'errbox' }, 'Non se puido cargar esta sección: ', e.erros ? e.erros.join(' ') : e.message, ' ', el('a', { href: location.hash, onclick: () => { rutaActual = null; navegar(); } }, 'Tentar de novo')));
  }
}

async function sair() {
  if (sucio.valor && !window.confirm('Tes cambios sen gardar. Saír igualmente?')) return;
  await api('auth', { metodo: 'POST', datos: { accion: 'sair' } }).catch(() => {});
  location.hash = '';
  location.reload();
}

/** Despois de cada paso de acceso decide que mostrar */
async function aoAcceder(r) {
  switch (r?.estado) {
    case 'configuracion': return pantallaConfiguracion(aoAcceder);
    case 'entrar': return pantallaEntrar(aoAcceder);
    case 'codigo': return pantallaCodigo(aoAcceder, r.email);
    case 'activar-2fa': return pantallaActivar2fa(aoAcceder);
    case 'dentro': {
      const s = r.csrf ? r : await api('auth');
      estado.csrf = s.csrf;
      estado.admin = s.admin;
      estrutura();
      rutaActual = null;
      return navegar();
    }
    default: return pantallaEntrar(aoAcceder);
  }
}

window.addEventListener('hashchange', navegar);
window.addEventListener('beforeunload', (e) => { if (sucio.valor) { e.preventDefault(); e.returnValue = ''; } });

(async () => {
  try {
    const convite = new URLSearchParams(location.search).get('convite');
    if (convite) return pantallaConvite(convite, aoAcceder);
    aoAcceder(await api('auth'));
  } catch (e) {
    app.replaceChildren(el('div', { class: 'acceso' }, el('div', { class: 'acceso-card' }, el('h1', {}, 'Non se pode conectar'), el('p', { class: 'muted' }, e.erros ? e.erros.join(' ') : 'Proba a recargar a páxina.'))));
    aviso('Erro de conexión', true);
  }
})();
