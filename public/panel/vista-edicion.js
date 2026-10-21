// Edición directa sobre a vista previa do panel (cárgase só en /vista-previa, dentro do iframe do editor).
//  - Os textos con data-e edítanse escribindo enriba; os cambios van ao panel sen recargar.
//  - Premer unha imaxe permite cambiala; os botóns teñen 🔗 para a ligazón.
//  - Ao pasar o rato por unha sección aparece a súa barra (opcións, mover, duplicar, ocultar, borrar, engadir).
//  - Os elementos das listas (tarxetas, fitos, preguntas…) teñen a súa mini-barra (mover, duplicar, quitar).
(() => {
  const ORIXE = location.origin;
  const yInicial = Number(document.currentScript?.dataset.y || 0);
  const escalaInicial = Number(document.currentScript?.dataset.escala || 1);
  const avisar = (m) => parent.postMessage({ feira: 'vista', ...m }, ORIXE);
  const NOMES = {
    heroe: 'Portada', texto: 'Texto', texto_imaxe: 'Texto e imaxe', cifras: 'Cifras', tarxetas: 'Tarxetas', galeria: 'Galería', video: 'Vídeo',
    logos: 'Logos', programa: 'Programa', actividades: 'Actividades', cronoloxia: 'Cronoloxía', documentos: 'Documentos', lista: 'Lista',
    recursos: 'Recursos', cita: 'Cita', chamada: 'Chamada á acción', noticias: 'Noticias', edicions: 'Edicións', edicion_actual: 'Edición destacada',
    subpaxinas: 'Subpáxinas', formulario: 'Formulario', listado: 'Listado', columnas: 'Columnas', acordeon: 'Preguntas frecuentes', imaxe: 'Foto grande',
    html: 'HTML', presentacion: 'Presentación', _cabeceira: 'Cabeceira da páxina', _edicion: 'Presentación da edición', _recurso: 'Ficha do recurso',
  };
  // Que se engade co botón «+» de cada tipo de sección
  const ENGADIR = { actividades: 'Actividade', presentacion: 'Etiqueta', tarxetas: 'Tarxeta', cronoloxia: 'Fito', acordeon: 'Pregunta', documentos: 'Documento', lista: 'Elemento', cifras: 'Cifra', programa: 'Día', columnas: 'Bloque', heroe: 'Botón', chamada: 'Botón', texto_imaxe: 'Botón' };

  // ── Estilos do modo edición ──
  const css = document.createElement('style');
  css.textContent = `
    [data-e] { outline: 1px dashed transparent; outline-offset: 3px; border-radius: 3px; transition: outline-color .15s; cursor: text; }
    [data-sec]:hover [data-e], .previa-activa [data-e] { outline-color: rgb(123 75 183 / .35); }
    [data-e]:hover { outline-color: rgb(123 75 183 / .8) !important; }
    [data-e]:focus { outline: 2px solid #7b4bb7 !important; outline-offset: 3px; }
    [data-e]:empty::before { content: attr(data-ph); opacity: .45; font-style: italic; pointer-events: none; }
    [data-sec]:not(:hover):not(.previa-activa) [data-e]:empty:not(:focus) { display: none; }
    [data-sec]:not(:hover):not(.previa-activa) .sec-cab:not(:has([data-e]:not(:empty))) { display: none; }
    [data-et="imaxe"] { cursor: pointer; }
    [data-et="imaxe"]:hover { outline: 3px solid #7b4bb7 !important; filter: brightness(.92); }
    .previa-sen-imaxe { display: grid; place-items: center; min-height: 180px; border: 2px dashed rgb(123 75 183 / .45); border-radius: 18px; color: #7b4bb7; font-weight: 700; background: rgb(123 75 183 / .05); aspect-ratio: 4 / 3; }
    .tx-foto.previa-sen-imaxe { min-height: 120px; border-radius: 0; aspect-ratio: 16 / 10; }
    .previa-oculta { opacity: .45; position: relative; }
    .previa-oculta::after { content: 'Oculta na web'; position: absolute; top: calc(12px * var(--k)); left: calc(12px * var(--k)); background: #a86a00; color: #fff; font: 700 calc(12px * var(--k)) system-ui; padding: calc(4px * var(--k)) calc(10px * var(--k)); border-radius: 99px; z-index: 5; }
    .previa-sen-imaxe { font-size: calc(15px * var(--k)); }
    .previa-activa { box-shadow: inset 0 0 0 3px #3a8f4f !important; }
    [data-sec] { scroll-margin-top: 90px; }
    a::after { pointer-events: none; }
    /* --k compensa a escala da vista previa (no panel vese reducida): as barras sempre teñen o mesmo tamaño na pantalla */
    :root { --k: 1; }
    #fl-barra, #fl-item, #fl-rico, .fl-mais { position: absolute; z-index: 2147483000; font: 600 calc(13px * var(--k)) system-ui, sans-serif; }
    #fl-barra { display: none; align-items: center; gap: calc(2px * var(--k)); background: #1a1428; color: #fff; padding: calc(4px * var(--k)); border-radius: calc(10px * var(--k)); box-shadow: 0 8px 24px rgb(0 0 0 / .3); }
    #fl-barra .nome { padding: 0 calc(8px * var(--k)) 0 calc(6px * var(--k)); font-weight: 700; white-space: nowrap; }
    #fl-barra button, #fl-item button, #fl-rico button { border: 0; background: transparent; color: inherit; min-width: calc(30px * var(--k)); height: calc(30px * var(--k)); border-radius: calc(7px * var(--k)); cursor: pointer; font: inherit; padding: 0 calc(6px * var(--k)); }
    #fl-barra button:hover, #fl-rico button:hover { background: rgb(255 255 255 / .15); }
    #fl-barra button.mais { background: #3c783c; padding: 0 calc(10px * var(--k)); }
    #fl-item { display: none; gap: 1px; background: #fff; color: #1a1428; padding: calc(3px * var(--k)); border-radius: calc(9px * var(--k)); box-shadow: 0 4px 16px rgb(0 0 0 / .22); border: 1px solid #ddd; }
    #fl-item button:hover { background: #f0ecf8; }
    #fl-rico { display: none; gap: 1px; background: #1a1428; color: #fff; padding: calc(4px * var(--k)); border-radius: calc(10px * var(--k)); box-shadow: 0 8px 24px rgb(0 0 0 / .3); }
    #fl-rico .sep { width: 1px; background: rgb(255 255 255 / .2); margin: calc(4px * var(--k)) 3px; }
    .fl-mais { display: none; transform: translate(-50%, -50%); border: 0; background: #3c783c; color: #fff; border-radius: 99px; padding: calc(7px * var(--k)) calc(14px * var(--k)); cursor: pointer; box-shadow: 0 4px 14px rgb(0 0 0 / .25); }
    [data-e]:focus, [data-et="imaxe"]:hover { outline-width: calc(2px * var(--k)) !important; }
    .fl-mais:hover { background: #2d5c2d; }
    [data-item]:hover { outline: 1px solid rgb(60 120 60 / .5); outline-offset: 4px; border-radius: 6px; }
  `;
  document.head.append(css);
  document.documentElement.style.setProperty('--k', String(Math.min(2.5, 1 / (escalaInicial || 1))));

  const caixa = (e) => (e && getComputedStyle(e).display === 'contents' ? e.firstElementChild : e);
  const secDe = (n) => n?.closest?.('[data-sec]');
  const secId = (n) => secDe(n)?.dataset.sec;
  const tipoDe = (s) => s?.dataset.secTipo || s?.querySelector('[data-sec-tipo]')?.dataset.secTipo || '';

  // ── Textos editables ──
  const valorDe = (el) => {
    const t = el.dataset.et;
    if (t === 'rico') return el.innerHTML.trim();
    return el.innerText.replace(/\s*\n+\s*/g, ' ').replace(/\s+/g, ' ').trim();
  };
  const rutaDe = (el) => (el.dataset.et === 'ligazon' ? `${el.dataset.e}.texto` : el.dataset.e);
  const temporizadores = new WeakMap();
  function enviarCambio(el) {
    clearTimeout(temporizadores.get(el));
    temporizadores.set(el, setTimeout(() => avisar({ tipo: 'cambio', seccion: secId(el), ruta: rutaDe(el), valor: valorDe(el) }), 200));
  }
  document.querySelectorAll('[data-e]').forEach((el) => {
    const t = el.dataset.et;
    if (t === 'imaxe') return;
    if (t === 'rico') el.contentEditable = 'true';
    else {
      el.contentEditable = 'plaintext-only';
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    }
    el.spellcheck = true;
    el.addEventListener('input', () => {
      if (!el.textContent.trim() && !el.querySelector('img')) el.innerHTML = '';
      enviarCambio(el);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && t !== 'rico') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') el.blur();
    });
    el.addEventListener('blur', () => { clearTimeout(temporizadores.get(el)); avisar({ tipo: 'cambio', seccion: secId(el), ruta: rutaDe(el), valor: valorDe(el) }); });
    if (t === 'rico') {
      // Pegar como texto simple (en parágrafos), para non traer formatos estraños
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        const txt = e.clipboardData.getData('text/plain');
        const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
        const html = txt.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
        document.execCommand('insertHTML', false, html);
      });
    } else {
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\s+/g, ' '));
      });
    }
  });

  // ── Clics: non navegar, imaxes, selección de sección ──
  document.addEventListener('click', (e) => {
    if (e.target.closest('#fl-barra, #fl-item, #fl-rico, .fl-mais')) return;
    const a = e.target.closest('a');
    if (a) e.preventDefault();
    const sum = e.target.closest('summary');
    if (sum && e.target.closest('[data-e]')) e.preventDefault();
    const img = e.target.closest('[data-et="imaxe"]');
    if (img) {
      e.preventDefault();
      e.stopPropagation();
      avisar({ tipo: 'imaxe', seccion: secId(img), ruta: img.dataset.e });
      return;
    }
    const s = secDe(e.target);
    if (s) seleccionar(s, true);
  }, true);
  document.addEventListener('submit', (e) => e.preventDefault(), true);

  let activa = null;
  function seleccionar(s, avisarPanel) {
    document.querySelectorAll('.previa-activa').forEach((x) => x.classList.remove('previa-activa'));
    activa = s;
    caixa(s)?.classList.add('previa-activa');
    if (avisarPanel) avisar({ tipo: 'seleccion', seccion: s.dataset.sec });
    colocarBarra(s);
  }

  // ── Barra de sección ──
  const barra = document.createElement('div');
  barra.id = 'fl-barra';
  const mais = document.createElement('button');
  mais.className = 'fl-mais';
  mais.type = 'button';
  mais.textContent = '+ Engadir sección';
  document.body.append(barra, mais);
  let barraDe = null;
  const boton = (txt, titulo, fn, clase = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = txt;
    b.title = titulo;
    b.setAttribute('aria-label', titulo);
    if (clase) b.className = clase;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
    return b;
  };
  function colocarBarra(s) {
    if (!s) return;
    barraDe = s;
    const id = s.dataset.sec;
    const tipo = tipoDe(s);
    const especial = id.startsWith('_');
    const oculta = caixa(s)?.classList.contains('previa-oculta');
    const accion = (a) => () => avisar({ tipo: 'accion', accion: a, seccion: id });
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = NOMES[tipo] ?? NOMES[id] ?? 'Sección';
    const foto = s.dataset.eFoto || caixa(s)?.dataset.eFoto;
    barra.replaceChildren(
      nome,
      boton('⚙', 'Opcións da sección (no panel)', accion('axustes')),
      foto ? boton('🖼', 'Cambiar a foto de fondo', () => avisar({ tipo: 'imaxe', seccion: id, ruta: foto })) : '',
      ...(especial ? [] : [
        ENGADIR[tipo] ? boton(`+ ${ENGADIR[tipo]}`, `Engadir ${ENGADIR[tipo].toLowerCase()}`, accion('engadirElemento'), 'mais') : '',
        boton('↑', 'Subir', accion('subir')),
        boton('↓', 'Baixar', accion('baixar')),
        boton('⧉', 'Duplicar', accion('duplicar')),
        boton(oculta ? '◌' : '◉', oculta ? 'Mostrar na web' : 'Ocultar na web', accion('ocultar')),
        boton('🗑', 'Borrar sección', accion('borrar')),
      ]),
    );
    const r = caixa(s).getBoundingClientRect();
    barra.style.display = 'flex';
    const ancho = barra.offsetWidth;
    const k = Number(getComputedStyle(document.documentElement).getPropertyValue('--k')) || 1;
    barra.style.top = `${Math.max(scrollY + 70, r.top + scrollY + 10 * k)}px`;
    barra.style.left = `${Math.max(8, Math.min(innerWidth - ancho - 12, r.right + scrollX - ancho - 12))}px`;
    // «+ Engadir sección» no bordo inferior
    mais.style.display = 'block';
    mais.style.top = `${r.bottom + scrollY}px`;
    mais.style.left = `${r.left + scrollX + r.width / 2}px`;
    mais.onclick = (e) => { e.preventDefault(); e.stopPropagation(); avisar({ tipo: 'engadir', despois: id }); };
  }
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('#fl-barra, #fl-item, #fl-rico, .fl-mais')) return;
    const s = secDe(e.target);
    if (s && s !== barraDe) colocarBarra(s);
    const it = e.target.closest('[data-item]');
    if (it) colocarItem(it);
  });

  // ── Mini-barra dos elementos dunha lista ──
  const barraItem = document.createElement('div');
  barraItem.id = 'fl-item';
  document.body.append(barraItem);
  let itemDe = null;
  function colocarItem(it) {
    if (it === itemDe) return;
    itemDe = it;
    const s = secDe(it);
    const op = (o) => () => avisar({ tipo: 'item', op: o, seccion: s.dataset.sec, ruta: it.dataset.item });
    const horiz = getComputedStyle(it.parentElement).display.includes('grid') || getComputedStyle(it.parentElement).flexDirection === 'row';
    barraItem.replaceChildren(
      boton(horiz ? '←' : '↑', 'Mover antes', op('antes')),
      boton(horiz ? '→' : '↓', 'Mover despois', op('despois')),
      it.dataset.urlRuta ? boton('🔗', 'Ligazón', () => avisar({ tipo: 'ligazon', seccion: s.dataset.sec, ruta: it.dataset.urlRuta })) : '',
      boton('⧉', 'Duplicar', op('duplicar')),
      boton('✕', 'Quitar', op('quitar')),
    );
    const r = it.getBoundingClientRect();
    barraItem.style.display = 'flex';
    const k = Number(getComputedStyle(document.documentElement).getPropertyValue('--k')) || 1;
    barraItem.style.top = `${r.top + scrollY - 16 * k}px`;
    barraItem.style.left = `${Math.max(4, r.right + scrollX - barraItem.offsetWidth)}px`;
  }
  document.addEventListener('mouseleave', () => { barraItem.style.display = 'none'; itemDe = null; });

  // ── Barra de formato (texto rico) e ligazón dos botóns ──
  const rico = document.createElement('div');
  rico.id = 'fl-rico';
  document.body.append(rico);
  let enfocado = null;
  let rangoGardado = null;
  const cmd = (c, v) => () => { document.execCommand(c, false, v); enfocado && enviarCambio(enfocado); };
  const sep = () => Object.assign(document.createElement('span'), { className: 'sep' });
  function mostrarRico(el) {
    enfocado = el;
    if (el.dataset.et === 'rico') {
      rico.replaceChildren(
        boton('B', 'Negriña', cmd('bold')), boton('I', 'Cursiva', cmd('italic')), sep(),
        boton('H2', 'Título', cmd('formatBlock', 'h2')), boton('H3', 'Subtítulo', cmd('formatBlock', 'h3')), boton('¶', 'Parágrafo', cmd('formatBlock', 'p')), sep(),
        boton('•', 'Lista', cmd('insertUnorderedList')), boton('1.', 'Lista numerada', cmd('insertOrderedList')), boton('❝', 'Cita', cmd('formatBlock', 'blockquote')), sep(),
        boton('🔗', 'Ligazón', () => { const sel = getSelection(); rangoGardado = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null; avisar({ tipo: 'pedirLigazon' }); }),
        boton('⛓', 'Quitar ligazón', cmd('unlink')), boton('⌫', 'Quitar formato', cmd('removeFormat')),
      );
    } else if (el.dataset.et === 'ligazon') {
      rico.replaceChildren(boton('🔗 Ligazón e estilo do botón', 'Cambiar a ligazón', () => avisar({ tipo: 'ligazon', seccion: secId(el), ruta: el.dataset.e, boton: true })));
    } else return ocultarRico();
    const r = el.getBoundingClientRect();
    rico.style.display = 'flex';
    rico.style.top = `${Math.max(scrollY + 4, r.top + scrollY - rico.offsetHeight - 10)}px`;
    rico.style.left = `${Math.max(4, Math.min(innerWidth - rico.offsetWidth - 8, r.left + scrollX))}px`;
  }
  function ocultarRico() { rico.style.display = 'none'; enfocado = null; }
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-e]'); if (el) mostrarRico(el); });
  document.addEventListener('focusout', (e) => { if (!e.relatedTarget?.closest?.('#fl-rico')) setTimeout(() => { if (!document.activeElement?.closest?.('[data-e]')) ocultarRico(); }, 150); });

  // ── Teclado: gardar, desfacer e refacer fóra dos textos ──
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); document.activeElement?.blur?.(); setTimeout(() => avisar({ tipo: 'teclado', tecla: 's' }), 250); return; }
    if (document.activeElement?.closest?.('[data-e]')) return;
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); avisar({ tipo: 'teclado', tecla: 'z' }); }
    if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); avisar({ tipo: 'teclado', tecla: 'y' }); }
  });

  // ── Mensaxes do panel ──
  window.addEventListener('message', (e) => {
    if (e.origin !== ORIXE || e.source !== parent) return;
    const m = e.data || {};
    if (m.feira === 'ir') {
      const s = document.querySelector(`[data-sec="${CSS.escape(m.seccion)}"]`);
      if (!s) return;
      seleccionar(s, false);
      if (m.desprazar) caixa(s).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (m.feira === 'escala' && m.valor > 0) {
      document.documentElement.style.setProperty('--k', String(Math.min(2.5, 1 / m.valor)));
      if (barraDe) colocarBarra(barraDe);
    }
    if (m.feira === 'ligazon' && m.url && rangoGardado && enfocado) {
      enfocado.focus();
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(rangoGardado);
      document.execCommand('createLink', false, m.url);
      enviarCambio(enfocado);
    }
  });

  // ── Posición do scroll (para manter o sitio ao recargar) ──
  const restaurar = () => window.scrollTo(0, yInicial);
  restaurar();
  addEventListener('load', restaurar);
  let t;
  addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => { avisar({ tipo: 'scroll', y: Math.round(scrollY) }); if (barraDe) colocarBarra(barraDe); }, 120);
  }, { passive: true });
  addEventListener('resize', () => barraDe && colocarBarra(barraDe));
  avisar({ tipo: 'listo' });
})();
