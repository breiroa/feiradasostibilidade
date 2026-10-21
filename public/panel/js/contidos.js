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

// ───────────────── ENTIDADES ─────────────────
const tiposEnt = [{ valor: 'entidade', texto: 'Entidade / colectivo / ONGD' }, { valor: 'institucion', texto: 'Institución / administración' }, { valor: 'centro', texto: 'Centro educativo' }, { valor: 'empresa', texto: 'Empresa / cooperativa' }];
export const entidades = {
  coleccion: 'entidades',
  titulo: 'Ecosistema',
  singular: 'Entidade',
  intro: 'Centros, entidades e institucións da rede, cos seus logos (úsanse nos grupos de logos das páxinas e no pé). Os logos gárdanse na Biblioteca (carpeta «logos») e tamén se poden escoller dela. Se unha entidade non ten logo, móstrase o seu nome.',
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
    c.bloque('Logo', 'Arrastra o logo (mellor PNG con fondo transparente) ou escólleo da Biblioteca. Os logos subidos aquí gárdanse tamén na Biblioteca, na carpeta «logos».', c.imaxe(d, 'logo', '', { etiquetaBib: 'logos', logo: true })),
  ],
};

