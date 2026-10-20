// Construtor de páxinas: lista de seccións que se engaden, ordenan, duplican, ocultan e editan.
import { coleccion, confirmar, el, modal } from './nucleo.js';
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
    campos: (d) => [textoIntro(d), el('div', { class: 'fila2' }, c.escolla(d, 'columnas', 'Columnas', [2, 3, 4].map((n) => ({ valor: n, texto: String(n) }))), c.marca(d, 'numerar', 'Numerar as tarxetas sen imaxe (01, 02…)')),
      c.repetidor(d, 'items', 'Tarxetas', { novo: () => ({ titulo: '' }), engadirTexto: '+ Engadir tarxeta',
        pintarItem: (t) => [el('div', { class: 'fila2' }, c.texto(t, 'etiqueta', 'Etiqueta pequena'), c.texto(t, 'titulo', 'Título')), c.area(t, 'texto', 'Texto', { filas: 2 }),
          el('div', { class: 'fila2' }, c.texto(t, 'url', 'Ligazón (opcional)', { placeholder: '/participa/ ou https://…' }), c.texto(t, 'boton', 'Texto da ligazón (opcional)', { placeholder: 'Saber máis' })),
          c.imaxe(t, 'imaxe', 'Imaxe (opcional)', { claveAlt: 'imaxeAlt' })] })] },
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
  subpaxinas: { nome: 'Subpáxinas', icona: '⊞', desc: 'Tarxetas coas subpáxinas doutra páxina (p. ex. FeiraLab).', novo: () => ({ nai: 'feiralab' }),
    campos: (d) => [textoIntro(d), escollaNai(d)] },
  formulario: { nome: 'Formulario', icona: '✉', desc: 'O formulario de participación e contacto (as mensaxes chegan a Inscricións).', novo: () => ({ fondo: 'branco', ancla: 'formulario', etiqueta: 'Escríbenos', titulo: 'Cóntanos que tes en mente.' }),
    campos: (d) => [textoIntro(d), el('div', { class: 'fila2' }, c.texto(d, 'graciasTitulo', 'Mensaxe ao enviar: título', { placeholder: 'Grazas! Recibimos a túa mensaxe.' }), c.texto(d, 'graciasTexto', 'Mensaxe ao enviar: texto'))] },
  listado: { nome: 'Listado completo', icona: '☷', desc: 'Todas as noticias, recursos ou edicións, con filtros.', novo: () => ({ de: 'noticias' }),
    campos: (d) => [textoIntro(d), c.escolla(d, 'de', 'Que se lista', [{ valor: 'noticias', texto: 'Todas as noticias (filtro por edición)' }, { valor: 'recursos', texto: 'Todos os recursos (filtro por tipo)' }, { valor: 'edicions', texto: 'Todas as edicións' }])] },
};

// Tipos novos: columnas con bloques libres, preguntas frecuentes e foto grande
Object.assign(tipos, {
  columnas: { nome: 'Columnas', icona: '▥', desc: 'Dúas ou tres columnas con bloques libres: texto, imaxe, botóns, vídeo, cita, cifra…', novo: () => ({ fondo: 'branco', proporcion: '1-1', vertical: 'arriba', columnas: [{ bloques: [] }, { bloques: [] }] }),
    campos: (d) => [textoIntro(d), editorColumnas(d)] },
  acordeon: { nome: 'Preguntas frecuentes', icona: '☰', desc: 'Preguntas que se abren e pechan (acordeón).', novo: () => ({ fondo: 'branco', items: [] }),
    campos: (d) => [textoIntro(d), c.repetidor(d, 'items', 'Preguntas', { novo: () => ({ pregunta: '', corpo: '' }), engadirTexto: '+ Engadir pregunta',
      pintarItem: (x) => [c.texto(x, 'pregunta', 'Pregunta'), c.rico(x, 'corpo', 'Resposta')] })] },
  imaxe: { nome: 'Foto grande', icona: '▭', desc: 'Unha foto destacada con pé (ata a toda a pantalla).', novo: () => ({ fondo: 'branco', tamano: 'normal' }),
    campos: (d) => [c.imaxe(d, 'imaxe', 'Foto', { claveAlt: 'alt' }), c.texto(d, 'pe', 'Pé de foto (opcional)'),
      c.escolla(d, 'tamano', 'Tamaño', [{ valor: 'texto', texto: 'Ao ancho do texto' }, { valor: 'normal', texto: 'Ancho normal' }, { valor: 'completa', texto: 'Toda a pantalla' }])] },
});

/** Tipos de bloque dentro das columnas */
const tiposBloque = {
  titulo: { nome: 'Título', novo: () => ({ texto: '', grande: false }), campos: (b) => [c.texto(b, 'texto', 'Título'), c.marca(b, 'grande', 'Grande')] },
  texto: { nome: 'Texto', novo: () => ({ corpo: '' }), campos: (b) => [c.rico(b, 'corpo', 'Texto')] },
  imaxe: { nome: 'Imaxe', novo: () => ({ forma: 'rectangular' }), campos: (b) => [c.imaxe(b, 'imaxe', 'Imaxe', { claveAlt: 'alt' }), el('div', { class: 'fila2' }, c.texto(b, 'pe', 'Pé (opcional)'), c.escolla(b, 'forma', 'Forma', [{ valor: 'rectangular', texto: 'Rectangular' }, { valor: 'cadrada', texto: 'Cadrada' }, { valor: 'redonda', texto: 'Redonda' }]))] },
  botons: { nome: 'Botóns', novo: () => ({ botons: [{ texto: '', url: '', estilo: 'principal' }] }), campos: (b) => [botons(b)] },
  video: { nome: 'Vídeo', novo: () => ({ url: '' }), campos: (b) => [c.texto(b, 'url', 'Ligazón de YouTube ou Vimeo', { placeholder: 'https://www.youtube.com/watch?v=…' })] },
  cita: { nome: 'Cita', novo: () => ({ texto: '' }), campos: (b) => [c.area(b, 'texto', 'Frase', { filas: 2 }), c.texto(b, 'autoria', 'Autoría (opcional)')] },
  cifra: { nome: 'Cifra', novo: () => ({ valor: '', etiqueta: '' }), campos: (b) => [el('div', { class: 'fila2' }, c.texto(b, 'valor', 'Número'), c.texto(b, 'etiqueta', 'Texto'))] },
  lista: { nome: 'Lista', novo: () => ({ items: [] }), campos: (b) => [c.listaTextos(b, 'items', 'Elementos')] },
  espazo: { nome: 'Espazo', novo: () => ({ grande: false }), campos: (b) => [c.marca(b, 'grande', 'Espazo grande')] },
};

/** Editor das columnas: proporción e, en cada columna, unha lista de bloques que se engaden, ordenan e borran */
function editorColumnas(d) {
  const cont = el('div');
  const aviso = () => cont.dispatchEvent(new Event('input', { bubbles: true }));
  function pintar() {
    const n = d.proporcion === '1-1-1' ? 3 : 2;
    if (!Array.isArray(d.columnas)) d.columnas = [];
    while (d.columnas.length < n) d.columnas.push({ bloques: [] });
    const cols = d.columnas.slice(0, n);
    cont.replaceChildren(
      el('div', { class: 'fila2' },
        c.escolla(d, 'proporcion', 'Columnas', [{ valor: '1-1', texto: 'Dúas iguais' }, { valor: '2-1', texto: 'Ancha + estreita' }, { valor: '1-2', texto: 'Estreita + ancha' }, { valor: '1-1-1', texto: 'Tres iguais' }], { aoCambiar: pintar }),
        c.escolla(d, 'vertical', 'Aliñamento vertical', [{ valor: 'arriba', texto: 'Arriba' }, { valor: 'centro', texto: 'Centrado' }])),
      ...cols.map((col, ci) => {
        if (!Array.isArray(col.bloques)) col.bloques = [];
        const bl = col.bloques;
        return el('fieldset', { class: 'col-editor' }, el('legend', {}, `Columna ${ci + 1}`),
          bl.length ? null : el('p', { class: 'muted' }, 'Columna baleira: engade bloques cos botóns de abaixo.'),
          ...bl.map((b, bi) => {
            const t = tiposBloque[b.tipo] ?? { nome: b.tipo, campos: () => [] };
            const mover = (delta) => { const j = bi + delta; if (j < 0 || j >= bl.length) return; [bl[bi], bl[j]] = [bl[j], bl[bi]]; pintar(); aviso(); };
            return el('div', { class: 'bloque-editor' },
              el('div', { class: 'bloque-cab' }, el('b', {}, t.nome),
                el('div', { class: 'accions' },
                  el('button', { type: 'button', class: 'icobtn', title: 'Subir', onclick: () => mover(-1) }, '↑'),
                  el('button', { type: 'button', class: 'icobtn', title: 'Baixar', onclick: () => mover(1) }, '↓'),
                  ci < cols.length - 1 ? el('button', { type: 'button', class: 'icobtn', title: 'Mover á columna seguinte', onclick: () => { cols[ci + 1].bloques.push(...bl.splice(bi, 1)); pintar(); aviso(); } }, '→') : null,
                  ci > 0 ? el('button', { type: 'button', class: 'icobtn', title: 'Mover á columna anterior', onclick: () => { cols[ci - 1].bloques.push(...bl.splice(bi, 1)); pintar(); aviso(); } }, '←') : null,
                  el('button', { type: 'button', class: 'icobtn perigo', title: 'Borrar bloque', onclick: () => { bl.splice(bi, 1); pintar(); aviso(); } }, '×'))),
              ...t.campos(b));
          }),
          el('div', { class: 'bloques-engadir' }, Object.entries(tiposBloque).map(([tipo, t]) =>
            el('button', { type: 'button', class: 'btn-ghost btn-peq', onclick: () => { bl.push({ tipo, ...t.novo() }); pintar(); aviso(); } }, `+ ${t.nome}`))));
      }));
  }
  pintar();
  return cont;
}

/** Escolla da páxina nai para a sección de subpáxinas (só páxinas que poden ter subpáxinas) */
function escollaNai(d) {
  const cont = el('div');
  coleccion('paxinas_libres').then((ps) => cont.replaceChildren(c.escolla(d, 'nai', 'Subpáxinas de', ps
    .filter((p) => !p.datos.nai && !['inicio', 'participa', 'actualidade', 'recursos', 'edicions'].includes(p.id))
    .map((p) => ({ valor: p.id, texto: p.datos.titulo })))));
  return cont;
}

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

// Orde no selector «Engadir sección»: primeiro as máis usadas
const ORDE = ['heroe', 'texto', 'texto_imaxe', 'columnas', 'imaxe', 'tarxetas', 'galeria', 'video', 'cifras', 'cita', 'acordeon', 'chamada', 'cronoloxia', 'programa', 'documentos', 'lista', 'logos', 'recursos', 'noticias', 'listado', 'edicions', 'edicion_actual', 'actividades', 'subpaxinas', 'formulario'];
const ordenados = () => Object.entries(tipos).sort(([a], [b]) => (ORDE.indexOf(a) + 1 || 99) - (ORDE.indexOf(b) + 1 || 99));

/** Completa os valores por defecto que o servidor daría (para que a casa marcada coincida co que se ve) */
export function normalizar(lista = []) {
  for (const s of lista) if (s.tipo === 'tarxetas' && s.numerar === undefined) s.numerar = true;
  return lista;
}

const resumo = (s) => s.titulo || s.etiqueta || s.destaque || (s.texto ? String(s.texto).slice(0, 60) : '') || '';

/**
 * Construtor: devolve o bloque do formulario que edita d[clave] (lista de seccións).
 * opcions.aoAbrir(id): avisa cando se abre unha sección (para resaltala na vista previa).
 * opcions.abertas: Set cos ids abertos (para conservalos ao repintar o editor).
 * opcions.modelos: { engadir(grella, escoller) → Node, gardar(seccion) } para os modelos gardados.
 * O bloque devolto ten .abrir(id) para abrir unha sección desde fóra (p. ex. premendo na vista previa).
 */
export function construtor(d, clave = 'seccions', { titulo = 'Seccións da páxina', axuda, aoAbrir, abertas = new Set(), modelos } = {}) {
  if (!Array.isArray(d[clave])) d[clave] = [];
  const lista = d[clave];
  const cont = el('div', { class: 'construtor' });
  let arrastrando = null;

  function engadir(posicion) {
    const escoller = (s) => {
      lista.splice(posicion, 0, s);
      abertas.add(s.id);
      m.pechar();
      pintar();
      aoAbrir?.(s.id);
      setTimeout(() => cont.querySelector(`[data-sec="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    const grella = el('div', { class: 'tipos-grella' }, ordenados().map(([tipo, t]) =>
      el('button', { type: 'button', class: 'tipo-boton', onclick: () => escoller({ id: novoId(), tipo, oculta: false, fondo: 'claro', ...t.novo() }) },
        el('span', { class: 'tipo-icona' }, t.icona), el('b', {}, t.nome), el('small', {}, t.desc))));
    const m = modal('Engadir sección', modelos ? modelos.engadir(grella, (s) => escoller({ ...structuredClone(s), id: novoId() })) : grella, { ancho: true });
  }

  function alternar(id) {
    if (abertas.has(id)) abertas.delete(id);
    else abertas.add(id);
    pintar();
    if (abertas.has(id)) aoAbrir?.(id);
  }

  function mover(de, a) {
    if (de === a || de < 0 || a < 0 || de >= lista.length || a > lista.length) return;
    const [s] = lista.splice(de, 1);
    lista.splice(a > de ? a - 1 : a, 0, s);
    pintar();
  }

  function tarxeta(s, i) {
    const t = tipos[s.tipo] ?? { nome: s.tipo, icona: '?', campos: () => [] };
    const aberta = abertas.has(s.id);
    const corpo = aberta ? el('div', { class: 'sec-corpo' },
      el('div', { class: 'fila2' }, c.texto(s, 'etiqueta', 'Etiqueta superior (pequena)'), c.texto(s, 'titulo', 'Título da sección')),
      ...t.campos(s),
      aparencia(s)) : null;
    const ctrl = (txt, titulo, fn, extra = '') => el('button', { type: 'button', class: `icobtn ${extra}`, title: titulo, 'aria-label': titulo, onclick: (e) => { e.stopPropagation(); fn(); } }, txt);
    const tx = el('div', { class: `sec-tarxeta${s.oculta ? ' oculta' : ''}${aberta ? ' aberta' : ''}`, 'data-sec': s.id });
    const limpar = () => cont.querySelectorAll('.soltar-antes, .soltar-despois, .arrastrando').forEach((x) => x.classList.remove('soltar-antes', 'soltar-despois', 'arrastrando'));
    tx.addEventListener('dragstart', (e) => { arrastrando = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); tx.classList.add('arrastrando'); });
    tx.addEventListener('dragend', () => { tx.draggable = false; arrastrando = null; limpar(); });
    tx.addEventListener('dragover', (e) => {
      if (arrastrando === null) return;
      e.preventDefault();
      const r = tx.getBoundingClientRect();
      const antes = e.clientY < r.top + r.height / 2;
      tx.classList.toggle('soltar-antes', antes);
      tx.classList.toggle('soltar-despois', !antes);
    });
    tx.addEventListener('dragleave', () => tx.classList.remove('soltar-antes', 'soltar-despois'));
    tx.addEventListener('drop', (e) => {
      e.preventDefault();
      if (arrastrando === null) return;
      const de = arrastrando;
      const antes = tx.classList.contains('soltar-antes');
      limpar();
      mover(de, antes ? i : i + 1);
    });
    const asa = el('span', { class: 'sec-asa', title: 'Arrastra para mover', onmousedown: () => { tx.draggable = true; }, onmouseup: () => { tx.draggable = false; }, onclick: (e) => e.stopPropagation() }, '⠿');
    tx.append(
      el('div', { class: 'sec-cab', onclick: () => alternar(s.id) },
        asa,
        el('span', { class: 'sec-icona' }, t.icona),
        el('div', { class: 'sec-nome' }, el('b', {}, t.nome), el('small', {}, resumo(s) || '—'), s.oculta ? el('span', { class: 'pill aviso' }, 'Oculta') : null),
        el('div', { class: 'sec-ctrl' },
          ctrl('↑', 'Subir', () => mover(i, i - 1)),
          ctrl('↓', 'Baixar', () => mover(i, i + 2)),
          ctrl('⧉', 'Duplicar', () => { const copia = { ...structuredClone(s), id: novoId() }; lista.splice(i + 1, 0, copia); pintar(); }),
          ctrl(s.oculta ? '◌' : '◉', s.oculta ? 'Mostrar na web' : 'Ocultar na web (sen borrar)', () => { s.oculta = !s.oculta; pintar(); }),
          modelos ? ctrl('☆', 'Gardar esta sección como modelo', () => modelos.gardar(s)) : null,
          ctrl('🗑', 'Borrar sección', async () => {
            if (await confirmar(`Borrar a sección «${s.titulo || t.nome}»?`, { detalle: 'Podes recuperala con ↶ (desfacer) mentres non saias do editor.' })) { lista.splice(lista.indexOf(s), 1); pintar(); }
          }, 'perigo'),
          el('span', { class: 'sec-chevron', 'aria-hidden': 'true' }, aberta ? '▴' : '▾'))),
      corpo,
      el('button', { type: 'button', class: 'engadir-aqui', onclick: () => engadir(i + 1) }, '+ Engadir sección aquí'));
    return tx;
  }

  function pintar() {
    const algunha = lista.some((s) => abertas.has(s.id));
    cont.replaceChildren(
      lista.length > 1 && algunha ? el('div', { class: 'construtor-barra' }, el('button', { type: 'button', class: 'btn-ghost btn-peq', onclick: () => { abertas.clear(); pintar(); } }, 'Pregar todas')) : null,
      ...(lista.length ? lista.map(tarxeta) : [el('div', { class: 'baleiro' }, 'Esta páxina aínda non ten seccións.')]),
      el('button', { type: 'button', class: 'btn', onclick: () => engadir(lista.length) }, '+ Engadir sección'));
    cont.dispatchEvent(new Event('input', { bubbles: true }));
  }
  pintar();
  const bloque = c.bloque(titulo, axuda ?? 'Preme nunha sección para editala. Arrastra ⠿ (ou usa as frechas) para ordenar, ◉ para ocultala sen borrala e «+ Engadir sección» para crear novas.', cont);
  bloque.abrir = (id) => {
    if (!lista.some((s) => s.id === id)) return false;
    if (!abertas.has(id)) alternar(id);
    else aoAbrir?.(id);
    setTimeout(() => cont.querySelector(`[data-sec="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    return true;
  };
  return bloque;
}

/** Opcións de aparencia comúns a todas as seccións: fondo, espazado, aliñamento, ancho, foto de fondo e ancla */
function aparencia(s) {
  const dx = s.deseno ?? {};
  const gardarDeseno = () => {
    // Só se garda o que non é o valor por defecto
    const limpo = Object.fromEntries(Object.entries(dx).filter(([k, v]) => v && !(k === 'espazo' && v === 'normal') && !(k === 'alinear' && v === 'esquerda')));
    if (Object.keys(limpo).length) s.deseno = limpo;
    else delete s.deseno;
  };
  const caixa = el('div', { oninput: gardarDeseno, onchange: gardarDeseno },
    el('div', { class: 'fila2' }, c.escolla(s, 'fondo', 'Cor de fondo', fondos), c.escolla(dx, 'espazo', 'Espazado arriba e abaixo', [{ valor: 'compacto', texto: 'Compacto' }, { valor: 'normal', texto: 'Normal' }, { valor: 'amplo', texto: 'Amplo' }], { baleiro: 'Normal' })),
    el('div', { class: 'fila2' }, c.escolla(dx, 'alinear', 'Título e texto de cabeceira', [{ valor: 'esquerda', texto: 'Á esquerda' }, { valor: 'centro', texto: 'Centrados' }], { baleiro: 'Á esquerda' }),
      c.escolla(dx, 'ancho', 'Ancho do contido', [{ valor: 'estreito', texto: 'Estreito' }, { valor: 'normal', texto: 'Normal' }, { valor: 'ancho', texto: 'Ancho' }], { baleiro: 'O propio da sección' })),
    c.imaxe(dx, 'fondoImaxe', 'Foto de fondo (opcional)', { axuda: 'Ponse cun veo escuro e o texto en branco. Se hai foto, a cor de fondo non se usa.' }),
    c.texto(s, 'ancla', 'Ancla', { axuda: 'Opcional, para ligar directamente: /paxina/#ancla' }));
  return el('details', { class: 'sec-avanzado', open: Boolean(s.deseno) }, el('summary', {}, 'Aparencia e deseño'), caixa);
}
