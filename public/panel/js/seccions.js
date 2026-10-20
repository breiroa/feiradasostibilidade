// Construtor de páxinas: lista de seccións que se engaden, ordenan, duplican, ocultan e editan.
import { el, modal } from './nucleo.js';
import * as c from './campos.js';
import { conProgreso, subirFicheiro, zonaSoltar } from './imaxes.js';

const novoId = () => Math.random().toString(36).slice(2, 10);

const fondos = [
  { valor: 'claro', texto: 'Claro (crema)' }, { valor: 'branco', texto: 'Branco' }, { valor: 'verde', texto: 'Verde suave' },
  { valor: 'morado', texto: 'Morado (intenso)' }, { valor: 'escuro', texto: 'Escuro' },
];

const botons = (d) => c.repetidor(d, 'botons', 'Botóns', {
  novo: () => ({ texto: '', url: '', estilo: 'principal' }), engadirTexto: '+ Engadir botón',
  pintarItem: (b) => el('div', { class: 'fila3' }, c.texto(b, 'texto', 'Texto'), c.texto(b, 'url', 'Ligazón', { placeholder: '/participa/ ou https://…' }), c.escolla(b, 'estilo', 'Estilo', [{ valor: 'principal', texto: 'Principal' }, { valor: 'secundario', texto: 'Secundario' }])),
});
const cifras = (d) => c.repetidor(d, 'cifras', 'Cifras', {
  novo: () => ({ valor: '', etiqueta: '' }), engadirTexto: '+ Engadir cifra',
  pintarItem: (x) => el('div', { class: 'fila2' }, c.texto(x, 'valor', 'Número'), c.texto(x, 'etiqueta', 'Texto')),
});
const textoIntro = (d) => c.area(d, 'texto', 'Texto introdutorio', { filas: 2 });

/** Tipos de sección: nome, descrición, valores iniciais e campos propios */
export const tipos = {
  heroe: { nome: 'Portada', icona: '▣', desc: 'Foto grande de fondo, título destacado, botóns e cifras.', novo: () => ({ fondo: 'escuro', botons: [], cifras: [] }),
    campos: (d) => [c.texto(d, 'destaque', 'Título destacado (en cor)'), c.area(d, 'texto', 'Texto'), c.imaxe(d, 'imaxe', 'Foto de fondo', { claveAlt: 'imaxeAlt' }), botons(d), cifras(d)] },
  texto: { nome: 'Texto', icona: '¶', desc: 'Texto con formato (títulos, listas, ligazóns, imaxes).', novo: () => ({ fondo: 'branco', corpo: '', estreito: true }),
    campos: (d) => [c.rico(d, 'corpo', 'Texto'), c.marca(d, 'estreito', 'Columna estreita (máis cómoda de ler)')] },
  texto_imaxe: { nome: 'Texto e imaxe', icona: '◧', desc: 'Texto ao carón dunha foto grande.', novo: () => ({ fondo: 'branco', corpo: '', posicion: 'dereita', botons: [] }),
    campos: (d) => [c.rico(d, 'corpo', 'Texto'), c.imaxe(d, 'imaxe', 'Foto', { claveAlt: 'imaxeAlt' }), c.escolla(d, 'posicion', 'Foto á', [{ valor: 'dereita', texto: 'Dereita' }, { valor: 'esquerda', texto: 'Esquerda' }]), botons(d)] },
  cifras: { nome: 'Cifras', icona: '#', desc: 'Números grandes destacados.', novo: () => ({ cifras: [] }), campos: (d) => [textoIntro(d), cifras(d)] },
  tarxetas: { nome: 'Tarxetas', icona: '▦', desc: 'Grella de tarxetas con imaxe, título, texto e ligazón.', novo: () => ({ columnas: 3, items: [] }),
    campos: (d) => [textoIntro(d), c.escolla(d, 'columnas', 'Columnas', [2, 3, 4].map((n) => ({ valor: n, texto: String(n) }))),
      c.repetidor(d, 'items', 'Tarxetas', { novo: () => ({ titulo: '' }), engadirTexto: '+ Engadir tarxeta',
        pintarItem: (t) => [el('div', { class: 'fila2' }, c.texto(t, 'etiqueta', 'Etiqueta pequena'), c.texto(t, 'titulo', 'Título')), c.area(t, 'texto', 'Texto', { filas: 2 }), c.texto(t, 'url', 'Ligazón (opcional)'), c.imaxe(t, 'imaxe', 'Imaxe (opcional)', { claveAlt: 'imaxeAlt' })] })] },
  galeria: { nome: 'Galería', icona: '▤', desc: 'Carrusel de fotos con frechas (ou grella); ao premer vense a pantalla completa.', novo: () => ({ modo: 'carrusel', imaxes: [] }),
    campos: (d) => [c.escolla(d, 'modo', 'Como se mostra', [{ valor: 'carrusel', texto: 'Carrusel: unha foto grande con frechas' }, { valor: 'grella', texto: 'Grella de miniaturas' }]), c.galeria(d, 'imaxes', 'Fotos')] },
  video: { nome: 'Vídeo', icona: '▶', desc: 'YouTube ou Vimeo (sen cookies ata que se preme).', novo: () => ({ url: '' }), campos: (d) => [c.texto(d, 'url', 'Ligazón do vídeo', { obrig: true, placeholder: 'https://www.youtube.com/watch?v=…' }), textoIntro(d)] },
  logos: { nome: 'Logos', icona: '◇', desc: 'Grupos de entidades (Organiza, Colaboran…).', novo: () => ({ fondo: 'branco', grupos: [{ titulo: 'Colaboran', entidades: [] }] }),
    campos: (d) => [textoIntro(d), c.repetidor(d, 'grupos', 'Grupos', { novo: () => ({ titulo: '', entidades: [] }), engadirTexto: '+ Engadir grupo', pintarItem: (g) => [c.texto(g, 'titulo', 'Título do grupo'), c.entidades(g, 'entidades', 'Entidades')] })] },
  programa: { nome: 'Programa', icona: '☰', desc: 'Días e actividades con hora.', novo: () => ({ fondo: 'branco', dias: [] }),
    campos: (d) => [textoIntro(d), c.repetidor(d, 'dias', 'Días', { novo: () => ({ dia: '', actividades: [] }), engadirTexto: '+ Engadir día',
      pintarItem: (dia) => [c.texto(dia, 'dia', 'Día'), c.repetidor(dia, 'actividades', 'Actividades', { novo: () => ({ titulo: '' }), engadirTexto: '+ Engadir actividade',
        pintarItem: (a) => [el('div', { class: 'fila3' }, c.texto(a, 'hora', 'Hora'), el('div', { style: { gridColumn: 'span 2' } }, c.texto(a, 'titulo', 'Título'))), c.area(a, 'descricion', 'Descrición', { filas: 2 })] })] })] },
  actividades: { nome: 'Actividades dun proxecto', icona: '✓', desc: 'As actividades dun proxecto co seu estado e barra de progreso.', novo: () => ({ fondo: 'branco', proxecto: '' }),
    campos: (d) => [textoIntro(d), c.refUnica(d, 'proxecto', 'Proxecto', { colec: 'proxectos', obrig: true, nomeDe: (x) => x.datos.nomeCurto })] },
  cronoloxia: { nome: 'Cronoloxía', icona: '⋮', desc: 'Fitos con data (feito, agora, próximo).', novo: () => ({ fitos: [] }),
    campos: (d) => [textoIntro(d), c.repetidor(d, 'fitos', 'Fitos', { novo: () => ({ data: '', titulo: '', estado: 'proximo' }), engadirTexto: '+ Engadir fito',
      pintarItem: (f) => [el('div', { class: 'fila3' }, c.texto(f, 'data', 'Data'), c.texto(f, 'titulo', 'Título'), c.escolla(f, 'estado', 'Estado', [{ valor: 'feito', texto: 'Feito' }, { valor: 'agora', texto: 'Agora' }, { valor: 'proximo', texto: 'Próximo' }])), c.area(f, 'texto', 'Texto', { filas: 2 })] })] },
  documentos: { nome: 'Documentos', icona: '⎙', desc: 'Lista de PDF ou ligazóns para descargar.', novo: () => ({ fondo: 'branco', items: [] }), campos: (d) => [documentos(d)] },
  lista: { nome: 'Lista', icona: '•', desc: 'Lista simple en columnas (p. ex. centros).', novo: () => ({ items: [] }), campos: (d) => [c.listaTextos(d, 'items', 'Elementos')] },
  recursos: { nome: 'Recursos', icona: '◫', desc: 'Selección de recursos con portada e descarga.', novo: () => ({ recursos: [] }),
    campos: (d) => [textoIntro(d), c.refs(d, 'recursos', 'Recursos escollidos', { colec: 'recursos', engadir: '+ Engadir recurso…', axuda: 'Se non escolles ningún, móstranse os da edición indicada abaixo (ou todos).' }),
      c.refUnica(d, 'edicion', 'Ou todos os dunha edición', { colec: 'edicions', baleiro: '— Calquera —', ordenar: (a, b) => b.datos.ano - a.datos.ano })] },
  cita: { nome: 'Cita', icona: '❝', desc: 'Frase grande destacada.', novo: () => ({ fondo: 'verde', texto: '' }),
    campos: (d) => [c.area(d, 'texto', 'Frase', { obrig: true, filas: 2 }), c.texto(d, 'destaque', 'Final destacado'), c.texto(d, 'autoria', 'Autoría (opcional)')] },
  chamada: { nome: 'Chamada á acción', icona: '➜', desc: 'Franxa con texto e botóns (p. ex. «Participa»).', novo: () => ({ fondo: 'morado', botons: [] }), campos: (d) => [textoIntro(d), botons(d)] },
  noticias: { nome: 'Noticias', icona: '✎', desc: 'Últimas noticias (todas ou dunha edición).', novo: () => ({ numero: 3 }),
    campos: (d) => [c.refUnica(d, 'edicion', 'Edición', { colec: 'edicions', baleiro: '— Todas —', ordenar: (a, b) => b.datos.ano - a.datos.ano }), c.texto(d, 'numero', 'Cantas mostrar', { tipo: 'number' })] },
  edicions: { nome: 'Todas as edicións', icona: '★', desc: 'Tarxetas de todas as edicións.', novo: () => ({}), campos: (d) => [textoIntro(d)] },
  edicion_actual: { nome: 'Edición destacada', icona: '☆', desc: 'A edición marcada en Axustes, con datas, cifras e botón.', novo: () => ({ fondo: 'branco' }), campos: () => [] },
  subpaxinas: { nome: 'Subpáxinas', icona: '⊞', desc: 'Tarxetas coas subpáxinas dunha sección (p. ex. FeiraLab).', novo: () => ({ nai: 'feiralab' }),
    campos: (d) => [textoIntro(d), c.escolla(d, 'nai', 'Sección', [{ valor: 'feiralab', texto: 'FeiraLab' }])] },
};

/** Lista de documentos: soltar varios PDF crea varios elementos */
function documentos(d) {
  if (!Array.isArray(d.items)) d.items = [];
  const cont = el('div');
  const estado = el('div');
  const rep = () => c.repetidor(d, 'items', 'Documentos', {
    novo: () => ({ titulo: '' }), engadirTexto: '+ Engadir documento a man',
    pintarItem: (x) => [el('div', { class: 'fila2' }, c.texto(x, 'titulo', 'Título'), c.texto(x, 'detalle', 'Detalle (p. ex. medio, data)')), c.ficheiro(x, 'ficheiro', 'PDF'), c.texto(x, 'url', 'Ou ligazón externa')],
  });
  const pintar = () => cont.replaceChildren(rep());
  const zona = zonaSoltar({
    texto: 'Arrastra aquí un ou varios PDF para engadilos á lista, ou', multiple: true, aceptar: 'application/pdf',
    aoSoltar: async (fs) => {
      for (const [n, f] of fs.entries()) {
        const item = await conProgreso(estado, `Subindo ${n + 1} de ${fs.length}…`, () => subirFicheiro(f));
        if (item) d.items.push({ titulo: f.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '), ficheiro: item.id });
      }
      pintar();
    },
  });
  pintar();
  return el('div', {}, zona, estado, el('div', { style: { marginTop: '12px' } }, cont));
}

const resumo = (s) => s.titulo || s.etiqueta || s.destaque || (s.texto ? String(s.texto).slice(0, 60) : '') || '';

/** Construtor: devolve o bloque do formulario que edita d[clave] (lista de seccións) */
export function construtor(d, clave = 'seccions', { titulo = 'Seccións da páxina', axuda } = {}) {
  if (!Array.isArray(d[clave])) d[clave] = [];
  const lista = d[clave];
  const abertas = new Set();
  const cont = el('div', { class: 'construtor' });

  function engadir(posicion) {
    const grella = el('div', { class: 'tipos-grella' }, Object.entries(tipos).map(([tipo, t]) =>
      el('button', { type: 'button', class: 'tipo-boton', onclick: () => {
        const s = { id: novoId(), tipo, oculta: false, fondo: 'claro', ...t.novo() };
        lista.splice(posicion, 0, s);
        abertas.add(s.id);
        m.pechar();
        pintar();
        setTimeout(() => cont.querySelector(`[data-sec="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      } }, el('span', { class: 'tipo-icona' }, t.icona), el('b', {}, t.nome), el('small', {}, t.desc))));
    const m = modal('Engadir sección', grella, { ancho: true });
  }

  function tarxeta(s, i) {
    const t = tipos[s.tipo] ?? { nome: s.tipo, icona: '?', campos: () => [] };
    const aberta = abertas.has(s.id);
    const corpo = aberta ? el('div', { class: 'sec-corpo' },
      el('div', { class: 'fila2' }, c.texto(s, 'etiqueta', 'Etiqueta superior (pequena)'), c.texto(s, 'titulo', 'Título da sección')),
      ...t.campos(s),
      el('details', { class: 'sec-avanzado' }, el('summary', {}, 'Aparencia e ancla'),
        el('div', { class: 'fila2' }, c.escolla(s, 'fondo', 'Fondo', fondos), c.texto(s, 'ancla', 'Ancla', { axuda: 'Opcional, para ligar directamente: /paxina/#ancla' })))) : null;
    const ctrl = (txt, titulo, fn, extra = '') => el('button', { type: 'button', class: `icobtn ${extra}`, title: titulo, onclick: (e) => { e.stopPropagation(); fn(); } }, txt);
    return el('div', { class: `sec-tarxeta${s.oculta ? ' oculta' : ''}${aberta ? ' aberta' : ''}`, 'data-sec': s.id },
      el('div', { class: 'sec-cab', onclick: () => { aberta ? abertas.delete(s.id) : abertas.add(s.id); pintar(); } },
        el('span', { class: 'sec-icona' }, t.icona),
        el('div', { class: 'sec-nome' }, el('b', {}, t.nome), el('small', {}, resumo(s) || '—'), s.oculta ? el('span', { class: 'pill aviso' }, 'Oculta') : null),
        el('div', { class: 'sec-ctrl' },
          ctrl('↑', 'Subir', () => { if (i > 0) { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; pintar(); } }),
          ctrl('↓', 'Baixar', () => { if (i < lista.length - 1) { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; pintar(); } }),
          ctrl('⧉', 'Duplicar', () => { const copia = { ...structuredClone(s), id: novoId() }; lista.splice(i + 1, 0, copia); pintar(); }),
          ctrl(s.oculta ? '◌' : '◉', s.oculta ? 'Mostrar na web' : 'Ocultar na web (sen borrar)', () => { s.oculta = !s.oculta; pintar(); }),
          ctrl('🗑', 'Borrar sección', () => { if (window.confirm(`Borrar a sección «${t.nome}»?`)) { lista.splice(i, 1); pintar(); } }, 'perigo'),
          el('span', { class: 'sec-chevron', 'aria-hidden': 'true' }, aberta ? '▴' : '▾'))),
      corpo,
      el('button', { type: 'button', class: 'engadir-aqui', onclick: () => engadir(i + 1) }, '+ Engadir sección aquí'));
  }

  function pintar() {
    cont.replaceChildren(
      ...(lista.length ? lista.map(tarxeta) : [el('div', { class: 'baleiro' }, 'Esta páxina aínda non ten seccións.')]),
      el('button', { type: 'button', class: 'btn', onclick: () => engadir(lista.length) }, '+ Engadir sección'));
    cont.dispatchEvent(new Event('input', { bubbles: true }));
  }
  pintar();
  return c.bloque(titulo, axuda ?? 'Preme nunha sección para editala. Usa as frechas para ordenar, ◉ para ocultala sen borrala e «+ Engadir sección» para crear novas.', cont);
}
