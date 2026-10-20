// Configuración das seccións de contido: que columnas teñen as listas e que campos os editores.
import { coleccion, dataCurta, el, mediaUrl, slug as slugify } from './nucleo.js';
import * as c from './campos.js';
import { construtor } from './seccions.js';

const romanos = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const miniatura = (id, logo = false) => (id ? el('img', { class: `miniatura${logo ? ' logo' : ''}`, src: mediaUrl(id, logo ? 'g' : 'm'), alt: '' }) : el('span', { class: 'miniatura' }));
const busca = (filtros, repintar, placeholder = 'Buscar…') =>
  el('input', { type: 'search', placeholder, oninput: (e) => { filtros.q = e.target.value.toLowerCase(); repintar(); } });
const coincide = (q, ...t) => !q || t.some((x) => (x ?? '').toLowerCase().includes(q));

/** Despregable de edicións (para noticias, recursos e proxectos) */
function escollaEdicion(d, clave, etiqueta, { obrig = false, axuda } = {}) {
  const cont = el('div');
  coleccion('edicions').then((eds) => {
    cont.replaceChildren(c.escolla(d, clave, etiqueta, eds.sort((a, b) => b.datos.ano - a.datos.ano).map((e) => ({ valor: e.id, texto: e.datos.titulo })), { baleiro: obrig ? undefined : '— Ningunha —', axuda, obrig }));
    if (obrig && !d[clave] && eds.length) d[clave] = eds[0].id;
  });
  return cont;
}

const cifras = (d) =>
  c.repetidor(d, 'cifras', 'Cifras destacadas', {
    axuda: 'Aparecen como números grandes. Ex.: «1.127» + «participantes directos».',
    novo: () => ({ valor: '', etiqueta: '' }),
    pintarItem: (it) => el('div', { class: 'fila2' }, c.texto(it, 'valor', 'Número'), c.texto(it, 'etiqueta', 'Texto')),
    engadirTexto: '+ Engadir cifra',
  });

// ───────────────── EDICIÓNS ─────────────────
export const edicions = {
  coleccion: 'edicions',
  titulo: 'Edicións da Feira',
  singular: 'Edición',
  intro: 'Cada edición ten a súa páxina, construída con seccións. A edición destacada escóllese en Axustes.',
  novoTexto: 'Nova edición',
  titular: (d) => d.titulo,
  verNaWeb: (id) => `/edicions/${id}/`,
  columnas: [
    { titulo: '', valor: (it) => miniatura(it.datos.portada) },
    { titulo: 'Nº', valor: (it) => el('b', {}, romanos[it.datos.numero] ?? it.datos.numero) },
    { titulo: 'Título', valor: (it) => [el('b', {}, it.datos.titulo), el('br'), el('small', { class: 'muted' }, it.datos.datas)] },
    { titulo: 'Estado', valor: (it) => el('span', { class: `pill ${it.datos.estado === 'proxima' ? 'verde' : ''}` }, it.datos.estado === 'proxima' ? 'Próxima' : 'Pasada') },
    { titulo: 'Fotos', valor: (it) => String(it.datos.galeria?.length ?? 0) },
  ],
  novo: () => ({ numero: undefined, ano: new Date().getFullYear() + 1, titulo: '', datas: '', lugar: 'IES Luís Seoane · Monte Porreiro, Pontevedra', estado: 'proxima', resumo: '', cifras: [], fitos: [],
    seccions: [{ id: 'logos1', tipo: 'logos', oculta: false, fondo: 'verde', etiqueta: 'Quen participa', titulo: 'Centros e entidades.', grupos: [{ titulo: 'Organiza', entidades: ['ies-luis-seoane'] }, { titulo: 'Impulsan', entidades: ['cidel-galicia', 'universidade-de-vigo'] }] }] }),
  editor: (d, { novo }) => [
    c.bloque('Datos básicos', 'Saen na portada da edición, nas tarxetas e no menú.',
      el('div', { class: 'fila3' },
        c.texto(d, 'numero', 'Número de edición', { tipo: 'number', obrig: true, axuda: '1, 2, 3… (sae en números romanos)' }),
        c.texto(d, 'ano', 'Ano', { tipo: 'number', obrig: true, bloqueado: !novo, axuda: novo ? 'Será o enderezo: /edicions/ano' : 'O ano é o enderezo da páxina e non se cambia.' }),
        c.escolla(d, 'estado', 'Estado', [{ valor: 'proxima', texto: 'Próxima' }, { valor: 'pasada', texto: 'Pasada' }])),
      c.texto(d, 'titulo', 'Título', { obrig: true, placeholder: 'VI Feira da Sostibilidade', axuda: 'Para un subtítulo destacado usa « · », p. ex. «V Feira da Sostibilidade · SENDA 2030».' }),
      c.texto(d, 'lema', 'Lema', { placeholder: 'Eco-Étika en acción' }),
      el('div', { class: 'fila2' }, c.texto(d, 'datas', 'Datas (texto libre)', { obrig: true, placeholder: '28, 29 e 30 de abril de 2027' }), c.texto(d, 'lugar', 'Lugar', { obrig: true })),
      c.area(d, 'resumo', 'Resumo', { obrig: true, axuda: 'Dúas ou tres frases. Sae nas tarxetas e ao comezo da páxina.' })),
    c.bloque('Foto de portada', null, c.imaxe(d, 'portada', '', { claveAlt: 'portadaAlt', etiquetaBib: 'edicions' })),
    c.bloque('Datos destacados', 'Aparecen na presentación da edición e na portada da web.', cifras(d), c.listaTextos(d, 'fitos', 'Fitos destacados', { axuda: 'Etiquetas curtas: «II Foro de Desenvolvemento Local»… Arrastra para ordenar.' })),
    c.bloque('Proxecto vinculado', 'Se a edición forma parte dun proxecto (como SENDA 2030). As súas actividades móstranse coa sección «Actividades dun proxecto».', proxectoVinculado(d)),
    construtor(d, 'seccions', { titulo: 'Seccións da páxina da edición' }),
  ],
};

function proxectoVinculado(d) {
  const cont = el('div');
  coleccion('proxectos').then((ps) => cont.replaceChildren(c.escolla(d, 'proxecto', 'Proxecto', ps.map((p) => ({ valor: p.id, texto: p.datos.nomeCurto })), { baleiro: '— Ningún —' })));
  return cont;
}

// ───────────────── NOTICIAS ─────────────────
export const noticias = {
  coleccion: 'noticias',
  titulo: 'Noticias',
  singular: 'Noticia',
  intro: 'Aparecen en Actualidade, na portada e na páxina da súa edición. Os borradores non se ven na web.',
  novoTexto: 'Nova noticia',
  titular: (d) => d.titulo,
  verNaWeb: (id, d) => (d.borrador ? null : `/actualidade/${id}/`),
  columnas: [
    { titulo: '', valor: (it) => miniatura(it.datos.imaxe) },
    { titulo: 'Título', valor: (it) => el('b', {}, it.datos.titulo) },
    { titulo: 'Data', valor: (it) => dataCurta(it.datos.data), clase: 'muted' },
    { titulo: 'Edición', valor: (it) => it.datos.edicion ?? '—', clase: 'muted' },
    { titulo: 'Estado', valor: (it) => el('span', { class: `pill ${it.datos.borrador ? 'aviso' : 'verde'}` }, it.datos.borrador ? 'Borrador' : 'Publicada') },
  ],
  filtrar: (items, f) => items.filter((it) => coincide(f.q, it.datos.titulo, it.datos.resumo) && (!f.ed || it.datos.edicion === f.ed)).sort((a, b) => b.datos.data.localeCompare(a.datos.data)),
  filtros: (f, repintar, items) => [
    busca(f, repintar, 'Buscar noticias…'),
    el('select', { onchange: (e) => { f.ed = e.target.value; repintar(); } }, el('option', { value: '' }, 'Todas as edicións'), [...new Set(items.map((i) => i.datos.edicion).filter(Boolean))].sort().reverse().map((e) => el('option', { value: e }, `Feira ${e}`))),
  ],
  novo: () => ({ titulo: '', data: new Date().toISOString().slice(0, 10), resumo: '', corpo: '', borrador: false }),
  editor: (d) => [
    c.bloque('Noticia', null,
      c.texto(d, 'titulo', 'Título', { obrig: true }),
      el('div', { class: 'fila2' }, c.texto(d, 'data', 'Data', { tipo: 'date', obrig: true }), escollaEdicion(d, 'edicion', 'Edición da Feira', { axuda: 'A noticia sairá tamén na páxina desa edición.' })),
      c.area(d, 'resumo', 'Resumo', { obrig: true, axuda: 'Unha ou dúas frases. Sae nas tarxetas e baixo o título.' }),
      c.marca(d, 'borrador', 'Borrador (aínda non publicar)')),
    c.bloque('Imaxe principal', null, c.imaxe(d, 'imaxe', '', { claveAlt: 'imaxeAlt', etiquetaBib: 'noticias' })),
    c.bloque('Texto', 'Podes pegar texto doutros sitios: pégase limpo, sen formatos raros.', c.rico(d, 'corpo', '')),
  ],
};

// ───────────────── RECURSOS ─────────────────
const tipos = [
  { valor: 'xogo', texto: 'Xogo educativo' }, { valor: 'podcast', texto: 'Podcast' }, { valor: 'estudo', texto: 'Estudo e investigación' },
  { valor: 'guia', texto: 'Guía' }, { valor: 'audiovisual', texto: 'Audiovisual' }, { valor: 'obradoiro', texto: 'Obradoiro' }, { valor: 'outro', texto: 'Outro' },
];
export const recursos = {
  coleccion: 'recursos',
  titulo: 'Recursos',
  singular: 'Recurso',
  intro: 'Xogos, estudos, podcasts e materiais para o profesorado e outros centros.',
  novoTexto: 'Novo recurso',
  titular: (d) => d.titulo,
  verNaWeb: (id) => `/recursos/${id}/`,
  columnas: [
    { titulo: '', valor: (it) => miniatura(it.datos.imaxe) },
    { titulo: 'Título', valor: (it) => el('b', {}, it.datos.titulo) },
    { titulo: 'Tipo', valor: (it) => el('span', { class: 'pill morado' }, tipos.find((t) => t.valor === it.datos.tipo)?.texto ?? it.datos.tipo) },
    { titulo: 'Material', valor: (it) => (it.datos.ficheiro || it.datos.ligazon ? el('span', { class: 'pill verde' }, 'Dispoñible') : el('span', { class: 'pill' }, 'En breve')) },
  ],
  filtrar: (items, f) => items.filter((it) => coincide(f.q, it.datos.titulo, it.datos.resumo) && (!f.tipo || it.datos.tipo === f.tipo)),
  filtros: (f, repintar) => [busca(f, repintar, 'Buscar recursos…'), el('select', { onchange: (e) => { f.tipo = e.target.value; repintar(); } }, el('option', { value: '' }, 'Todos os tipos'), tipos.map((t) => el('option', { value: t.valor }, t.texto)))],
  novo: () => ({ titulo: '', tipo: 'xogo', resumo: '', temas: [], ods: [], licenza: 'CC BY-SA 4.0', corpo: '' }),
  editor: (d) => {
    const ods = { texto: (d.ods ?? []).join(', ') };
    return [
      c.bloque('Recurso', null,
        c.texto(d, 'titulo', 'Título', { obrig: true }),
        el('div', { class: 'fila2' }, c.escolla(d, 'tipo', 'Tipo', tipos), escollaEdicion(d, 'edicion', 'Edición da Feira')),
        c.area(d, 'resumo', 'Resumo', { obrig: true }),
        c.texto(d, 'autoria', 'Autoría', { placeholder: 'Alumnado do IES…' }),
        c.listaTextos(d, 'temas', 'Temas'),
        el('div', { class: 'fila2' },
          c.texto(ods, 'texto', 'ODS (números separados por comas)', { placeholder: '12, 13', aoCambiar: (v) => { d.ods = v.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 17); } }),
          c.texto(d, 'licenza', 'Licenza'))),
      c.bloque('Material', 'Sube o PDF ou pon unha ligazón (por exemplo a Drive, Zenodo ou YouTube).', c.ficheiro(d, 'ficheiro', 'PDF'), c.texto(d, 'ligazon', 'Ligazón externa', { tipo: 'url' })),
      c.bloque('Imaxe', null, c.imaxe(d, 'imaxe', '', { claveAlt: 'imaxeAlt', etiquetaBib: 'recursos' })),
      c.bloque('Descrición completa', 'Opcional: como usalo, conclusións, materiais necesarios…', c.rico(d, 'corpo', '')),
    ];
  },
};

// ───────────────── ENTIDADES ─────────────────
const tiposEnt = [{ valor: 'entidade', texto: 'Entidade / colectivo / ONGD' }, { valor: 'institucion', texto: 'Institución / administración' }, { valor: 'centro', texto: 'Centro educativo' }, { valor: 'empresa', texto: 'Empresa / cooperativa' }];
export const entidades = {
  coleccion: 'entidades',
  titulo: 'Entidades e logos',
  singular: 'Entidade',
  intro: 'Organizacións que aparecen nos grupos de logos (pé, edicións, proxectos). Se non teñen logo, móstrase o nome.',
  novoTexto: 'Nova entidade',
  titular: (d) => d.nome,
  columnas: [
    { titulo: 'Logo', valor: (it) => miniatura(it.datos.logo, true) },
    { titulo: 'Nome', valor: (it) => el('b', {}, it.datos.nome) },
    { titulo: 'Tipo', valor: (it) => tiposEnt.find((t) => t.valor === it.datos.tipo)?.texto ?? '', clase: 'muted' },
    { titulo: 'Web', valor: (it) => (it.datos.web ? el('span', { class: 'pill verde' }, 'Si') : '—') },
  ],
  filtrar: (items, f) => items.filter((it) => coincide(f.q, it.datos.nome)).sort((a, b) => a.datos.nome.localeCompare(b.datos.nome, 'gl')),
  filtros: (f, repintar) => [busca(f, repintar, 'Buscar entidades…')],
  novo: () => ({ nome: '', tipo: 'entidade' }),
  editor: (d) => [
    c.bloque('Entidade', null, c.texto(d, 'nome', 'Nome', { obrig: true }), el('div', { class: 'fila2' }, c.escolla(d, 'tipo', 'Tipo', tiposEnt), c.texto(d, 'web', 'Web', { tipo: 'url', placeholder: 'https://' }))),
    c.bloque('Logo', 'Mellor en PNG con fondo transparente ou SVG convertido a PNG. Gárdase con boa calidade.', c.imaxe(d, 'logo', '', { etiquetaBib: 'logos', logo: true })),
  ],
};

// ───────────────── PROXECTOS ─────────────────
const estadosAct = [{ valor: 'prevista', texto: 'Prevista' }, { valor: 'en-curso', texto: 'En curso' }, { valor: 'feita', texto: 'Feita' }];
export const proxectos = {
  coleccion: 'proxectos',
  titulo: 'Proxectos',
  singular: 'Proxecto',
  intro: 'Proxectos vinculados a unha edición (como SENDA 2030), coa súa subpáxina e o estado das actividades.',
  novoTexto: 'Novo proxecto',
  titular: (d) => d.nomeCurto,
  verNaWeb: (id, d) => `/edicions/${d.edicion}/${id}/`,
  columnas: [
    { titulo: 'Proxecto', valor: (it) => el('b', {}, it.datos.nomeCurto) },
    { titulo: 'Edición', valor: (it) => it.datos.edicion, clase: 'muted' },
    { titulo: 'Actividades', valor: (it) => { const a = it.datos.actividades ?? []; return `${a.filter((x) => x.estado === 'feita').length} feitas · ${a.filter((x) => x.estado === 'en-curso').length} en curso · ${a.length} total`; } },
  ],
  novo: () => ({ titulo: '', nomeCurto: '', resumo: '', financiamento: '', entidades: [], cifras: [], corpo: '', actividades: [] }),
  editor: (d) => [
    c.bloque('Proxecto', null,
      el('div', { class: 'fila2' }, c.texto(d, 'nomeCurto', 'Nome curto', { obrig: true, placeholder: 'SENDA 2030' }), c.texto(d, 'subtitulo', 'Subtítulo', { placeholder: 'Xeración Eco-Étika' })),
      c.texto(d, 'titulo', 'Título completo', { obrig: true }),
      escollaEdicion(d, 'edicion', 'Edición á que pertence', { obrig: true }),
      c.area(d, 'resumo', 'Resumo', { obrig: true }),
      c.area(d, 'financiamento', 'Texto de financiamento', { obrig: true, filas: 2 })),
    c.bloque('Entidades e cifras', null, c.entidades(d, 'entidades', 'Promoven e financian'), cifras(d)),
    c.bloque('Presentación', null, c.rico(d, 'corpo', '')),
    c.bloque('Actividades', 'Cambia o estado a medida que avanza o proxecto: aparece na web ao momento.',
      c.repetidor(d, 'actividades', '', {
        novo: () => ({ codigo: '', resultado: '', titulo: '', descricion: '', estado: 'prevista' }),
        engadirTexto: '+ Engadir actividade',
        pintarItem: (a) => [
          el('div', { class: 'fila3' }, c.texto(a, 'codigo', 'Código', { placeholder: 'A1.1.1' }), c.texto(a, 'resultado', 'Resultado', { placeholder: 'R1.1 · …' }), c.escolla(a, 'estado', 'Estado', estadosAct)),
          c.texto(a, 'titulo', 'Título'),
          c.area(a, 'descricion', 'Descrición', { filas: 2 }),
        ],
      })),
  ],
};

// ───────────────── PÁXINAS LIBRES ─────────────────
const nais = [{ valor: '', texto: 'Páxina solta (/enderezo/)' }, { valor: 'feiralab', texto: 'Dentro de FeiraLab (/feiralab/enderezo/)' }];
export const paxinas_libres = {
  coleccion: 'paxinas_libres',
  titulo: 'Páxinas',
  singular: 'Páxina',
  intro: 'FeiraLab, as súas subpáxinas, as páxinas legais e calquera outra páxina construída con seccións.',
  novoTexto: 'Nova páxina',
  titular: (d) => d.titulo,
  verNaWeb: (id, d) => (d.borrador ? null : id === 'feiralab' ? '/feiralab/' : d.nai ? `/${d.nai}/${id}/` : `/${id}/`),
  columnas: [
    { titulo: 'Páxina', valor: (it) => el('b', {}, it.datos.titulo) },
    { titulo: 'Enderezo', valor: (it) => (it.id === 'feiralab' ? '/feiralab/' : it.datos.nai ? `/${it.datos.nai}/${it.id}/` : `/${it.id}/`), clase: 'muted' },
    { titulo: 'Seccións', valor: (it) => String(it.datos.seccions?.length ?? 0) },
    { titulo: 'Estado', valor: (it) => el('span', { class: `pill ${it.datos.borrador ? 'aviso' : 'verde'}` }, it.datos.borrador ? 'Borrador' : 'Publicada') },
  ],
  filtrar: (items, f) => items.filter((it) => coincide(f.q, it.datos.titulo)),
  filtros: (f, repintar) => [busca(f, repintar, 'Buscar páxinas…')],
  novo: () => ({ titulo: '', nai: 'feiralab', borrador: false, seccions: [{ id: 'texto1', tipo: 'texto', oculta: false, fondo: 'branco', corpo: '', estreito: true }] }),
  editor: (d, { novo, idCampo }) => [
    c.bloque('Páxina', null,
      c.texto(d, 'titulo', 'Título', { obrig: true, aoCambiar: (v) => { if (novo && !idCampo.manual) { idCampo.id = slugify(v); const i = document.getElementById('enderezo-pax'); if (i) i.value = idCampo.id; } } }),
      novo ? el('div', { class: 'campo' }, el('label', { for: 'enderezo-pax' }, 'Enderezo'), el('input', { id: 'enderezo-pax', type: 'text', placeholder: 'metodoloxia', oninput: (e) => { idCampo.id = slugify(e.target.value); idCampo.manual = true; } }), el('div', { class: 'axuda' }, 'Só minúsculas, números e guións. Non se pode cambiar despois.')) : null,
      el('div', { class: 'fila2' }, c.escolla(d, 'nai', 'Onde vai', nais), c.marca(d, 'borrador', 'Borrador (aínda non publicar)')),
      c.area(d, 'descricion', 'Descrición', { filas: 2, axuda: 'Para buscadores e redes; tamén sae nas tarxetas de subpáxinas.' }),
      c.imaxe(d, 'imaxe', 'Imaxe para compartir en redes (opcional)')),
    construtor(d, 'seccions'),
  ],
};

