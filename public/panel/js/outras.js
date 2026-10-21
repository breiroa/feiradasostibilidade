// Seccións do panel que non son listas de contido: resumo, axustes, biblioteca, mensaxes do formulario,
// administración e conta.
import { api, aviso, caixaErros, coleccion, confirmar, copiar, dataCurta, dataHora, el, estado, gardar, invalidar, mediaUrl, modal } from './nucleo.js';
import { conProgreso, subirFicheiro, subirImaxe, zonaSoltar } from './imaxes.js';
import { sucio } from './coleccions.js';
import * as c from './campos.js';

const cab = (titulo, intro, ...extra) => el('div', { class: 'cab' }, el('div', {}, el('h1', {}, titulo), intro ? el('p', { class: 'muted' }, intro) : null), ...extra);
const tiposInsc = { centro: 'Centro educativo', entidade: 'Entidade', prensa: 'Prensa', contacto: 'Pregunta' };
const estadosInsc = { nova: ['Nova', 'morado'], vista: ['Vista', ''], aceptada: ['Aceptada', 'verde'], descartada: ['Descartada', 'erro'] };

// ───────────────── RESUMO ─────────────────
const accionsHist = { orixinal: 'versión inicial', creado: 'creou', gardado: 'gardou', restaurado: 'restaurou', borrado: 'borrou' };
const coleccionsHist = { paxinas_libres: ['páxina', 'paxinas'], noticias: ['noticia', 'noticias'], recursos: ['recurso', 'recursos'], entidades: ['entidade', 'entidades'], menus: ['menú', 'menus'], modelos: ['modelo', 'modelos'], estrutura: ['cabeceira e pé', 'estrutura'], axustes: ['axustes', 'axustes'] };
export async function inicio(main) {
  const [paxs, nots, recs, cambios] = await Promise.all([
    coleccion('paxinas_libres', { forzar: true }), coleccion('noticias', { forzar: true }), coleccion('recursos', { forzar: true }),
    api('versions?recentes=1').catch(() => ({ items: [] })),
  ]);
  const tarx = (n, txt, href) => el('a', { class: 'tarxeta', href }, el('b', {}, String(n)), el('span', {}, txt));
  const borradores = paxs.filter((p) => p.datos.borrador).length + nots.filter((n) => n.datos.borrador).length + recs.filter((r) => r.datos.borrador).length;
  main.replaceChildren(
    cab(`Ola, ${estado.admin.nome.split(' ')[0]}`, 'Desde aquí xestionas toda a web da Feira.',
      el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver a web ↗')),
    el('div', { class: 'tarxetas' },
      tarx(paxs.length, 'páxinas', '#/paxinas'),
      tarx(nots.length, 'noticias', '#/noticias'),
      tarx(recs.length, 'recursos', '#/recursos'),
      tarx(borradores, borradores === 1 ? 'borrador sen publicar' : 'borradores sen publicar', '#/paxinas')),
    el('div', { class: 'caixa' },
      el('h2', {}, 'Accesos rápidos'),
      el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
        el('a', { class: 'btn', href: '#/noticias/novo' }, '+ Nova noticia'),
        el('a', { class: 'btn-ghost', href: '#/paxinas' }, 'Páxinas'),
        el('a', { class: 'btn-ghost', href: '#/menus' }, 'Menús'),
        el('a', { class: 'btn-ghost', href: '#/biblioteca' }, 'Subir fotos'),
        el('a', { class: 'btn-ghost', href: '#/diagnostico' }, 'Diagnóstico'))),
    cambios.items?.length
      ? el('div', { class: 'caixa' }, el('h2', {}, 'Últimos cambios'),
          el('ul', { class: 'lista-cambios' }, cambios.items.filter((v) => coleccionsHist[v.coleccion]).map((v) => {
            const [nome, ruta] = coleccionsHist[v.coleccion] ?? [v.coleccion, ''];
            const destino = v.accion !== 'borrado' && ruta ? `#/${ruta}${['estrutura', 'axustes'].includes(v.coleccion) ? '' : `/${v.docId}`}` : null;
            return el('li', {}, el('span', { class: 'muted' }, dataHora(v.creado)), ' · ', el('b', {}, v.autor ?? '—'), ` ${accionsHist[v.accion] ?? v.accion} ${nome} `,
              destino ? el('a', { href: destino }, v.titulo) : el('span', {}, v.titulo));
          })))
      : null,
  );
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
const TIPOS_CONTACTO = [
  ['web', 'Web'], ['correo', 'Correo'], ['telefono', 'Teléfono'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['x', 'X (Twitter)'], ['bluesky', 'Bluesky'],
  ['mastodon', 'Mastodon'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'], ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['spotify', 'Spotify'], ['outro', 'Outro'],
];
export async function axustes(main) {
  const [items, eds] = await Promise.all([coleccion('axustes', { forzar: true }), coleccion('edicions', { forzar: true })]);
  const d = structuredClone(items.find((x) => x.id === 'xeral')?.datos ?? {});
  d.contactos ??= [];
  d.seo ??= { indexar: true, idioma: 'gl' };
  await editorSimple(main, {
    titulo: 'Axustes',
    intro: 'Os datos xerais da web: como se presenta en buscadores e redes, a icona, os contactos e a edición destacada.',
    campos: [
      c.bloque('A web', null,
        el('div', { class: 'fila2' }, c.texto(d, 'nome', 'Nome', { obrig: true }), c.texto(d, 'lema', 'Lema', { obrig: true })),
        c.area(d, 'descricion', 'Descrición xeral', { obrig: true, filas: 2, axuda: 'Úsase nos buscadores e ao compartir as páxinas que non teñen descrición propia.' }),
        c.escolla(d, 'edicionActual', 'Edición destacada', eds.sort((a, b) => b.datos.ano - a.datos.ano).map((e) => ({ valor: e.id, texto: e.datos.titulo })), { axuda: 'A que sae na sección «Edición destacada» (p. ex. na portada).' })),
      c.bloque('Buscadores e redes sociais', 'Como aparece a web en Google e cando alguén comparte unha ligazón (WhatsApp, redes…).',
        c.texto(d.seo, 'titulo', 'Título da portada nos buscadores', { placeholder: `${d.nome ?? 'Feira da Sostibilidade'} · ${d.lema ?? ''}`, axuda: 'Baleiro = nome e lema.' }),
        c.imaxe(d.seo, 'imaxe', 'Imaxe para compartir (por defecto)', { axuda: 'Recomendado 1200×630 px. Úsase nas páxinas que non teñen imaxe propia.' }),
        el('div', { class: 'fila2' },
          c.marca(d.seo, 'indexar', 'Permitir que os buscadores mostren a web'),
          c.texto(d.seo, 'googleVerificacion', 'Código de verificación de Google Search Console (opcional)', { placeholder: 'abc123…', axuda: 'Só o código (contido da etiqueta meta «google-site-verification»).' }))),
      c.bloque('Icona da web (favicon)', 'A iconiña da pestana do navegador e dos marcadores. Mellor cadrada (512×512 px), PNG con fondo transparente.',
        c.imaxe(d, 'favicon', '', { etiquetaBib: 'logos', logo: true })),
      c.bloque('Contactos e redes', 'Saen no pé da web e xunto ao formulario. Engade tantos como queiras (varias webs, correos, redes…) e ordénaos coas frechas.',
        c.repetidor(d, 'contactos', '', {
          novo: () => ({ tipo: 'web', valor: '' }),
          engadirTexto: '+ Engadir contacto ou rede',
          pintarItem: (k) => el('div', { class: 'fila3' },
            c.escolla(k, 'tipo', 'Tipo', TIPOS_CONTACTO.map(([valor, texto]) => ({ valor, texto }))),
            c.texto(k, 'valor', 'Enderezo, @usuario, correo ou teléfono', { placeholder: 'https://… ou @usuario' }),
            c.texto(k, 'etiqueta', 'Texto que se ve (opcional)', { placeholder: 'Web do IES Luís Seoane' })),
        })),
      c.bloque('Copia de seguridade', 'Descarga todos os contidos nun ficheiro. A base de datos garda ademais copias automáticas dos últimos 7 días, e cada páxina ten o seu historial de versións.',
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

// ───────────────── MENSAXES DO FORMULARIO (desde Diagnóstico) ─────────────────
export async function inscricions(main) {
  const { items } = await api('inscricions');
  const f = { tipo: '', estado: '' };
  const tbody = el('tbody');
  const nomeDe = (i) => [i.datos.nome ?? i.datos.persoa, i.datos.organizacion ?? i.datos.centro ?? i.datos.entidade ?? i.datos.medio].filter(Boolean).join(' · ') || '—';
  function pintar() {
    const vistos = items.filter((i) => (!f.tipo || i.tipo === f.tipo) && (!f.estado || i.estado === f.estado));
    tbody.replaceChildren(...(vistos.length ? vistos.map((i) => {
      const [txt, cor] = estadosInsc[i.estado] ?? [i.estado, ''];
      const tr = el('tr', { class: 'clicable', onclick: () => detalle(i) },
        el('td', { class: 'muted' }, dataCurta(i.creado)),
        el('td', {}, el('span', { class: 'pill' }, tiposInsc[i.tipo] ?? i.tipo)),
        el('td', {}, el('b', {}, nomeDe(i)), el('br'), el('small', { class: 'muted' }, i.datos.email ?? '')),
        el('td', { class: 'muted' }, (i.datos.mensaxe ?? i.datos.descricion ?? i.datos.proposta ?? '').slice(0, 80)),
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
    el('a', { class: 'volver', href: '#/diagnostico' }, '← Diagnóstico'),
    cab('Mensaxes do formulario', 'Copia de todo o que envía a xente desde o formulario de contacto (por se o correo non chega). Preme nunha fila para ver todo.', el('button', { class: 'btn-ghost', type: 'button', onclick: csv, disabled: !items.length }, 'Exportar CSV')),
    el('div', { class: 'barra-filtros' },
      el('select', { onchange: (e) => { f.tipo = e.target.value; pintar(); } }, el('option', { value: '' }, 'Todos os tipos'), Object.entries(tiposInsc).map(([k, v]) => el('option', { value: k }, v))),
      el('select', { onchange: (e) => { f.estado = e.target.value; pintar(); } }, el('option', { value: '' }, 'Todos os estados'), Object.entries(estadosInsc).map(([k, [t]]) => el('option', { value: k }, t)))),
    el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, ['Data', 'Tipo', 'Quen', 'Mensaxe', 'Estado'].map((t) => el('th', {}, t)))), tbody)));
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
    cab('Administración', 'Quen pode entrar no panel. Todas as persoas teñen verificación en dous pasos obrigatoria.', el('button', { class: 'btn', type: 'button', onclick: convidar }, '+ Convidar')),
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
