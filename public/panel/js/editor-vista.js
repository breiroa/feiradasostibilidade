// Editor visual de páxinas: á dereita a páxina real, onde se escriben os textos e se cambian as fotos
// directamente; á esquerda as opcións (pestanas «Seccións» e «Páxina»). Todo sen gardar ata premer «Gardar».
// Inclúe desfacer/refacer, historial de versións e aviso se outra persoa gardou ao mesmo tempo.
import { api, aviso, caixaErros, coleccion, confirmar, dataHora, el, estado, gardar, invalidar, mediaUrl, modal } from './nucleo.js';
import { sucio } from './coleccions.js';
import { BLOQUES_NOVOS, construtor, normalizar, novoElemento } from './seccions.js';
import { conProgreso, escollerDaBiblioteca, subirImaxe, zonaSoltar } from './imaxes.js';

const DISPOSITIVOS = { escritorio: 1280, tableta: 820, mobil: 390 };
const accions = { orixinal: 'Versión inicial', creado: 'Creada', gardado: 'Gardada', restaurado: 'Restaurada', borrado: 'Borrada' };
const RUTAS_FIXAS = { inicio: '/', feiralab: '/feiralab/', participa: '/participa/', actualidade: '/actualidade/', recursos: '/recursos/', edicions: '/edicions/' };

// ── Rutas dentro dos datos («items.2.titulo»; «titulo#1» = 2ª parte dun título separado por « · ») ──
const partes = (ruta) => ruta.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
function ler(base, ruta) {
  return partes(ruta.replace(/#\d$/, '')).reduce((o, k) => (o == null ? undefined : o[k]), base);
}
function poñer(base, ruta, valor) {
  const m = ruta.match(/^(.*)#(\d)$/);
  if (m) {
    const ps = String(ler(base, m[1]) ?? '').split(' · ');
    ps[Number(m[2])] = valor ?? '';
    ruta = m[1];
    valor = ps.filter((x, i) => i === 0 || x).join(' · ');
  }
  const ps = partes(ruta);
  let o = base;
  ps.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = typeof ps[i + 1] === 'number' ? [] : {};
    o = o[k];
  });
  const u = ps.at(-1);
  if ((valor === '' || valor == null) && !Array.isArray(o)) delete o[u];
  else o[u] = valor ?? '';
}

/** Escoller unha imaxe: subir (arrastrando), biblioteca ou quitar. Resolve {id, alt} | 'quitar' | null */
export function pedirImaxe({ actual, alt = '', quitar = true, titulo = 'Cambiar a imaxe', etiqueta = 'xeral' } = {}) {
  return new Promise((resolver) => {
    let resposta = null;
    const d = { alt };
    const estadoSubida = el('div');
    const prev = el('img', { class: 'imaxe-prev grande', alt: '', src: actual ? mediaUrl(actual, 'm') : '', hidden: !actual });
    let escollida = actual;
    const marcar = (id, novoAlt) => { escollida = id; prev.src = mediaUrl(id, 'm'); prev.hidden = false; if (novoAlt && !d.alt) { d.alt = novoAlt; campoAlt.value = novoAlt; } };
    const campoAlt = el('input', { type: 'text', value: alt, placeholder: 'Que se ve na foto (para lectores de pantalla)', oninput: (e) => { d.alt = e.target.value; } });
    const m = modal(titulo, el('div', { class: 'pedir-imaxe' },
      prev,
      zonaSoltar({ texto: 'Arrastra aquí unha foto ou', aoSoltar: async ([f]) => {
        const item = await conProgreso(estadoSubida, 'Optimizando e subindo…', () => subirImaxe(f, { etiqueta }));
        if (item) marcar(item.id);
      } }),
      estadoSubida,
      el('div', { class: 'imaxe-btns' }, el('button', { type: 'button', class: 'btn-ghost', onclick: async () => { const x = await escollerDaBiblioteca({ etiqueta }); if (x) marcar(x.id, x.alt); } }, 'Escoller da biblioteca')),
      el('div', { class: 'campo' }, el('label', {}, 'Descrición da foto'), campoAlt)), {
      aoPechar: () => resolver(resposta),
      botons: [
        quitar && actual ? el('button', { type: 'button', class: 'btn-danger', onclick: () => { resposta = 'quitar'; m.pechar(); } }, 'Quitar a foto') : null,
        el('span', { class: 'espazo' }),
        el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn', onclick: () => { if (escollida) resposta = { id: escollida, alt: d.alt }; m.pechar(); } }, 'Usar esta foto'),
      ].filter(Boolean),
    });
  });
}

/** Escoller unha ligazón (páxina da web ou enderezo). Con «boton» tamén texto e estilo. */
export async function pedirLigazon({ url = '', texto, estilo, boton = false, quitarTexto } = {}) {
  const [paxs, eds] = await Promise.all([coleccion('paxinas_libres'), coleccion('edicions')]);
  const opcions = [
    ...paxs.filter((p) => !p.datos.borrador).map((p) => ({ url: RUTAS_FIXAS[p.id] ?? (p.datos.nai ? `/${p.datos.nai}/${p.id}/` : `/${p.id}/`), texto: p.datos.titulo })),
    ...eds.map((e) => ({ url: `/edicions/${e.id}/`, texto: `Edicións › ${e.datos.titulo}` })),
  ].sort((a, b) => a.texto.localeCompare(b.texto, 'gl'));
  return new Promise((resolver) => {
    let resposta = null;
    const d = { url, texto, estilo: estilo ?? 'principal' };
    const campoUrl = el('input', { type: 'text', value: url, placeholder: '/participa/ ou https://…', oninput: (e) => { d.url = e.target.value.trim(); } });
    const sel = el('select', { onchange: (e) => { if (e.target.value) { d.url = e.target.value; campoUrl.value = d.url; } } },
      el('option', { value: '' }, 'Escoller unha páxina da web…'), opcions.map((o) => el('option', { value: o.url, selected: o.url === url }, o.texto)));
    const m = modal(boton ? 'Botón' : 'Ligazón', el('div', {},
      boton ? el('div', { class: 'campo' }, el('label', {}, 'Texto do botón'), el('input', { type: 'text', value: texto ?? '', oninput: (e) => { d.texto = e.target.value; } })) : null,
      el('div', { class: 'campo' }, el('label', {}, 'Páxina da web'), sel),
      el('div', { class: 'campo' }, el('label', {}, 'Ou enderezo'), campoUrl, el('div', { class: 'axuda' }, 'Interno (/participa/), externo (https://…), correo (mailto:…) ou unha ancla (#formulario).')),
      boton ? el('div', { class: 'campo' }, el('label', {}, 'Estilo'), el('select', { onchange: (e) => { d.estilo = e.target.value; } },
        el('option', { value: 'principal', selected: d.estilo === 'principal' }, 'Principal (cheo)'), el('option', { value: 'secundario', selected: d.estilo === 'secundario' }, 'Secundario (só borde)'))) : null), {
      aoPechar: () => resolver(resposta),
      botons: [
        quitarTexto ? el('button', { type: 'button', class: 'btn-danger', onclick: () => { resposta = 'quitar'; m.pechar(); } }, quitarTexto) : null,
        el('span', { class: 'espazo' }),
        el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn', onclick: () => {
          if (!/^(https?:\/\/|mailto:|\/|#)/.test(d.url)) { aviso('A ligazón debe comezar por /, https://, mailto: ou #', true); return; }
          resposta = d;
          m.pechar();
        } }, 'Aceptar'),
      ].filter(Boolean),
    });
  });
}

/**
 * opcions = {
 *   coleccion, id ('novo' para crear), d (datos), item ({actualizado} do documento cargado),
 *   titulo(d), volver: [href, texto], verNaWeb(id, d) → url|null,
 *   axustes(d, {novo, idCampo}) → Node[]  (pestana «Páxina»: título, enderezo, cabeceira…),
 *   pestanaAxustes: texto da pestana, conBorrador: bool (interruptor Publicada/Borrador),
 *   naiTitulo(d) → texto, modelos (opcional, para o construtor), aoCrear(id) → ruta despois de crear
 * }
 */
export function editorVista(main, op) {
  const novo = op.id === 'novo';
  const d = op.d;
  if (!Array.isArray(d.seccions)) d.seccions = [];
  normalizar(d.seccions);
  let actualizado = op.item?.actualizado;
  const idCampo = { id: '' };
  const abertas = new Set();
  let ultimaAberta = null;
  let desprazarA = null; // sección nova: ao recargar a vista, baixar ata ela
  let seleccionDesdeVista = false; // se a sección se premeu na vista, non mover a vista
  let y = 0;
  let restaurado = false;
  let gardadoJSON = JSON.stringify(d);
  let enviadoJSON = null;
  let desdeVista = false; // cambios que veñen da propia vista previa: non hai que recargala
  let pestana = novo || op.axustesAbertos ? 'paxina' : 'seccions';

  const bGardar = el('button', { type: 'button', class: 'btn btn-peq', onclick: () => enviar() }, novo ? 'Crear' : 'Gardar');
  const marcarSucio = () => {
    sucio.valor = JSON.stringify(d) !== gardadoJSON;
    bGardar.classList.toggle('pendente', sucio.valor);
    bGardar.title = sucio.valor ? 'Hai cambios sen gardar (Ctrl+S)' : 'Todo gardado';
  };

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
      if (historia.length > 100) historia.shift();
      pos = historia.length - 1;
      botonsHist();
    }, 450);
  }
  function irA(n) {
    clearTimeout(tHist);
    const agora = JSON.stringify(d);
    // Cambios aínda non rexistrados: desfacer volve ao estado anterior a eles
    if (agora !== historia[pos] && n < pos) { historia.splice(pos + 1); historia.push(agora); pos = historia.length - 1; n = pos - 1; }
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
    recargarVista();
  }

  // ── Columna esquerda ──
  const erros = el('div');
  const tituloH = el('h1', { class: 'ed-titulo' });
  const bDesfacer = el('button', { type: 'button', class: 'icobtn', title: 'Desfacer (Ctrl+Z)', 'aria-label': 'Desfacer', onclick: () => irA(pos - 1) }, '↶');
  const bRefacer = el('button', { type: 'button', class: 'icobtn', title: 'Refacer (Ctrl+Y)', 'aria-label': 'Refacer', onclick: () => irA(pos + 1) }, '↷');
  const botonsHist = () => { bDesfacer.disabled = pos <= 0 && JSON.stringify(d) === historia[0]; bRefacer.disabled = pos >= historia.length - 1; };
  const verWeb = el('a', { class: 'btn-ghost btn-peq', target: '_blank' }, 'Ver na web ↗');
  const estadoPub = el('label', { class: 'interruptor', title: 'Se está en borrador, non se ve na web' });
  const formEditor = el('form', {
    class: 'ed-form', novalidate: true, onsubmit: (e) => e.preventDefault(),
    oninput: () => { marcarSucio(); rexistrar(); if (!desdeVista) programarVista(); },
    onchange: () => { marcarSucio(); rexistrar(); if (!desdeVista) programarVista(); },
  });
  let bloqueSeccions;
  const panelSeccions = el('div', { class: 'ed-panel' });
  const panelPaxina = el('div', { class: 'ed-panel' });
  const pestanas = el('div', { class: 'ed-pestanas', role: 'tablist' });

  function pintarPestanas() {
    const p = (k, t) => el('button', { type: 'button', role: 'tab', class: pestana === k ? 'activo' : '', 'aria-selected': String(pestana === k), onclick: () => { pestana = k; pintarPestanas(); } }, t);
    pestanas.replaceChildren(p('seccions', `${op.pestanaSeccions ?? 'Seccións'} (${(d.seccions ?? []).length})`), p('paxina', op.pestanaAxustes ?? 'Páxina'));
    panelSeccions.hidden = pestana !== 'seccions';
    panelPaxina.hidden = pestana !== 'paxina';
  }
  function pintarAxustes() {
    panelPaxina.replaceChildren(...op.axustes(d, { novo, idCampo }));
  }
  function pintarEstado() {
    if (!op.conBorrador) { estadoPub.hidden = true; return; }
    const ch = el('input', { type: 'checkbox', checked: !d.borrador, onchange: (e) => {
      d.borrador = !e.target.checked;
      pintarEstado();
      pintarAxustes();
      marcarSucio();
      rexistrar();
    } });
    estadoPub.replaceChildren(ch, el('span', { class: 'interruptor-pista', 'aria-hidden': 'true' }), el('span', {}, d.borrador ? 'Borrador' : 'Publicada'));
    estadoPub.classList.toggle('borrador', Boolean(d.borrador));
  }
  function pintarEditor() {
    tituloH.textContent = novo ? `Nova: ${op.titulo(d) || ''}` : op.titulo(d) || '(sen título)';
    pintarAxustes();
    bloqueSeccions = construtor(d, 'seccions', {
      abertas,
      modelos: op.modelos,
      titulo: op.pestanaSeccions ?? 'Seccións',
      aoAbrir: (id) => { ultimaAberta = id; avisarVista({ feira: 'ir', seccion: id, desprazar: !seleccionDesdeVista }); },
      aoEngadir: (id) => { ultimaAberta = id; desprazarA = id; },
    });
    panelSeccions.replaceChildren(bloqueSeccions);
    formEditor.replaceChildren(panelSeccions, panelPaxina);
    pintarPestanas();
    pintarEstado();
    const url = !novo && op.verNaWeb ? op.verNaWeb(op.id, d) : null;
    verWeb.hidden = !url;
    if (url) verWeb.href = url;
  }
  /** Repinta a esquerda sen recargar a vista previa nin perder o scroll */
  function repintarDesdeVista(seccion) {
    const col = main.querySelector('.ed-col');
    const top = col?.scrollTop;
    desdeVista = true;
    try {
      if (seccion.startsWith('_')) pintarAxustes();
      else if (abertas.has(seccion)) bloqueSeccions.repintar();
      pintarPestanas();
    } finally { desdeVista = false; }
    if (col) col.scrollTop = top;
  }

  // ── Vista previa ──
  const nomeIframe = `vista-${Math.random().toString(36).slice(2, 8)}`;
  const iframe = el('iframe', { name: nomeIframe, title: 'Vista previa editable da páxina', class: 'ed-iframe' });
  const cargando = el('div', { class: 'ed-cargando', hidden: true }, 'Actualizando…');
  const marco = el('div', { class: 'ed-marco' }, iframe, cargando);
  const campo = (name) => el('input', { type: 'hidden', name });
  const fVista = el('form', { method: 'post', action: '/vista-previa', target: nomeIframe, hidden: true },
    campo('csrf'), campo('coleccion'), campo('id'), campo('datos'), campo('y'), campo('naiTitulo'), campo('so_ver'), campo('escala'));
  let dispositivo = 'escritorio';
  let tVista;
  function programarVista(espera = 700) {
    clearTimeout(tVista);
    tVista = setTimeout(enviarVista, espera);
  }
  const recargarVista = () => { clearTimeout(tVista); enviarVista(nomeIframe, d, { forzar: true }); };
  function enviarVista(target = nomeIframe, datos = d, { forzar = false } = {}) {
    const json = JSON.stringify(datos);
    const propia = target === nomeIframe;
    if (propia && datos === d) {
      if (json === enviadoJSON && !forzar) return;
      enviadoJSON = json;
      cargando.hidden = false;
    }
    fVista.target = target;
    fVista.elements.csrf.value = estado.csrf;
    fVista.elements.coleccion.value = op.coleccion;
    fVista.elements.id.value = novo ? idCampo.id || 'nova' : op.id;
    fVista.elements.datos.value = json;
    fVista.elements.y.value = propia ? String(y) : '0';
    fVista.elements.naiTitulo.value = op.naiTitulo?.(datos) ?? '';
    fVista.elements.so_ver.value = propia ? '0' : '1';
    fVista.elements.escala.value = String(escalaActual);
    fVista.submit();
  }
  const avisarVista = (msx) => iframe.contentWindow?.postMessage(msx, location.origin);
  iframe.addEventListener('load', () => {
    cargando.hidden = true;
    if (ultimaAberta) avisarVista({ feira: 'ir', seccion: ultimaAberta, desprazar: desprazarA === ultimaAberta });
    desprazarA = null;
  });
  let escalaActual = 1;
  function escalar() {
    const ancho = DISPOSITIVOS[dispositivo];
    const disp = marco.clientWidth;
    const escala = Math.min(1, disp / ancho);
    if (escala !== escalaActual) { escalaActual = escala; avisarVista({ feira: 'escala', valor: escala }); }
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

  // ── O que chega da vista previa ──
  // «_cabeceira», «_pe»…: datos da raíz do documento; o resto, unha sección
  const obxecto = (seccion) => (seccion?.startsWith('_') ? d : (d.seccions ?? []).find((s) => s.id === seccion));
  const cambiou = (seccion, recargar = true) => {
    marcarSucio();
    rexistrar();
    if (recargar) recargarVista();
    else enviadoJSON = JSON.stringify(d);
    if (seccion) repintarDesdeVista(seccion);
  };

  async function cambiarImaxe(seccion, ruta) {
    const base = obxecto(seccion);
    if (!base) return;
    const ps = partes(ruta);
    const pai = ps.length > 1 ? ler(base, ps.slice(0, -1).join('.')) : base;
    const clave = ps.at(-1);
    // Onde vai a descrición: «alt» nos bloques e na foto grande; «imaxeAlt», «portadaAlt»… no resto
    const claveAlt = pai && ('alt' in pai || pai.tipo === 'imaxe' || (base.tipo === 'imaxe' && ps.length === 1)) ? 'alt' : clave === 'fondoImaxe' ? null : `${clave}Alt`;
    const obrigatoria = (base.tipo === 'imaxe' && ruta === 'imaxe') || /bloques\.\d+\.imaxe$/.test(ruta);
    const r = await pedirImaxe({ actual: ler(base, ruta), alt: claveAlt ? pai?.[claveAlt] ?? '' : '', quitar: !obrigatoria, etiqueta: op.coleccion === 'edicions' ? 'edicions' : 'xeral' });
    if (!r) return;
    if (r === 'quitar') poñer(base, ruta, undefined);
    else {
      poñer(base, ruta, r.id);
      if (claveAlt && pai) { if (r.alt) pai[claveAlt] = r.alt; else delete pai[claveAlt]; }
    }
    cambiou(seccion);
  }

  async function cambiarLigazon(seccion, ruta, boton) {
    const base = obxecto(seccion);
    if (!base) return;
    if (boton) {
      const b = ler(base, ruta);
      if (!b) return;
      const r = await pedirLigazon({ url: b.url, texto: b.texto, estilo: b.estilo, boton: true, quitarTexto: 'Quitar o botón' });
      if (!r) return;
      if (r === 'quitar') {
        const ps = partes(ruta);
        ler(base, ps.slice(0, -1).join('.')).splice(ps.at(-1), 1);
      } else Object.assign(b, { url: r.url, texto: r.texto || b.texto, estilo: r.estilo });
    } else {
      const r = await pedirLigazon({ url: ler(base, ruta) ?? '', quitarTexto: ler(base, ruta) ? 'Quitar a ligazón' : undefined });
      if (!r) return;
      poñer(base, ruta, r === 'quitar' ? undefined : r.url);
    }
    cambiou(seccion);
  }

  function operarItem(seccion, ruta, op_) {
    const base = obxecto(seccion);
    if (!base) return;
    const ps = partes(ruta);
    const i = ps.at(-1);
    const lista = ler(base, ps.slice(0, -1).join('.'));
    if (!Array.isArray(lista) || typeof i !== 'number') return;
    if (op_ === 'antes' && i > 0) [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]];
    else if (op_ === 'despois' && i < lista.length - 1) [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]];
    else if (op_ === 'duplicar') lista.splice(i + 1, 0, structuredClone(lista[i]));
    else if (op_ === 'quitar') { lista.splice(i, 1); aviso('Quitado. Ctrl+Z para desfacer.'); }
    else return;
    cambiou(seccion);
  }

  async function engadirElemento(seccion) {
    const s = obxecto(seccion);
    if (!s) return;
    if (s.tipo === 'columnas') return engadirBloque(s);
    const n = novoElemento(s);
    if (!n) { bloqueSeccions.abrir(seccion); pestana = 'seccions'; pintarPestanas(); return; }
    const [clave, valor] = n;
    if (!Array.isArray(s[clave])) s[clave] = [];
    s[clave].push(structuredClone(valor));
    cambiou(seccion);
  }

  function engadirBloque(s) {
    const ncols = s.proporcion === '1-1-1' ? 3 : 2;
    if (!Array.isArray(s.columnas)) s.columnas = [];
    while (s.columnas.length < ncols) s.columnas.push({ bloques: [] });
    const eleccion = { col: 0 };
    const cols = el('div', { class: 'segmentos', style: { marginBottom: '14px' } }, Array.from({ length: ncols }, (_, i) =>
      el('button', { type: 'button', class: `seg${i === 0 ? ' activo' : ''}`, onclick: (e) => { eleccion.col = i; e.currentTarget.parentElement.querySelectorAll('.seg').forEach((b, k) => b.classList.toggle('activo', k === i)); } }, `Columna ${i + 1}`)));
    const m = modal('Engadir un bloque', el('div', {}, el('p', { class: 'muted' }, 'En que columna?'), cols,
      el('div', { class: 'bloques-grella' }, Object.entries(BLOQUES_NOVOS).map(([tipo, [nome, novo_]]) =>
        el('button', { type: 'button', class: 'tipo-boton', onclick: async () => {
          m.pechar();
          let b = novo_ ? novo_() : null;
          if (tipo === 'imaxe') { const r = await pedirImaxe({ quitar: false, titulo: 'Foto para o bloque' }); if (!r || r === 'quitar') return; b = { tipo: 'imaxe', imaxe: r.id, alt: r.alt || undefined, forma: 'rectangular' }; }
          if (tipo === 'video') {
            const url = await pedirTexto('Vídeo', 'Ligazón de YouTube ou Vimeo', 'https://www.youtube.com/watch?v=…');
            if (!url) return;
            b = { tipo: 'video', url };
          }
          s.columnas[eleccion.col].bloques.push(b);
          cambiou(s.id);
        } }, el('b', {}, nome))))));
  }

  function pedirTexto(titulo, etiqueta, placeholder) {
    return new Promise((resolver) => {
      let r = null;
      const i = el('input', { type: 'text', placeholder });
      const m = modal(titulo, el('div', { class: 'campo' }, el('label', {}, etiqueta), i), {
        aoPechar: () => resolver(r),
        botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
          el('button', { type: 'button', class: 'btn', onclick: () => { r = i.value.trim(); m.pechar(); } }, 'Aceptar')],
      });
      setTimeout(() => i.focus(), 30);
    });
  }

  async function aoMensaxe(e) {
    if (e.origin !== location.origin || e.source !== iframe.contentWindow || e.data?.feira !== 'vista') return;
    const m = e.data;
    switch (m.tipo) {
      case 'scroll': y = m.y; break;
      case 'seleccion':
        seleccionDesdeVista = true;
        try {
          if (m.seccion?.startsWith('_')) { pestana = 'paxina'; pintarPestanas(); }
          else if (bloqueSeccions.abrir(m.seccion)) { pestana = 'seccions'; pintarPestanas(); }
        } finally { seleccionDesdeVista = false; }
        break;
      case 'cambio': {
        const base = obxecto(m.seccion);
        if (!base) break;
        const antes = ler(base, m.ruta);
        if ((antes ?? '') === (m.valor ?? '') && !/#\d$/.test(m.ruta)) break;
        poñer(base, m.ruta, m.valor);
        cambiou(m.seccion, false);
        if (m.seccion?.startsWith('_') && /^titulo/.test(m.ruta)) tituloH.textContent = op.titulo(d) || '(sen título)';
        break;
      }
      case 'imaxe': cambiarImaxe(m.seccion, m.ruta); break;
      case 'ligazon': cambiarLigazon(m.seccion, m.ruta, m.boton); break;
      case 'pedirLigazon': {
        const r = await pedirLigazon({});
        if (r && r !== 'quitar') avisarVista({ feira: 'ligazon', url: r.url });
        break;
      }
      case 'item': operarItem(m.seccion, m.ruta, m.op); break;
      case 'engadir': {
        const i = m.despois === '_cabeceira' ? 0 : m.despois?.startsWith('_') ? (d.seccions ?? []).length : bloqueSeccions.posicion(m.despois) + 1;
        pestana = 'seccions';
        pintarPestanas();
        bloqueSeccions.engadirEn(Math.max(0, i));
        break;
      }
      case 'accion':
        if (m.accion === 'axustes') {
          if (m.seccion?.startsWith('_')) pestana = 'paxina';
          else { pestana = 'seccions'; bloqueSeccions.abrir(m.seccion); }
          pintarPestanas();
        } else if (m.accion === 'engadirElemento') engadirElemento(m.seccion);
        else if (await bloqueSeccions.accion(m.seccion, m.accion)) { marcarSucio(); rexistrar(); recargarVista(); }
        break;
      case 'teclado':
        if (m.tecla === 's') enviar();
        if (m.tecla === 'z') irA(pos - 1);
        if (m.tecla === 'y') irA(pos + 1);
        break;
      default:
    }
  }
  window.addEventListener('message', aoMensaxe);

  // Atallos de teclado no panel
  function aoTeclado(e) {
    if (!(e.ctrlKey || e.metaKey) || document.querySelector('dialog[open]')) return;
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
      restaurado = false;
      actualizado = r.actualizado;
      marcarSucio();
      invalidar(op.coleccion);
      if (novo) { location.hash = op.aoCrear ? op.aoCrear(r.id) : `#/${op.coleccion}/${encodeURIComponent(r.id)}`; return; }
      tituloH.textContent = op.titulo(d) || '(sen título)';
      const url = op.verNaWeb ? op.verNaWeb(op.id, d) : null;
      verWeb.hidden = !url;
      if (url) verWeb.href = url;
    } catch (e) {
      if (e.status === 409 && !forzar) {
        const si = await confirmar(e.erros?.[0] ?? 'Outra persoa gardou esta páxina mentres a editabas.', {
          boton: 'Gardar a miña versión', perigo: true,
          detalle: 'Se gardas, substitúes os seus cambios (quedan no historial e podes recuperalos). Se cancelas, podes copiar o teu texto e recargar para ver a versión nova.',
        });
        if (si) return enviar({ forzar: true });
        return;
      }
      if (e.erros) { erros.replaceChildren(caixaErros(e.erros)); main.querySelector('.ed-col')?.scrollTo({ top: 0, behavior: 'smooth' }); }
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

  // ── Axuda inicial (pódese pechar) ──
  let verAxuda = true;
  try { verAxuda = !localStorage.getItem('feira-axuda-editor'); } catch { /* sen almacenamento */ }
  const axuda = verAxuda ? el('div', { class: 'ed-axuda' },
    el('p', {}, el('b', {}, 'Edita directamente na páxina da dereita: '), 'escribe enriba dos textos, preme nunha foto para cambiala e usa a barra escura de cada sección para movela, duplicala, ocultala ou engadir elementos. Aquí á esquerda están as opcións de cada sección.'),
    el('button', { type: 'button', class: 'btn-ghost btn-peq', onclick: (e) => { e.currentTarget.parentElement.remove(); try { localStorage.setItem('feira-axuda-editor', '1'); } catch { /* */ } } }, 'Entendido')) : null;

  // ── Montaxe ──
  const columna = el('div', { class: 'ed-col' },
    el('div', { class: 'ed-barra' },
      el('a', { class: 'volver', href: op.volver[0] }, `← ${op.volver[1]}`),
      el('div', { class: 'ed-barra-dereita' },
        bDesfacer, bRefacer,
        novo ? null : el('button', { type: 'button', class: 'btn-ghost btn-peq', onclick: verHistorial }, 'Historial'),
        bGardar)),
    el('div', { class: 'ed-cab' }, tituloH, estadoPub),
    axuda, erros, pestanas, formEditor);
  const vista = el('div', { class: 'ed-vista' },
    el('div', { class: 'ed-vista-barra' },
      el('div', { class: 'segmentos', role: 'group', 'aria-label': 'Tamaño da vista previa' }, botonsDisp),
      el('span', { class: 'espazo' }),
      el('button', { type: 'button', class: 'btn-ghost btn-peq', title: 'Recargar a vista previa', onclick: recargarVista }, '⟳'),
      el('button', { type: 'button', class: 'btn-ghost btn-peq', title: 'Ver como quedará, sen ferramentas de edición', onclick: () => enviarVista('_blank') }, 'Previsualizar ↗'),
      verWeb),
    marco, fVista);

  main.classList.add('main-editor');
  main.replaceChildren(el('div', { class: 'ed-dividido' }, columna, vista));
  pintarEditor();
  // Os campos poden completar valores baleiros ao pintarse: o punto de partida é despois diso
  historia[0] = gardadoJSON = JSON.stringify(d);
  botonsHist();
  marcarSucio();
  setTimeout(() => { escalar(); enviarVista(); }, 0);
}
