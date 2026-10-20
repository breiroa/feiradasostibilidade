// Seccións do panel que non son listas de contido: inicio, páxinas, axustes, biblioteca,
// inscricións, administración e conta.
import { api, aviso, caixaErros, coleccion, confirmar, copiar, dataCurta, el, estado, gardar, invalidar, mediaUrl, modal } from './nucleo.js';
import { conProgreso, subirFicheiro, subirImaxe, zonaSoltar } from './imaxes.js';
import { sucio } from './coleccions.js';
import * as c from './campos.js';

const cab = (titulo, intro, ...extra) => el('div', { class: 'cab' }, el('div', {}, el('h1', {}, titulo), intro ? el('p', { class: 'muted' }, intro) : null), ...extra);
const tiposInsc = { centro: 'Centro educativo', entidade: 'Entidade', prensa: 'Prensa', contacto: 'Consulta' };
const estadosInsc = { nova: ['Nova', 'morado'], vista: ['Vista', ''], aceptada: ['Aceptada', 'verde'], descartada: ['Descartada', 'erro'] };

// ───────────────── INICIO ─────────────────
export async function inicio(main) {
  const [eds, nots, recs, insc] = await Promise.all([coleccion('edicions', { forzar: true }), coleccion('noticias', { forzar: true }), coleccion('recursos', { forzar: true }), api('inscricions')]);
  const novas = insc.items.filter((i) => i.estado === 'nova');
  const tarx = (n, txt, href, destacada) => el('a', { class: `tarxeta${destacada ? ' destacada' : ''}`, href }, el('b', {}, String(n)), el('span', {}, txt));
  main.replaceChildren(
    cab(`Ola, ${estado.admin.nome.split(' ')[0]}`, 'Desde aquí xestionas toda a web da Feira. Os cambios vense ao momento.',
      el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver a web ↗')),
    el('div', { class: 'tarxetas' },
      tarx(novas.length, novas.length === 1 ? 'inscrición nova' : 'inscricións novas', '#/inscricions', novas.length > 0),
      tarx(eds.length, 'edicións', '#/edicions'),
      tarx(nots.length, 'noticias', '#/noticias'),
      tarx(recs.length, 'recursos', '#/recursos')),
    el('div', { class: 'caixa' },
      el('h2', {}, 'Accesos rápidos'),
      el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
        el('a', { class: 'btn', href: '#/noticias/novo' }, '+ Nova noticia'),
        el('a', { class: 'btn-ghost', href: '#/edicions' }, 'Editar edicións'),
        el('a', { class: 'btn-ghost', href: '#/paxinas' }, 'Textos das páxinas'),
        el('a', { class: 'btn-ghost', href: '#/biblioteca' }, 'Subir fotos'))),
    novas.length
      ? el('div', { class: 'caixa' }, el('h2', {}, 'Últimas inscricións'),
          el('ul', { style: { margin: '0', paddingLeft: '1.2em' } }, novas.slice(0, 5).map((i) => el('li', {}, el('a', { href: '#/inscricions' }, `${tiposInsc[i.tipo]}: ${i.datos.centro ?? i.datos.entidade ?? i.datos.medio ?? i.datos.persoa}`), ' · ', el('span', { class: 'muted' }, dataCurta(i.creado))))))
      : null,
  );
}

// ───────────────── PÁXINAS ─────────────────
const lista2 = (it, a, b, ea, eb) => el('div', { class: 'fila2' }, c.texto(it, a, ea), c.texto(it, b, eb));
const paxinas = {
  inicio: {
    titulo: 'Inicio (portada)', ver: '/',
    editor: (d) => [
      c.bloque('Cabeceira', null,
        c.texto(d, 'heroEtiqueta', 'Etiqueta superior'),
        lista2(d, 'heroTitulo', 'heroDestaque', 'Título', 'Título destacado (cor)'),
        c.area(d, 'heroTexto', 'Texto'),
        c.imaxe(d, 'heroImaxe', 'Foto', { claveAlt: 'heroImaxeAlt' })),
      c.bloque('Cifras da cabeceira', null, c.repetidor(d, 'cifras', '', { novo: () => ({ valor: '', etiqueta: '' }), pintarItem: (it) => lista2(it, 'valor', 'etiqueta', 'Número', 'Texto'), engadirTexto: '+ Engadir cifra' })),
      c.bloque('Seccións', null,
        c.texto(d, 'edicionsTitulo', 'Título de «As edicións»'), c.area(d, 'edicionsTexto', 'Texto de «As edicións»', { filas: 2 }),
        lista2(d, 'cita', 'citaDestaque', 'Frase da franxa verde', 'Final destacado'),
        c.texto(d, 'ecosistemaTitulo', 'Título de «O ecosistema»'), c.area(d, 'ecosistemaTexto', 'Texto de «O ecosistema»', { filas: 2 }),
        c.entidades(d, 'ecosistemaEntidades', 'Entidades de «O ecosistema»'),
        c.texto(d, 'participaTitulo', 'Título do bloque Participa'), c.area(d, 'participaTexto', 'Texto do bloque Participa', { filas: 2 })),
    ],
  },
  'a-feira': {
    titulo: 'A Feira', ver: '/a-feira/',
    editor: (d) => [
      c.bloque('Cabeceira', null, c.texto(d, 'heroEtiqueta', 'Etiqueta superior'), lista2(d, 'heroTitulo', 'heroDestaque', 'Título', 'Título destacado (cor)'), c.area(d, 'heroTexto', 'Texto'), c.imaxe(d, 'heroImaxe', 'Foto', { claveAlt: 'heroImaxeAlt' })),
      c.bloque('O movemento', null, c.texto(d, 'introTitulo', 'Título'), c.rico(d, 'introCorpo', 'Texto'), c.imaxe(d, 'introImaxe', 'Foto', { claveAlt: 'introImaxeAlt' })),
      c.bloque('Metodoloxías', null, c.texto(d, 'metodoloxiasTitulo', 'Título'),
        c.repetidor(d, 'metodoloxias', '', { novo: () => ({ sigla: '', nome: '', lema: '', texto: '' }), engadirTexto: '+ Engadir metodoloxía', pintarItem: (m) => [el('div', { class: 'fila3' }, c.texto(m, 'sigla', 'Sigla'), el('div', { style: { gridColumn: 'span 2' } }, c.texto(m, 'nome', 'Nome'))), c.texto(m, 'lema', 'Lema'), c.area(m, 'texto', 'Texto', { filas: 2 })] })),
      c.bloque('Liñas de traballo', null, c.texto(d, 'linhasTitulo', 'Título'), c.area(d, 'linhasTexto', 'Texto', { filas: 2 }),
        c.repetidor(d, 'linhas', '', { novo: () => ({ titulo: '', texto: '', ods: '' }), engadirTexto: '+ Engadir liña', pintarItem: (l) => [c.texto(l, 'titulo', 'Título'), c.area(l, 'texto', 'Texto', { filas: 2 }), c.texto(l, 'ods', 'ODS', { placeholder: 'ODS 7 · ODS 13' })] })),
      c.bloque('Premios', null, c.texto(d, 'premiosTitulo', 'Título'),
        c.repetidor(d, 'premios', '', { novo: () => ({ ano: '', texto: '' }), engadirTexto: '+ Engadir premio', pintarItem: (p) => [c.texto(p, 'ano', 'Ano'), c.area(p, 'texto', 'Premio', { filas: 2 })] })),
    ],
  },
  participa: {
    titulo: 'Participa', ver: '/participa/',
    editor: (d) => [
      c.bloque('Cabeceira', null, lista2(d, 'heroTitulo', 'heroDestaque', 'Título', 'Título destacado (cor)'), c.area(d, 'heroTexto', 'Texto'),
        c.repetidor(d, 'datas', 'Datas clave', { novo: () => ({ data: '', texto: '' }), engadirTexto: '+ Engadir data', pintarItem: (x) => lista2(x, 'data', 'texto', 'Data', 'Que pasa') })),
      c.bloque('Perfís', 'Cada perfil ten un botón que abre o formulario axeitado (centros → formulario de centros; entidades e empresas → formulario de entidades; prensa → prensa).',
        c.repetidor(d, 'perfis', '', {
          novo: () => ({ id: 'entidade', titulo: '', texto: '', accions: [], boton: '' }),
          engadirTexto: '+ Engadir perfil',
          pintarItem: (p) => [
            el('div', { class: 'fila2' }, c.texto(p, 'titulo', 'Título'), c.escolla(p, 'id', 'Formulario que abre', [{ valor: 'centro', texto: 'Centros' }, { valor: 'entidade', texto: 'Entidades' }, { valor: 'empresa', texto: 'Empresas (formulario de entidades)' }, { valor: 'prensa', texto: 'Prensa' }])),
            c.area(p, 'texto', 'Texto', { filas: 2 }), c.listaTextos(p, 'accions', 'Que poden facer'), c.texto(p, 'boton', 'Texto do botón'),
          ],
        })),
      c.bloque('Formulario', null, c.texto(d, 'formularioTitulo', 'Título'), c.area(d, 'formularioTexto', 'Texto', { filas: 2 }), lista2(d, 'graciasTitulo', 'graciasTexto', 'Mensaxe de grazas: título', 'Mensaxe de grazas: texto')),
    ],
  },
  'aviso-legal': {
    titulo: 'Aviso legal e privacidade', ver: '/aviso-legal/',
    editor: (d) => [c.bloque('Texto', null, c.rico(d, 'corpo', ''))],
  },
};

export async function listaPaxinas(main) {
  main.replaceChildren(cab('Textos das páxinas', 'Os textos fixos de cada páxina da web.'),
    el('div', { class: 'tarxetas' }, Object.entries(paxinas).map(([id, p]) => el('a', { class: 'tarxeta', href: `#/paxinas/${id}` }, el('b', { style: { fontSize: '1.15rem' } }, p.titulo), el('span', {}, 'Editar textos →')))));
}

export async function editarPaxina(main, id) {
  const p = paxinas[id];
  if (!p) return listaPaxinas(main);
  const items = await coleccion('paxinas', { forzar: true });
  const d = structuredClone(items.find((x) => x.id === id)?.datos ?? {});
  await editorSimple(main, { titulo: p.titulo, volver: ['#/paxinas', 'Textos das páxinas'], ver: p.ver, campos: p.editor(d), gardar: () => api('documentos', { metodo: 'POST', datos: { coleccion: 'paxinas', id, datos: d } }), aoGardar: () => invalidar('paxinas') });
}

/** Editor dun único documento (páxinas, axustes) */
async function editorSimple(main, { titulo, intro, volver, ver, campos, gardar: fn, aoGardar }) {
  const erros = el('div');
  const f = el('form', { novalidate: true, onsubmit: (e) => e.preventDefault(), oninput: () => { sucio.valor = true; }, onchange: () => { sucio.valor = true; } },
    ...campos,
    el('div', { class: 'accions-form' },
      el('button', { class: 'btn', type: 'button', onclick: async () => {
        erros.replaceChildren();
        try { await gardar(fn); sucio.valor = false; aoGardar?.(); } catch (e) { if (e.erros) erros.replaceChildren(caixaErros(e.erros)); }
      } }, 'Gardar cambios'),
      el('span', { class: 'espazo' }),
      ver ? el('a', { class: 'btn-ghost', href: ver, target: '_blank' }, 'Ver na web ↗') : null));
  main.replaceChildren(volver ? el('a', { class: 'volver', href: volver[0] }, `← ${volver[1]}`) : null, cab(titulo, intro), erros, f);
  sucio.valor = false;
}

// ───────────────── AXUSTES ─────────────────
export async function axustes(main) {
  const [items, eds] = await Promise.all([coleccion('axustes', { forzar: true }), coleccion('edicions', { forzar: true })]);
  const d = structuredClone(items.find((x) => x.id === 'xeral')?.datos ?? {});
  d.pe ??= { texto: '', grupos: [] };
  await editorSimple(main, {
    titulo: 'Axustes xerais',
    intro: 'Nome da web, edición destacada, redes e pé de páxina.',
    campos: [
      c.bloque('Web', null,
        el('div', { class: 'fila2' }, c.texto(d, 'nome', 'Nome', { obrig: true }), c.texto(d, 'lema', 'Lema', { obrig: true })),
        c.area(d, 'descricion', 'Descrición (para buscadores e redes)', { obrig: true, filas: 2 }),
        c.escolla(d, 'edicionActual', 'Edición destacada', eds.sort((a, b) => b.datos.ano - a.datos.ano).map((e) => ({ valor: e.id, texto: e.datos.titulo })), { axuda: 'Sae no botón do menú, na portada e no pé.' })),
      c.bloque('Contacto e redes', null,
        el('div', { class: 'fila2' }, c.texto(d, 'instagram', 'Instagram (enderezo)', { tipo: 'url' }), c.texto(d, 'instagramUsuario', 'Instagram (@usuario)')),
        el('div', { class: 'fila2' }, c.texto(d, 'correo', 'Correo de contacto', { tipo: 'email' }), c.texto(d, 'webIes', 'Web do IES', { tipo: 'url' }))),
      c.bloque('Pé de páxina', 'Grupos de logos que saen en todas as páxinas.',
        c.area(d.pe, 'texto', 'Texto do pé', { filas: 2 }),
        c.repetidor(d.pe, 'grupos', 'Grupos de logos', {
          novo: () => ({ titulo: '', entidades: [] }),
          engadirTexto: '+ Engadir grupo',
          pintarItem: (g) => [el('div', { class: 'fila2' }, c.texto(g, 'titulo', 'Título', { placeholder: 'Organiza' }), c.texto(g, 'nota', 'Nota pequena (opcional)')), c.entidades(g, 'entidades', 'Entidades')],
        })),
      c.bloque('Copia de seguridade', 'Descarga todos os textos e inscricións nun ficheiro. A base de datos garda ademais copias automáticas dos últimos 7 días.',
        el('a', { class: 'btn-ghost', href: '/api/panel/copia', download: '' }, 'Descargar copia (JSON)')),
    ],
    gardar: () => api('documentos', { metodo: 'POST', datos: { coleccion: 'axustes', id: 'xeral', datos: d } }),
    aoGardar: () => invalidar('axustes'),
  });
}

// ───────────────── BIBLIOTECA ─────────────────
export async function biblioteca(main) {
  const { items } = await api('media');
  let filtro = 'todas';
  const grella = el('div', { class: 'bib-grella' });
  const chips = el('div', { class: 'filtro-chips' });
  const estadoSub = el('div');
  const etiquetas = ['xeral', 'logos', 'edicions', 'noticias', 'recursos', 'documentos'];
  let etiquetaSubida = 'xeral';
  const kb = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

  function pintar() {
    const conta = (t) => items.filter((m) => t === 'todas' || m.etiqueta === t).length;
    chips.replaceChildren(...['todas', ...etiquetas].filter((t) => t === 'todas' || conta(t)).map((t) => el('button', { type: 'button', class: t === filtro ? 'on' : '', onclick: () => { filtro = t; pintar(); } }, `${t} (${conta(t)})`)));
    const vistos = items.filter((m) => filtro === 'todas' || m.etiqueta === filtro);
    grella.replaceChildren(...(vistos.length ? vistos.map(item) : [el('p', { class: 'muted' }, 'Non hai ficheiros.')]));
  }
  function item(m) {
    const imx = m.tipo.startsWith('image/');
    return el('div', { class: `bib-item${m.usado ? '' : ' sen-uso'}` },
      imx ? el('img', { class: 'bib-thumb', src: mediaUrl(m.id, m.variantes.includes('m') ? 'm' : 'g'), alt: m.alt || '' }) : el('div', { class: 'bib-thumb doc' }, 'PDF'),
      el('div', { class: 'bib-meta' }, el('b', {}, m.nome), `${m.ancho ? `${m.ancho}×${m.alto} · ` : ''}${kb(m.bytes)} · ${m.etiqueta}`, m.usado ? null : el('span', {}, 'Sen usar'), imx && !m.alt ? el('span', { style: { color: 'var(--aviso)' } }, 'Falta descrición') : null),
      el('div', { class: 'bib-accions' },
        el('button', { class: 'btn-mini', type: 'button', onclick: () => editar(m) }, 'Editar'),
        el('button', { class: 'btn-mini', type: 'button', onclick: () => copiar(location.origin + mediaUrl(m.id, imx ? 'g' : 'f')) }, 'Copiar URL'),
        m.usado ? null : el('button', { class: 'btn-mini', type: 'button', style: { color: 'var(--err)' }, onclick: () => borrar(m) }, 'Borrar')));
  }
  function editar(m) {
    const d = { alt: m.alt, nome: m.nome, etiqueta: m.etiqueta };
    const md = modal('Editar ficheiro', el('div', {},
      m.tipo.startsWith('image/') ? el('img', { src: mediaUrl(m.id, 'g'), alt: '', style: { maxWidth: '100%', maxHeight: '260px', display: 'block', margin: '0 auto 14px', borderRadius: '8px' } }) : null,
      c.texto(d, 'nome', 'Nome'),
      m.tipo.startsWith('image/') ? c.area(d, 'alt', 'Descrición (texto alternativo)', { filas: 2, axuda: 'Que se ve na imaxe. Úsase cando a imaxe se escolle desde a biblioteca.' }) : null,
      c.escolla(d, 'etiqueta', 'Carpeta', etiquetas.map((t) => ({ valor: t, texto: t })))), {
      botons: [el('button', { class: 'btn-ghost', type: 'button', onclick: () => md.pechar() }, 'Cancelar'),
        el('button', { class: 'btn', type: 'button', onclick: async () => { await gardar(() => api('media', { metodo: 'PATCH', datos: { id: m.id, ...d } })); Object.assign(m, d); md.pechar(); pintar(); } }, 'Gardar')],
    });
  }
  async function borrar(m) {
    if (!(await confirmar(`Borrar «${m.nome}»?`))) return;
    await gardar(() => api('media', { metodo: 'DELETE', datos: { id: m.id } }), { mensaxe: 'Borrado' });
    items.splice(items.indexOf(m), 1);
    pintar();
  }
  const zona = zonaSoltar({
    texto: 'Arrastra aquí fotos ou PDF, ou',
    multiple: true,
    aceptar: 'image/*,application/pdf',
    aoSoltar: async (fs) => {
      for (const [n, f] of fs.entries()) {
        const pdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        const novo = await conProgreso(estadoSub, `Subindo ${n + 1} de ${fs.length}…`, () => (pdf ? subirFicheiro(f) : subirImaxe(f, { etiqueta: etiquetaSubida, logo: etiquetaSubida === 'logos' })));
        if (novo) items.unshift(novo);
      }
      pintar();
    },
  });
  const selEt = el('select', { onchange: (e) => { etiquetaSubida = e.target.value; } }, etiquetas.filter((t) => t !== 'documentos').map((t) => el('option', { value: t }, t)));
  main.replaceChildren(
    cab('Biblioteca', 'Todas as imaxes e documentos. As fotos optimízanse automaticamente ao subilas. Só se pode borrar o que non se usa.'),
    el('div', { class: 'caixa' }, el('div', { class: 'barra-filtros', style: { margin: '0 0 10px' } }, el('span', { class: 'muted' }, 'Gardar as imaxes novas en:'), selEt), zona, estadoSub),
    chips, grella);
  pintar();
}

// ───────────────── INSCRICIÓNS ─────────────────
export async function inscricions(main) {
  const { items } = await api('inscricions');
  const f = { tipo: '', estado: '' };
  const tbody = el('tbody');
  const nomeDe = (i) => i.datos.centro ?? i.datos.entidade ?? i.datos.medio ?? i.datos.persoa ?? '—';
  function pintar() {
    const vistos = items.filter((i) => (!f.tipo || i.tipo === f.tipo) && (!f.estado || i.estado === f.estado));
    tbody.replaceChildren(...(vistos.length ? vistos.map((i) => {
      const [txt, cor] = estadosInsc[i.estado] ?? [i.estado, ''];
      const tr = el('tr', { class: 'clicable', onclick: () => detalle(i) },
        el('td', { class: 'muted' }, dataCurta(i.creado)),
        el('td', {}, el('span', { class: 'pill' }, tiposInsc[i.tipo] ?? i.tipo)),
        el('td', {}, el('b', {}, nomeDe(i)), el('br'), el('small', { class: 'muted' }, i.datos.email ?? '')),
        el('td', {}, i.datos.proposta ?? i.datos.tipoEntidade ?? ''),
        el('td', {}, el('span', { class: `pill ${cor}` }, txt)));
      return tr;
    }) : [el('tr', {}, el('td', { colspan: 5, class: 'muted' }, items.length ? 'Ningunha coincide cos filtros.' : 'Aínda non chegou ningunha inscrición desde Participa.'))]));
  }
  async function cambiar(i, cambios) {
    await gardar(() => api('inscricions', { metodo: 'PATCH', datos: { id: i.id, ...cambios } }), { mensaxe: 'Gardado' });
    Object.assign(i, cambios);
    pintar();
  }
  function detalle(i) {
    if (i.estado === 'nova') cambiar(i, { estado: 'vista' });
    const notas = { notas: i.notas ?? '' };
    const est = { estado: i.estado === 'nova' ? 'vista' : i.estado };
    const md = modal(`${tiposInsc[i.tipo]}: ${nomeDe(i)}`, el('div', {},
      el('dl', { class: 'datos-lista' }, el('dt', {}, 'Recibida'), el('dd', {}, i.creado), Object.entries(i.datos).map(([k, v]) => [el('dt', {}, k), el('dd', {}, k === 'email' ? el('a', { href: `mailto:${v}` }, v) : v)])),
      el('hr', { style: { border: '0', borderTop: '1px solid var(--line)', margin: '16px 0' } }),
      c.escolla(est, 'estado', 'Estado', Object.entries(estadosInsc).map(([k, [t]]) => ({ valor: k, texto: t }))),
      c.area(notas, 'notas', 'Notas internas', { filas: 3, axuda: 'Só se ven aquí no panel.' })), {
      ancho: true,
      botons: [
        el('button', { class: 'btn-danger', type: 'button', onclick: async () => { if (await confirmar('Borrar esta inscrición?')) { await gardar(() => api('inscricions', { metodo: 'DELETE', datos: { id: i.id } }), { mensaxe: 'Borrada' }); items.splice(items.indexOf(i), 1); md.pechar(); pintar(); } } }, 'Borrar'),
        el('button', { class: 'btn', type: 'button', onclick: async () => { await cambiar(i, { estado: est.estado, notas: notas.notas }); md.pechar(); } }, 'Gardar'),
      ],
    });
  }
  function csv() {
    const claves = [...new Set(items.flatMap((i) => Object.keys(i.datos)))];
    // Neutraliza fórmulas ao abrir en follas de cálculo
    const cela = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    const filas = [['data', 'tipo', 'estado', ...claves, 'notas'], ...items.map((i) => [i.creado, i.tipo, i.estado, ...claves.map((k) => i.datos[k]), i.notas])];
    const blob = new Blob(['﻿' + filas.map((f) => f.map(cela).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `inscricions-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  main.replaceChildren(
    cab('Inscricións', 'O que envía a xente desde a páxina Participa. Preme nunha fila para ver todo.', el('button', { class: 'btn-ghost', type: 'button', onclick: csv, disabled: !items.length }, 'Exportar CSV')),
    el('div', { class: 'barra-filtros' },
      el('select', { onchange: (e) => { f.tipo = e.target.value; pintar(); } }, el('option', { value: '' }, 'Todos os tipos'), Object.entries(tiposInsc).map(([k, v]) => el('option', { value: k }, v))),
      el('select', { onchange: (e) => { f.estado = e.target.value; pintar(); } }, el('option', { value: '' }, 'Todos os estados'), Object.entries(estadosInsc).map(([k, [t]]) => el('option', { value: k }, t)))),
    el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, ['Data', 'Tipo', 'Quen', 'Proposta', 'Estado'].map((t) => el('th', {}, t)))), tbody)));
  pintar();
}

// ───────────────── ADMINISTRACIÓN ─────────────────
export async function admins(main) {
  const { items } = await api('admins');
  const estados = { activa: ['Activa', 'verde'], 'sen-2fa': ['Sen 2FA', 'aviso'], convidada: ['Convite pendente', 'morado'] };
  const mostrarLigazon = (titulo, ligazon, texto) => {
    const md = modal(titulo, el('div', {},
      el('p', {}, texto),
      el('div', { class: 'ligazon-copiar' }, el('input', { type: 'text', value: ligazon, readOnly: true, onfocus: (e) => e.target.select() }), el('button', { class: 'btn', type: 'button', onclick: () => copiar(ligazon) }, 'Copiar')),
      el('p', { class: 'muted', style: { marginTop: '12px' } }, 'A ligazón vale durante 7 días e só se pode usar unha vez. Envíaa ti por correo ou mensaxe.')), {
      botons: [el('button', { class: 'btn-ghost', type: 'button', onclick: () => md.pechar() }, 'Feito')],
    });
  };
  const convidar = () => {
    const d = { nome: '', email: '', rol: 'admin' };
    const erros = el('div');
    const md = modal('Convidar a unha persoa', el('div', {}, erros, c.texto(d, 'nome', 'Nome', { obrig: true }), c.texto(d, 'email', 'Correo', { tipo: 'email', obrig: true }),
      c.escolla(d, 'rol', 'Permisos', [{ valor: 'admin', texto: 'Edición (contidos, inscricións, biblioteca)' }, { valor: 'superadmin', texto: 'Superadministración (ademais, xestiona persoas)' }])), {
      botons: [el('button', { class: 'btn-ghost', type: 'button', onclick: () => md.pechar() }, 'Cancelar'),
        el('button', { class: 'btn', type: 'button', onclick: async () => {
          try {
            const r = await api('admins', { metodo: 'POST', datos: { accion: 'convidar', ...d } });
            md.pechar();
            mostrarLigazon('Convite creado', r.ligazon, `Envíalle esta ligazón a ${d.nome}. Ao abrila definirá o seu contrasinal e activará a verificación en dous pasos.`);
            admins(main);
          } catch (e) { erros.replaceChildren(caixaErros(e.erros)); }
        } }, 'Crear convite')],
    });
  };
  const accion = async (a, datos, mensaxe) => { const r = await gardar(() => api('admins', { metodo: 'POST', datos: { accion: a, ...datos } }), { mensaxe }); return r; };
  main.replaceChildren(
    cab('Persoas administradoras', 'Quen pode entrar no panel. Todas teñen verificación en dous pasos obrigatoria.', el('button', { class: 'btn', type: 'button', onclick: convidar }, '+ Convidar')),
    el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' },
      el('thead', {}, el('tr', {}, ['Persoa', 'Permisos', 'Estado', 'Último acceso', ''].map((t) => el('th', {}, t)))),
      el('tbody', {}, items.map((a) => {
        const [et, cor] = estados[a.estado];
        const eu = a.id === estado.admin.id;
        return el('tr', {},
          el('td', {}, el('b', {}, a.nome, eu ? ' (ti)' : ''), el('br'), el('small', { class: 'muted' }, a.email)),
          el('td', {}, a.rol === 'superadmin' ? 'Superadministración' : 'Edición'),
          el('td', {}, el('span', { class: `pill ${cor}` }, et)),
          el('td', { class: 'muted' }, a.ultimoAcceso ? dataCurta(a.ultimoAcceso) : '—'),
          el('td', {}, el('div', { class: 'accions' },
            el('button', { class: 'btn-mini', type: 'button', title: 'Xera unha ligazón para definir (ou recuperar) o contrasinal', onclick: async () => { const r = await accion('novo-convite', { id: a.id }, null); mostrarLigazon('Ligazón de acceso', r.ligazon, `Envíalle esta ligazón a ${a.nome} para que defina un contrasinal novo.`); } }, 'Ligazón de acceso'),
            !eu && a.estado === 'activa' ? el('button', { class: 'btn-mini', type: 'button', onclick: async () => { if (await confirmar(`Restablecer a verificación en dous pasos de ${a.nome}? Terá que configurala de novo ao entrar.`, { boton: 'Restablecer', perigo: false })) { await accion('restablecer-2fa', { id: a.id }, '2FA restablecido'); admins(main); } } }, 'Restablecer 2FA') : null,
            !eu ? el('button', { class: 'btn-mini', type: 'button', onclick: async () => { await accion('rol', { id: a.id, rol: a.rol === 'superadmin' ? 'admin' : 'superadmin' }, 'Permisos cambiados'); admins(main); } }, a.rol === 'superadmin' ? 'Pasar a edición' : 'Facer superadmin') : null,
            !eu ? el('button', { class: 'icobtn perigo', type: 'button', title: 'Quitar acceso', onclick: async () => { if (await confirmar(`Quitar o acceso de ${a.nome}?`)) { await gardar(() => api('admins', { metodo: 'DELETE', datos: { id: a.id } }), { mensaxe: 'Acceso quitado' }); admins(main); } } }, '🗑') : null)));
      })))));
}

// ───────────────── A MIÑA CONTA ─────────────────
export async function conta(main, { aoRestablecer2fa }) {
  const pw = { actual: '', nova: '', repetir: '' };
  const erros = el('div');
  const pw2 = { actual: '' };
  main.replaceChildren(
    cab('A miña conta', `${estado.admin.nome} · ${estado.admin.email}`),
    erros,
    c.bloque('Cambiar contrasinal', 'Mínimo 12 caracteres. Pecharanse as túas outras sesións abertas.',
      c.texto(pw, 'actual', 'Contrasinal actual', { tipo: 'password' }),
      el('div', { class: 'fila2' }, c.texto(pw, 'nova', 'Novo contrasinal', { tipo: 'password' }), c.texto(pw, 'repetir', 'Repíteo', { tipo: 'password' })),
      el('div', { class: 'campo' }, el('button', { class: 'btn', type: 'button', onclick: async () => {
        erros.replaceChildren();
        if (pw.nova !== pw.repetir) return erros.replaceChildren(caixaErros(['Os dous contrasinais novos non coinciden.']));
        try { await gardar(() => api('conta', { metodo: 'POST', datos: { accion: 'cambiar-contrasinal', actual: pw.actual, nova: pw.nova } }), { mensaxe: 'Contrasinal cambiado' }); conta(main, { aoRestablecer2fa }); } catch (e) { erros.replaceChildren(caixaErros(e.erros)); }
      } }, 'Cambiar contrasinal'))),
    c.bloque('Verificación en dous pasos', 'Se cambiaches de teléfono, restablécea e volve configurala co novo.',
      c.texto(pw2, 'actual', 'Contrasinal actual', { tipo: 'password' }),
      el('div', { class: 'campo' }, el('button', { class: 'btn-ghost', type: 'button', onclick: async () => {
        erros.replaceChildren();
        if (!(await confirmar('Restablecer a túa verificación en dous pasos? Terás que escanear un QR novo agora mesmo.', { boton: 'Restablecer', perigo: false }))) return;
        try { await api('conta', { metodo: 'POST', datos: { accion: 'restablecer-2fa', actual: pw2.actual } }); aoRestablecer2fa(); } catch (e) { erros.replaceChildren(caixaErros(e.erros)); }
      } }, 'Restablecer 2FA'))),
  );
}

export { aviso };
