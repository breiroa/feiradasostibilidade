// Arranque do panel: comproba o acceso, debuxa a estrutura e xestiona a navegación (#/sección/elemento).
import { api, aviso, coleccion, el, estado } from './nucleo.js';
import { pantallaActivar2fa, pantallaCodigo, pantallaConfiguracion, pantallaConvite, pantallaEntrar } from './acceso.js';
import { sucio, vistaEditor, vistaLista } from './coleccions.js';
import * as contidos from './contidos.js';
import * as outras from './outras.js';
import { paxinas } from './paxinas.js';
import { editorVista } from './editor-vista.js';


// O panel úsase só no dominio principal (as sesións son por dominio)
if (/\.workers\.dev$|^www\./.test(location.hostname)) {
  location.replace(`https://feiradasostibilidade.com${location.pathname}${location.search}${location.hash}`);
}

const app = document.getElementById('app');

const menu = [
  { zona: null, items: [{ ruta: '', texto: 'Resumo', icona: '◔' }] },
  { zona: 'Contido', items: [
    { ruta: 'paxinas', texto: 'Páxinas', icona: '⊞' },
    { ruta: 'edicions', texto: 'Edicións', icona: '★' },
    { ruta: 'noticias', texto: 'Noticias', icona: '✎' },
    { ruta: 'recursos', texto: 'Recursos', icona: '◫' },
    { ruta: 'proxectos', texto: 'Proxectos', icona: '◎' },
    { ruta: 'entidades', texto: 'Entidades e logos', icona: '◇' },
    { ruta: 'biblioteca', texto: 'Biblioteca', icona: '▦' },
  ] },
  { zona: 'Comunidade', items: [
    { ruta: 'inscricions', texto: 'Inscricións', icona: '✉', contador: true },
    { ruta: 'admins', texto: 'Persoas administradoras', icona: '👤', superadmin: true },
  ] },
  { zona: 'Sistema', items: [
    { ruta: 'axustes', texto: 'Axustes e pé', icona: '⚙' },
    { ruta: 'conta', texto: 'A miña conta', icona: '🔑' },
  ] },
];

let main, nav, contadorInsc = 0;

function estrutura() {
  nav = el('nav', { class: 'nav', 'aria-label': 'Seccións do panel' });
  main = el('main', { class: 'main', id: 'contido' });
  app.replaceChildren(
    el('header', { class: 'top' },
      el('div', { class: 'top-marca' }, el('img', { src: '/logo-feira.png', alt: '' }), el('span', {}, 'Feira da ', el('em', {}, 'Sostibilidade'), ' · panel')),
      el('div', { class: 'top-accions' },
        el('span', { class: 'estado-gardado', 'aria-live': 'polite' }),
        el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver a web ↗'),
        el('button', { class: 'btn-ghost', type: 'button', onclick: sair }, 'Saír'))),
    el('div', { class: 'corpo-panel' }, nav, main),
  );
}

function pintarMenu(ruta) {
  const seccion = ruta.split('/')[0];
  nav.replaceChildren(...menu.flatMap((z) => [
    z.zona ? el('div', { class: 'nav-zona' }, z.zona) : null,
    ...z.items.filter((i) => !i.superadmin || estado.admin.rol === 'superadmin').map((i) =>
      el('a', { href: `#/${i.ruta}`, class: seccion === i.ruta ? 'activo' : '' },
        el('span', { 'aria-hidden': 'true' }, i.icona), i.texto,
        i.contador && contadorInsc ? el('span', { class: 'contador', title: 'Novas' }, String(contadorInsc)) : null)),
  ]).filter(Boolean));
}

async function actualizarContador() {
  try {
    const { items } = await api('inscricions');
    contadorInsc = items.filter((i) => i.estado === 'nova').length;
  } catch { /* sen importancia */ }
}

const rutas = {
  '': () => outras.inicio(main),
  edicions: (id) => (id ? editarEdicion(id) : vistaLista(main, contidos.edicions)),
  noticias: (id) => (id ? vistaEditor(main, contidos.noticias, id) : vistaLista(main, contidos.noticias)),
  recursos: (id) => (id ? vistaEditor(main, contidos.recursos, id) : vistaLista(main, contidos.recursos)),
  proxectos: (id) => (id ? vistaEditor(main, contidos.proxectos, id) : vistaLista(main, contidos.proxectos)),
  paxinas_libres: (id) => { location.replace(`#/paxinas${id && id !== 'novo' ? `/${id}` : ''}`); },
  entidades: (id) => (id ? vistaEditor(main, contidos.entidades, id) : vistaLista(main, contidos.entidades)),
  paxinas: (id) => paxinas(main, id),
  biblioteca: () => outras.biblioteca(main),
  inscricions: async () => { await outras.inscricions(main); await actualizarContador(); },
  admins: () => outras.admins(main),
  axustes: () => outras.axustes(main),
  conta: () => outras.conta(main, { aoRestablecer2fa: () => pantallaActivar2fa(aoAcceder) }),
};

/** Edición: o mesmo editor con vista previa que as páxinas */
async function editarEdicion(id) {
  const cfg = contidos.edicions;
  let d, item;
  if (id === 'novo') d = cfg.novo();
  else {
    item = (await coleccion('edicions', { forzar: true })).find((x) => x.id === id);
    if (!item) { main.replaceChildren(el('a', { class: 'volver', href: '#/edicions' }, '← Edicións'), el('div', { class: 'baleiro' }, 'Non se atopou esta edición.')); return; }
    d = structuredClone(item.datos);
  }
  editorVista(main, {
    coleccion: 'edicions', id, d, item,
    titulo: (x) => x.titulo,
    volver: ['#/edicions', 'Edicións'],
    verNaWeb: cfg.verNaWeb,
    axustes: (x, o) => cfg.axustes(x, o),
    axustesAbertos: id === 'novo',
    etiquetaAxustes: 'Datos da edición (título, datas, portada, cifras)',
    aoCrear: (nid) => `#/edicions/${nid}`,
  });
}

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
      await actualizarContador();
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
