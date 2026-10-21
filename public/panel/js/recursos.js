// «Recursos»: xogos, estudos, podcasts e materiais. Cada recurso ten unha ficha (datos, portada e descarga) e,
// debaixo, seccións libres feitas co editor visual (vídeos, galerías, documentos, texto…).
// Os tipos de recurso son editables. Para ter páxinas de recursos distintas (só xogos, só podcasts…) úsase a
// sección «Listado completo» cun filtro de tipos en calquera páxina.
import { api, caixaErros, coleccion, el, gardar, invalidar, mediaUrl, modal, slug as slugify } from './nucleo.js';
import * as c from './campos.js';
import { vistaLista } from './coleccions.js';
import { editorVista } from './editor-vista.js';
import { modelosSeccion } from './modelos.js';

const BASE = [
  { id: 'xogo', nome: 'Xogo educativo' }, { id: 'podcast', nome: 'Podcast' }, { id: 'estudo', nome: 'Estudo e investigación' },
  { id: 'guia', nome: 'Guía' }, { id: 'audiovisual', nome: 'Audiovisual' }, { id: 'obradoiro', nome: 'Obradoiro' }, { id: 'outro', nome: 'Outro' },
];
async function lerAxustes() {
  const ax = (await coleccion('axustes', { forzar: true })).find((x) => x.id === 'xeral');
  return { ax, tipos: ax?.datos.tiposRecurso?.length ? ax.datos.tiposRecurso : BASE };
}
const miniatura = (id) => (id ? el('img', { class: 'miniatura', src: mediaUrl(id, 'm'), alt: '' }) : el('span', { class: 'miniatura' }));
const coincide = (q, ...t) => !q || t.some((x) => (x ?? '').toLowerCase().includes(q));

/** Ruta #/recursos[/id] */
export async function recursos(main, id) {
  const { ax, tipos } = await lerAxustes();
  const nomeTipo = (t) => tipos.find((x) => x.id === t)?.nome ?? t;
  if (id && id !== 'novo') return editar(main, id, tipos);
  if (id === 'novo') return novo(tipos);
  await vistaLista(main, {
    coleccion: 'recursos',
    titulo: 'Recursos',
    singular: 'Recurso',
    intro: 'Xogos, estudos, podcasts e materiais. Cada ficha pódese completar con seccións (vídeos, galerías, documentos…).',
    novoTexto: 'Novo recurso',
    titular: (d) => d.titulo,
    columnas: [
      { titulo: '', valor: (it) => miniatura(it.datos.portada ?? it.datos.imaxe) },
      { titulo: 'Título', valor: (it) => [el('b', {}, it.datos.titulo), it.datos.borrador ? el('span', { class: 'pill aviso', style: { marginLeft: '6px' } }, 'Borrador') : null] },
      { titulo: 'Tipo', valor: (it) => el('span', { class: 'pill morado' }, nomeTipo(it.datos.tipo)) },
      { titulo: 'Material', valor: (it) => (it.datos.ficheiro || it.datos.ligazon ? el('span', { class: 'pill verde' }, 'Dispoñible') : el('span', { class: 'pill' }, 'En breve')) },
    ],
    filtrar: (items, f) => items.filter((it) => coincide(f.q, it.datos.titulo, it.datos.resumo) && (!f.tipo || it.datos.tipo === f.tipo)),
    filtros: (f, repintar) => [
      el('input', { type: 'search', placeholder: 'Buscar recursos…', oninput: (e) => { f.q = e.target.value.toLowerCase(); repintar(); } }),
      el('select', { onchange: (e) => { f.tipo = e.target.value; repintar(); } }, el('option', { value: '' }, 'Todos os tipos'), tipos.map((t) => el('option', { value: t.id }, t.nome))),
      el('button', { type: 'button', class: 'btn-ghost', onclick: () => editarTipos(ax, tipos, () => recursos(main)) }, 'Tipos de recurso…'),
    ],
  });
}

/** Tipos de recurso (gárdanse en Axustes) */
function editarTipos(ax, tipos, despois) {
  const d = { tipos: structuredClone(tipos) };
  const erros = el('div');
  const m = modal('Tipos de recurso', el('div', {}, erros,
    el('p', { class: 'muted' }, 'Os tipos saen nas tarxetas, nas fichas e no filtro da web. O identificador non se cambia (os recursos xa asignados seguen co seu tipo).'),
    c.repetidor(d, 'tipos', '', { novo: () => ({ id: '', nome: '' }), engadirTexto: '+ Engadir tipo',
      pintarItem: (t) => el('div', { class: 'fila2' }, c.texto(t, 'nome', 'Nome', { aoCambiar: (v) => { if (!t.fixo) t.id = slugify(v); } }), el('div', { class: 'campo' }, el('label', {}, 'Identificador'), el('input', { type: 'text', value: t.id, disabled: true }))) })), {
    ancho: true,
    botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
      el('button', { type: 'button', class: 'btn', onclick: async () => {
        const tiposLimpos = d.tipos.filter((t) => t.nome?.trim()).map((t) => ({ id: t.id || slugify(t.nome), nome: t.nome.trim() }));
        try {
          await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'axustes', id: 'xeral', datos: { ...ax.datos, tiposRecurso: tiposLimpos } } }), { mensaxe: 'Tipos gardados' });
          invalidar('axustes');
          m.pechar();
          despois();
        } catch (e) { erros.replaceChildren(caixaErros(e.erros ?? ['Non se puido gardar.'])); }
      } }, 'Gardar tipos')],
  });
  for (const t of d.tipos) t.fixo = true;
}

async function novo(tipos) {
  const d = { titulo: '', tipo: tipos[0]?.id ?? 'outro' };
  const erros = el('div');
  const m = modal('Novo recurso', el('div', {}, erros, c.texto(d, 'titulo', 'Título', { obrig: true }), c.escolla(d, 'tipo', 'Tipo', tipos.map((t) => ({ valor: t.id, texto: t.nome })))), {
    aoPechar: () => { if (location.hash === '#/recursos/novo') history.replaceState(null, '', '#/recursos'); },
    botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
      el('button', { type: 'button', class: 'btn', onclick: async () => {
        if (!d.titulo.trim()) { erros.replaceChildren(caixaErros(['Escribe un título.'])); return; }
        try {
          const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'recursos', novo: true, datos: { titulo: d.titulo.trim(), tipo: d.tipo, resumo: 'Resumo do recurso.', borrador: true, temas: [], ods: [], licenza: 'CC BY-SA 4.0', corpo: '', seccions: [] } } }), { mensaxe: 'Recurso creado (en borrador)' });
          invalidar('recursos');
          m.pechar();
          location.hash = `#/recursos/${r.id}`;
        } catch (e) { erros.replaceChildren(caixaErros(e.erros ?? ['Non se puido crear.'])); }
      } }, 'Crear e editar')],
  });
}

async function editar(main, id, tipos) {
  const items = await coleccion('recursos', { forzar: true });
  const it = items.find((x) => x.id === id);
  if (!it) { main.replaceChildren(el('a', { class: 'volver', href: '#/recursos' }, '← Recursos'), el('div', { class: 'baleiro' }, 'Non se atopou este recurso.')); return; }
  const d = structuredClone(it.datos);
  d.seccions ??= [];
  editorVista(main, {
    coleccion: 'recursos', id, d, item: it,
    titulo: (x) => x.titulo,
    volver: ['#/recursos', 'Recursos'],
    verNaWeb: (i, x) => (x.borrador ? null : `/recursos/${i}/`),
    modelos: modelosSeccion(),
    conBorrador: true,
    pestanaAxustes: 'Datos do recurso',
    axustes: (x) => datosRecurso(x, tipos),
  });
}

function datosRecurso(d, tipos) {
  const ods = { texto: (d.ods ?? []).join(', ') };
  const eds = el('div');
  coleccion('edicions').then((l) => eds.replaceChildren(c.escolla(d, 'edicion', 'Edición da Feira', l.sort((a, b) => b.datos.ano - a.datos.ano).map((e) => ({ valor: e.id, texto: e.datos.titulo })), { baleiro: '— Ningunha —' })));
  const campoPortada = c.imaxe(d, 'portada', 'Portada (vertical, como a dun documento)', { etiquetaBib: 'recursos', axuda: 'Xérase soa ao subir un PDF (a súa primeira páxina). Podes cambiala por outra imaxe.' });
  return [
    c.bloque('Recurso', 'O título, o resumo e o texto tamén se escriben directamente na vista previa.',
      c.texto(d, 'titulo', 'Título', { obrig: true }),
      el('div', { class: 'fila2' }, c.escolla(d, 'tipo', 'Tipo', tipos.map((t) => ({ valor: t.id, texto: t.nome }))), eds),
      c.area(d, 'resumo', 'Resumo', { obrig: true }),
      c.texto(d, 'autoria', 'Autoría', { placeholder: 'Alumnado do IES…' }),
      c.listaTextos(d, 'temas', 'Temas'),
      el('div', { class: 'fila2' },
        c.texto(ods, 'texto', 'ODS (números separados por comas)', { placeholder: '12, 13', aoCambiar: (v) => { d.ods = v.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 17); } }),
        c.texto(d, 'licenza', 'Licenza'))),
    c.bloque('Material', 'Arrastra o PDF (xérase a portada automaticamente) ou pon unha ligazón (Drive, Zenodo, YouTube…).',
      c.ficheiro(d, 'ficheiro', 'PDF', { portada: { d, clave: 'portada', campo: campoPortada } }), c.texto(d, 'ligazon', 'Ligazón externa', { tipo: 'url' })),
    c.bloque('Imaxes', 'A portada sae nas tarxetas de Recursos; a imaxe horizontal é opcional.', campoPortada, c.imaxe(d, 'imaxe', 'Imaxe horizontal (opcional)', { claveAlt: 'imaxeAlt', etiquetaBib: 'recursos' })),
  ];
}
