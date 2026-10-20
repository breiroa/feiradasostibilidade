// Editor con vista previa ao lado: á esquerda os axustes e as seccións; á dereita a páxina real,
// que se actualiza mentres se escribe (sen gardar). Premer unha sección na vista previa ábrea no editor.
// Inclúe desfacer/refacer, historial de versións e aviso se outra persoa gardou ao mesmo tempo.
import { api, caixaErros, confirmar, dataHora, el, estado, gardar, invalidar, modal } from './nucleo.js';
import { sucio } from './coleccions.js';
import { construtor, normalizar } from './seccions.js';

const DISPOSITIVOS = { escritorio: 1280, tableta: 820, mobil: 390 };
const accions = { orixinal: 'Versión inicial', creado: 'Creada', gardado: 'Gardada', restaurado: 'Restaurada', borrado: 'Borrada' };

/**
 * opcions = {
 *   coleccion, id ('novo' para crear), d (datos), item ({actualizado} do documento cargado),
 *   titulo(d), volver: [href, texto], verNaWeb(id, d) → url|null,
 *   axustes(d, {novo, idCampo}) → Node[]  (bloques da cabeceira/axustes da páxina),
 *   axustesAbertos: bool, naiTitulo(d) → texto, modelos (opcional, para o construtor),
 *   aoCrear(id) → ruta á que ir despois de crear
 * }
 */
export function editorVista(main, op) {
  const novo = op.id === 'novo';
  const d = op.d;
  normalizar(d.seccions);
  let actualizado = op.item?.actualizado;
  const idCampo = { id: '' };
  const abertas = new Set();
  let ultimaAberta = null;
  let y = 0;
  let restaurado = false;
  let gardadoJSON = JSON.stringify(d);
  let enviadoJSON = null;
  // Só hai cambios sen gardar se os datos son distintos dos gardados (abrir ou pregar seccións non conta)
  const marcarSucio = () => { sucio.valor = JSON.stringify(d) !== gardadoJSON; };

  // ── Desfacer / refacer ──
  const historia = [JSON.stringify(d)];
  let pos = 0;
  let tHist;
  function rexistrar() {
    clearTimeout(tHist);
    tHist = setTimeout(() => {
      const agora = JSON.stringify(d);
      if (agora === historia[pos]) return;
      historia.splice(pos + 1);
      historia.push(agora);
      if (historia.length > 80) historia.shift();
      pos = historia.length - 1;
      botonsHist();
    }, 450);
  }
  function irA(n) {
    if (n < 0 || n >= historia.length) return;
    pos = n;
    substituir(JSON.parse(historia[pos]));
    marcarSucio();
    botonsHist();
  }
  function substituir(novos) {
    for (const k of Object.keys(d)) delete d[k];
    Object.assign(d, novos);
    pintarEditor();
    programarVista(0);
  }

  // ── Estrutura ──
  const erros = el('div');
  const tituloH = el('h1', { class: 'ed-titulo' });
  const bDesfacer = el('button', { type: 'button', class: 'icobtn', title: 'Desfacer (Ctrl+Z)', 'aria-label': 'Desfacer', onclick: () => irA(pos - 1) }, '↶');
  const bRefacer = el('button', { type: 'button', class: 'icobtn', title: 'Refacer (Ctrl+Y)', 'aria-label': 'Refacer', onclick: () => irA(pos + 1) }, '↷');
  const botonsHist = () => { bDesfacer.disabled = pos <= 0; bRefacer.disabled = pos >= historia.length - 1; };
  const verWeb = el('a', { class: 'btn-ghost btn-peq', target: '_blank' }, 'Ver na web ↗');
  const formEditor = el('form', {
    class: 'ed-form', novalidate: true, onsubmit: (e) => e.preventDefault(),
    oninput: () => { marcarSucio(); rexistrar(); programarVista(); },
    onchange: () => { marcarSucio(); rexistrar(); programarVista(); },
  });
  let bloqueSeccions;
  const detallesAxustes = el('details', { class: 'ed-axustes', open: op.axustesAbertos || novo });

  function pintarEditor() {
    tituloH.textContent = novo ? `Nova: ${op.titulo(d) || ''}` : op.titulo(d) || '(sen título)';
    detallesAxustes.replaceChildren(el('summary', {}, op.etiquetaAxustes ?? 'Axustes e cabeceira da páxina'), ...op.axustes(d, { novo, idCampo }));
    bloqueSeccions = construtor(d, 'seccions', {
      abertas,
      modelos: op.modelos,
      aoAbrir: (id) => { ultimaAberta = id; avisarVista({ feira: 'ir', seccion: id, desprazar: true }); },
    });
    formEditor.replaceChildren(detallesAxustes, bloqueSeccions);
    const url = !novo && op.verNaWeb ? op.verNaWeb(op.id, d) : null;
    verWeb.hidden = !url;
    if (url) verWeb.href = url;
  }

  // ── Vista previa ──
  const nomeIframe = `vista-${Math.random().toString(36).slice(2, 8)}`;
  const iframe = el('iframe', { name: nomeIframe, title: 'Vista previa da páxina', class: 'ed-iframe' });
  const marco = el('div', { class: 'ed-marco' }, iframe);
  const campo = (name) => el('input', { type: 'hidden', name });
  const fVista = el('form', { method: 'post', action: '/vista-previa', target: nomeIframe, hidden: true },
    campo('csrf'), campo('coleccion'), campo('id'), campo('datos'), campo('y'), campo('naiTitulo'));
  let dispositivo = 'escritorio';
  let tVista;
  function programarVista(espera = 700) {
    clearTimeout(tVista);
    tVista = setTimeout(enviarVista, espera);
  }
  function enviarVista(target = nomeIframe, datos = d, { forzar = false } = {}) {
    const json = JSON.stringify(datos);
    if (target === nomeIframe && datos === d) {
      if (json === enviadoJSON && !forzar) return;
      enviadoJSON = json;
    }
    fVista.target = target;
    fVista.elements.csrf.value = estado.csrf;
    fVista.elements.coleccion.value = op.coleccion;
    fVista.elements.id.value = novo ? idCampo.id || 'nova' : op.id;
    fVista.elements.datos.value = json;
    fVista.elements.y.value = target === nomeIframe ? String(y) : '0';
    fVista.elements.naiTitulo.value = op.naiTitulo?.(datos) ?? '';
    fVista.submit();
  }
  const avisarVista = (msx) => iframe.contentWindow?.postMessage(msx, location.origin);
  iframe.addEventListener('load', () => { if (ultimaAberta) avisarVista({ feira: 'ir', seccion: ultimaAberta, desprazar: false }); });
  function escalar() {
    const ancho = DISPOSITIVOS[dispositivo];
    const disp = marco.clientWidth;
    const escala = Math.min(1, disp / ancho);
    iframe.style.width = `${ancho}px`;
    iframe.style.height = `${marco.clientHeight / escala}px`;
    iframe.style.transform = `scale(${escala})`;
    iframe.style.marginLeft = escala < 1 ? '0' : `${(disp - ancho) / 2}px`;
  }
  const ro = new ResizeObserver(escalar);
  ro.observe(marco);
  const botonsDisp = Object.entries({ escritorio: 'Escritorio', tableta: 'Tableta', mobil: 'Móbil' }).map(([k, t]) =>
    el('button', { type: 'button', class: `seg${k === dispositivo ? ' activo' : ''}`, 'data-disp': k, onclick: (e) => {
      dispositivo = k;
      e.currentTarget.parentElement.querySelectorAll('.seg').forEach((b) => b.classList.toggle('activo', b.dataset.disp === k));
      escalar();
    } }, t));

  // Mensaxes da vista previa: sección premida e posición do scroll
  function aoMensaxe(e) {
    if (e.origin !== location.origin || e.source !== iframe.contentWindow || e.data?.feira !== 'vista') return;
    if (typeof e.data.y === 'number') y = e.data.y;
    if (e.data.seccion) {
      if (!bloqueSeccions.abrir(e.data.seccion)) {
        detallesAxustes.open = true;
        detallesAxustes.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
  window.addEventListener('message', aoMensaxe);

  // Atallos de teclado
  function aoTeclado(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const enCampo = e.target.closest?.('input, textarea, [contenteditable="true"]');
    if (e.key.toLowerCase() === 's') { e.preventDefault(); enviar(); return; }
    if (enCampo) return; // dentro dun campo, o desfacer é o do propio campo
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); irA(pos - 1); }
    if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); irA(pos + 1); }
  }
  document.addEventListener('keydown', aoTeclado);

  // Ao saír desta vista, limpar
  const limpar = () => {
    window.removeEventListener('message', aoMensaxe);
    document.removeEventListener('keydown', aoTeclado);
    ro.disconnect();
    window.removeEventListener('hashchange', limpar);
  };
  window.addEventListener('hashchange', limpar);

  // ── Gardar ──
  async function enviar({ forzar = false } = {}) {
    erros.replaceChildren();
    try {
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: {
        coleccion: op.coleccion, id: novo ? idCampo.id : op.id, novo, datos: d, actualizado, forzar, accion: restaurado ? 'restaurado' : undefined,
      } }));
      gardadoJSON = JSON.stringify(d);
      sucio.valor = false;
      restaurado = false;
      actualizado = r.actualizado;
      invalidar(op.coleccion);
      if (novo) { location.hash = op.aoCrear ? op.aoCrear(r.id) : `#/${op.coleccion}/${encodeURIComponent(r.id)}`; return; }
      tituloH.textContent = op.titulo(d) || '(sen título)';
    } catch (e) {
      if (e.status === 409 && !forzar) {
        const si = await confirmar(e.erros?.[0] ?? 'Outra persoa gardou esta páxina mentres a editabas.', {
          boton: 'Gardar a miña versión', perigo: true,
          detalle: 'Se gardas, substitúes os seus cambios (quedan no historial e podes recuperalos). Se cancelas, podes copiar o teu texto e recargar para ver a versión nova.',
        });
        if (si) return enviar({ forzar: true });
        return;
      }
      if (e.erros) erros.replaceChildren(caixaErros(e.erros));
    }
  }

  // ── Historial ──
  async function verHistorial() {
    const lista = el('div', {}, el('p', { class: 'muted' }, 'Cargando…'));
    const m = modal('Historial de versións', lista, { ancho: true });
    try {
      const { items } = await api(`versions?coleccion=${op.coleccion}&id=${encodeURIComponent(op.id)}`);
      if (!items.length) { lista.replaceChildren(el('p', { class: 'muted' }, 'Aínda non hai versións gardadas. Cada vez que gardes, quedará unha aquí.')); return; }
      lista.replaceChildren(
        el('p', { class: 'muted' }, 'Gárdanse as últimas 30 versións. «Cargar» pon esa versión no editor e na vista previa; para aplicala na web, preme despois «Gardar».'),
        el('table', { class: 'tbl' }, el('tbody', {}, items.map((v, n) => el('tr', {},
          el('td', {}, el('b', {}, dataHora(v.creado)), n === 0 ? el('span', { class: 'pill verde', style: { marginLeft: '8px' } }, 'Actual') : null),
          el('td', {}, accions[v.accion] ?? v.accion),
          el('td', { class: 'muted' }, v.autor ?? '—'),
          el('td', {}, el('div', { class: 'accions' },
            el('button', { type: 'button', class: 'btn-ghost btn-peq', onclick: async () => {
              const { version } = await api(`versions?version=${v.id}`);
              enviarVista('_blank', version.datos);
            } }, 'Ver ↗'),
            n === 0 ? null : el('button', { type: 'button', class: 'btn btn-peq', onclick: async () => {
              const { version } = await api(`versions?version=${v.id}`);
              substituir(version.datos);
              rexistrar();
              marcarSucio();
              restaurado = true;
              m.pechar();
            } }, 'Cargar'))))))));
    } catch (e) {
      lista.replaceChildren(caixaErros(e.erros ?? ['Non se puido cargar o historial.']));
    }
  }

  // ── Montaxe ──
  const columna = el('div', { class: 'ed-col' },
    el('div', { class: 'ed-barra' },
      el('a', { class: 'volver', href: op.volver[0] }, `← ${op.volver[1]}`),
      el('div', { class: 'ed-barra-dereita' },
        bDesfacer, bRefacer,
        novo ? null : el('button', { type: 'button', class: 'btn-ghost btn-peq', onclick: verHistorial }, 'Historial'),
        el('button', { type: 'button', class: 'btn btn-peq', onclick: () => enviar() }, novo ? 'Crear' : 'Gardar'))),
    tituloH, erros, formEditor);
  const vista = el('div', { class: 'ed-vista' },
    el('div', { class: 'ed-vista-barra' },
      el('div', { class: 'segmentos', role: 'group', 'aria-label': 'Tamaño da vista previa' }, botonsDisp),
      el('span', { class: 'espazo' }),
      el('button', { type: 'button', class: 'btn-ghost btn-peq', title: 'Recargar a vista previa', onclick: () => enviarVista(nomeIframe, d, { forzar: true }) }, '⟳'),
      el('button', { type: 'button', class: 'btn-ghost btn-peq', onclick: () => enviarVista('_blank') }, 'Abrir en pestana ↗'),
      verWeb),
    marco, fVista);

  main.classList.add('main-editor');
  main.replaceChildren(el('div', { class: 'ed-dividido' }, columna, vista));
  pintarEditor();
  // Os campos poden completar valores baleiros ao pintarse: o punto de partida é despois diso
  historia[0] = gardadoJSON = JSON.stringify(d);
  botonsHist();
  sucio.valor = false;
  requestAnimationFrame(() => { escalar(); enviarVista(); });
}
