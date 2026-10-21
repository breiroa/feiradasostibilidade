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
  actividades: { nome: 'Actividades', icona: '✓', desc: 'Actividades (dun proxecto, dun plan…) co seu estado e barra de progreso.', novo: () => ({ fondo: 'branco', progreso: true, items: [{ titulo: 'Primeira actividade', estado: 'feita' }, { titulo: 'Segunda actividade', estado: 'en-curso' }, { titulo: 'Terceira actividade', estado: 'prevista' }] }),
    campos: (d) => [textoIntro(d), c.marca(d, 'progreso', 'Mostrar a barra de progreso'),
      c.repetidor(d, 'items', 'Actividades', { novo: () => ({ titulo: 'Nova actividade', estado: 'prevista' }), engadirTexto: '+ Engadir actividade',
        pintarItem: (a) => [el('div', { class: 'fila3' }, c.texto(a, 'codigo', 'Código (opcional)'), el('div', { style: { gridColumn: 'span 2' } }, c.texto(a, 'titulo', 'Título'))),
          el('div', { class: 'fila2' }, c.escolla(a, 'estado', 'Estado', [{ valor: 'prevista', texto: 'Prevista' }, { valor: 'en-curso', texto: 'En curso' }, { valor: 'feita', texto: 'Feita' }]), el('div')),
          c.area(a, 'descricion', 'Descrición (opcional)', { filas: 2 })] })] },
  presentacion: { nome: 'Presentación', icona: '❖', desc: 'Lema, texto grande, etiquetas e cifras ao carón (p. ex. o resumo dunha edición).', novo: () => ({ fondo: 'branco', etiqueta: 'Presentación', texto: 'Un texto grande que presenta a páxina.', chips: [], cifras: [] }),
    campos: (d) => [c.texto(d, 'lema', 'Lema (opcional)'), c.area(d, 'texto', 'Texto grande', { filas: 3 }), c.listaTextos(d, 'chips', 'Etiquetas'), cifras(d)] },
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
  listado: { nome: 'Listado completo', icona: '☷', desc: 'Todas as noticias, recursos (ou só uns tipos) ou edicións, con filtro despregable.', novo: () => ({ de: 'noticias', filtro: true, tipos: [] }),
    campos: (d) => [textoIntro(d), c.escolla(d, 'de', 'Que se lista', [{ valor: 'noticias', texto: 'Todas as noticias (filtro por edición)' }, { valor: 'recursos', texto: 'Recursos (filtro por tipo)' }, { valor: 'edicions', texto: 'Todas as edicións' }]),
      c.marca(d, 'filtro', 'Mostrar o filtro despregable'), tiposRecursoLista(d)] },
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

/** Tipos de recurso que mostra un listado (baleiro = todos) */
function tiposRecursoLista(d) {
  const cont = el('div');
  if (!Array.isArray(d.tipos)) d.tipos = [];
  coleccion('axustes').then((ax) => {
    const tipos = ax.find((x) => x.id === 'xeral')?.datos.tiposRecurso ?? [];
    cont.replaceChildren(el('div', { class: 'campo' },
      el('label', {}, 'Só estes tipos de recurso (se o listado é de recursos)'),
      el('div', { class: 'chips' }, tipos.map((t) => el('label', { class: 'chip seleccionable' },
        el('input', { type: 'checkbox', checked: d.tipos.includes(t.id), onchange: (e) => {
          if (e.target.checked) d.tipos.push(t.id);
          else d.tipos.splice(d.tipos.indexOf(t.id), 1);
        } }), ` ${t.nome}`))),
      el('div', { class: 'axuda' }, 'Sen marcar ningún, lístanse todos. Así podes facer páxinas só de xogos, só de podcasts…')));
  });
  return cont;
}

/** Escolla da páxina nai para a sección de subpáxinas (só páxinas que poden ter subpáxinas) */
function escollaNai(d) {
  const cont = el('div');
  coleccion('paxinas_libres').then((ps) => cont.replaceChildren(c.escolla(d, 'nai', 'Subpáxinas de', ps
    .filter((p) => !p.datos.nai && !['inicio', 'participa', 'actualidade', 'recursos'].includes(p.id))
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

/** Completa os valores por defecto que o servidor daría (para que a casa marcada coincida co que se ve) */
export function normalizar(lista = []) {
  for (const s of lista) if (s.tipo === 'tarxetas' && s.numerar === undefined) s.numerar = true;
  return lista;
}

const resumo = (s) => s.titulo || s.etiqueta || s.destaque || (s.texto ? String(s.texto).slice(0, 60) : '') || '';

// HTML libre
Object.assign(tipos, {
  html: { nome: 'HTML libre', icona: '</>', desc: 'O teu propio código: mapas, formularios externos, deseños especiais…', novo: () => ({ fondo: 'branco', html: '', ancho: 'normal' }),
    campos: (d) => [
      el('div', { class: 'campo-codigo' }, c.area(d, 'html', 'Código HTML', { filas: 14, placeholder: '<div>…</div>', axuda: 'Pódense usar etiquetas e estilos (class, style) e incrustar YouTube, Vimeo, Google Maps/Forms, OpenStreetMap, Genially, Padlet ou Canva. Os scripts elimínanse por seguridade.' })),
      c.escolla(d, 'ancho', 'Ancho', [{ valor: 'estreito', texto: 'Estreito' }, { valor: 'normal', texto: 'Normal' }, { valor: 'completo', texto: 'Ancho' }]),
    ] },
});

// ── Selector visual de seccións: categorías e debuxo esquemático de cada tipo ──
const CATEGORIAS = [
  ['Básicas', ['heroe', 'texto', 'texto_imaxe', 'columnas', 'imaxe', 'html']],
  ['Visuais', ['tarxetas', 'galeria', 'video', 'cifras', 'cita']],
  ['Información', ['cronoloxia', 'programa', 'acordeon', 'lista', 'documentos']],
  ['Contidos da web', ['noticias', 'recursos', 'listado', 'edicions', 'edicion_actual', 'presentacion', 'actividades', 'subpaxinas', 'logos']],
  ['Participación', ['chamada', 'formulario']],
];
const C = { fondo: '#f4f2f8', escuro: '#2b2340', verde: '#3c783c', morado: '#8f7cb8', liña: '#cdc6da', branco: '#fff', foto: '#9fb7a0' };
const R = (x, y, w, h, f, rx = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
const L = (x, y, w, n = 1, f = C.liña, paso = 6) => Array.from({ length: n }, (_, i) => R(x, y + i * paso, i === n - 1 && n > 1 ? w * 0.6 : w, 3, f, 1.5)).join('');
const F = (x, y, w, h) => R(x, y, w, h, C.foto, 4) + `<path d="M${x + 4} ${y + h - 4} l${w * 0.3} -${h * 0.4} l${w * 0.2} ${h * 0.2} l${w * 0.15} -${h * 0.15} l${w * 0.25} ${h * 0.35}z" fill="#7d9a7e"/>`;
const T = (x, y, w, f = C.escuro) => R(x, y, w, 5, f, 2);
const DEBUXOS = {
  heroe: R(0, 0, 120, 72, C.escuro, 0) + T(10, 20, 60, '#fff') + T(10, 28, 44, C.morado) + L(10, 40, 50, 2, '#6b5f86') + R(10, 54, 26, 8, C.verde, 4),
  texto: T(14, 10, 50) + L(14, 22, 92, 6),
  texto_imaxe: T(8, 12, 44) + L(8, 24, 48, 5) + F(64, 10, 48, 52),
  columnas: T(8, 8, 40) + R(8, 20, 48, 44, '#ebe7f2', 4) + L(13, 26, 38, 4) + R(64, 20, 48, 44, '#ebe7f2', 4) + F(68, 24, 40, 22) + L(68, 51, 36, 2),
  imaxe: F(8, 8, 104, 46) + L(8, 60, 50, 1),
  html: R(10, 12, 100, 48, C.escuro, 6) + `<text x="60" y="42" text-anchor="middle" font-family="monospace" font-size="16" fill="#8fd18f">&lt;/&gt;</text>`,
  tarxetas: [8, 44, 80].map((x) => R(x, 10, 32, 52, '#fff', 4) + F(x, 10, 32, 20) + T(x + 4, 35, 22) + L(x + 4, 45, 24, 2)).join(''),
  galeria: F(14, 8, 92, 44) + R(6, 26, 8, 8, '#fff', 4) + R(106, 26, 8, 8, '#fff', 4) + [14, 33, 52, 71, 90].map((x) => R(x, 57, 16, 10, x === 14 ? C.verde : C.liña, 2)).join(''),
  video: R(14, 8, 92, 56, C.escuro, 6) + `<circle cx="60" cy="36" r="11" fill="${C.verde}"/><path d="M56 30 l10 6 l-10 6z" fill="#fff"/>`,
  cifras: [10, 48, 86].map((x) => `<text x="${x}" y="36" font-family="Georgia" font-weight="700" font-size="17" fill="${C.verde}">${x === 10 ? '4' : x === 48 ? '30' : '+1k'}</text>` + L(x, 44, 26, 2)).join(''),
  cita: `<text x="10" y="30" font-family="Georgia" font-size="28" fill="${C.verde}">“</text>` + T(26, 22, 80) + T(26, 31, 64) + L(26, 46, 30, 1),
  cronoloxia: R(16, 8, 2, 56, C.liña, 1) + [12, 32, 52].map((y, i) => `<circle cx="17" cy="${y}" r="4" fill="${i === 1 ? C.morado : C.verde}"/>` + L(28, y - 3, 20, 1, C.verde) + T(54, y - 4, 40) + L(54, y + 4, 52, 1)).join(''),
  programa: T(10, 8, 40) + [20, 34, 48].map((y) => L(10, y + 1, 16, 1, C.verde) + T(32, y, 50) + L(32, y + 8, 70, 1)).join(''),
  acordeon: [8, 26, 44].map((y, i) => R(8, y, 104, i === 0 ? 16 : 14, '#fff', 4) + T(14, y + 5, 60) + `<text x="104" y="${y + 11}" font-size="12" fill="${C.verde}">+</text>`).join(''),
  lista: [[10, 12, 30], [44, 12, 36], [84, 12, 26], [10, 30, 40], [54, 30, 30], [88, 30, 22]].map(([x, y, w]) => R(x, y, w, 12, '#fff', 6) + L(x + 5, y + 4.5, w - 10, 1)).join(''),
  documentos: [10, 28, 46].map((y) => R(8, y, 104, 14, '#fff', 4) + R(12, y + 3, 10, 8, '#e3dcef', 2) + T(28, y + 4.5, 50) + L(86, y + 5.5, 20, 1, C.verde)).join(''),
  noticias: [8, 44, 80].map((x) => R(x, 10, 32, 52, '#fff', 4) + F(x, 10, 32, 22) + L(x + 4, 36, 14, 1, C.verde) + T(x + 4, 42, 24) + L(x + 4, 51, 22, 1)).join(''),
  recursos: [10, 40, 70].map((x) => R(x, 8, 26, 34, C.morado, 3) + T(x, 46, 22) + R(x, 56, 26, 8, C.verde, 4)).join(''),
  listado: [8, 26, 44].map((x) => R(x, 8, 16, 7, x === 8 ? C.escuro : '#fff', 4)).join('') + [8, 44, 80].map((x) => R(x, 22, 32, 40, '#fff', 4) + F(x, 22, 32, 18) + L(x + 4, 44, 22, 2)).join(''),
  edicions: [8, 62].map((x) => R(x, 10, 50, 52, '#fff', 4) + F(x, 10, 50, 26) + T(x + 4, 41, 34) + L(x + 4, 50, 40, 1)).join(''),
  edicion_actual: L(8, 12, 24, 1, C.verde) + T(8, 20, 50) + L(8, 32, 50, 3) + R(8, 52, 30, 9, C.verde, 4) + [70, 94].map((x) => `<text x="${x}" y="30" font-family="Georgia" font-weight="700" font-size="14" fill="${C.verde}">30</text>` + L(x, 36, 18, 1)).join(''),
  presentacion: L(8, 12, 24, 1, C.verde) + `<text x="8" y="28" font-family="Georgia" font-style="italic" font-size="9" fill="${C.morado}">Lema</text>` + T(8, 34, 60) + T(8, 42, 52) + R(8, 54, 18, 6, '#e3dcef', 3) + R(30, 54, 22, 6, '#e3dcef', 3) + [76, 96].map((x) => `<text x="${x}" y="34" font-family="Georgia" font-weight="700" font-size="13" fill="${C.verde}">9</text>` + L(x, 40, 16, 1)).join(''),
  actividades: R(8, 10, 104, 6, '#e3dcef', 3) + R(8, 10, 60, 6, C.verde, 3) + [24, 38, 52].map((y, i) => `<circle cx="13" cy="${y + 2}" r="4" fill="${i ? C.liña : C.verde}"/>` + T(22, y, 60) + L(22, y + 8, 80, 1)).join(''),
  subpaxinas: [[8, 10], [62, 10], [8, 40], [62, 40]].map(([x, y]) => R(x, y, 50, 24, '#fff', 4) + T(x + 5, y + 6, 30) + L(x + 5, y + 15, 38, 1)).join(''),
  logos: [10, 40, 70, 96].map((x, i) => `<circle cx="${x + 10}" cy="26" r="9" fill="${[C.verde, C.morado, '#c9a24a', '#6a9fc4'][i]}"/>` + L(x + 2, 40, 16, 1)).join('') + L(10, 54, 100, 1),
  chamada: R(0, 14, 120, 44, '#6e5a9a', 0) + T(10, 26, 54, '#fff') + L(10, 36, 46, 1, '#b8abd4') + R(80, 30, 30, 10, '#fff', 5),
  formulario: T(8, 12, 34) + L(8, 24, 34, 3) + R(56, 8, 56, 56, '#fff', 4) + [14, 26, 38].map((y) => R(61, y, 46, 7, '#ebe7f2', 2)).join('') + R(61, 50, 22, 8, C.verde, 4),
};
const debuxo = (tipo) => {
  const sp = document.createElement('span');
  sp.className = 'tipo-debuxo';
  sp.innerHTML = `<svg viewBox="0 0 120 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="120" height="72" fill="${C.fondo}"/>${DEBUXOS[tipo] ?? ''}</svg>`;
  return sp;
};

/** Grella de tipos de sección por categorías, con busca; escoller(tipo) cando se preme un */
export function grellaTipos(escoller) {
  const cont = el('div', { class: 'tipos-cats' });
  const busca = el('input', { type: 'search', class: 'tipos-busca', placeholder: 'Buscar (texto, foto, columnas, mapa…)', oninput: () => pintar() });
  const sen = (t) => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function pintar() {
    const q = sen(busca.value.trim());
    cont.replaceChildren(...CATEGORIAS.map(([nome, ids]) => {
      const vistos = ids.filter((id) => tipos[id] && (!q || sen(`${tipos[id].nome} ${tipos[id].desc} ${nome}`).includes(q)));
      return vistos.length ? el('section', {},
        el('h3', {}, nome),
        el('div', { class: 'tipos-grella' }, vistos.map((id) => el('button', { type: 'button', class: 'tipo-boton', onclick: () => escoller(id) },
          debuxo(id), el('b', {}, tipos[id].nome), el('small', {}, tipos[id].desc))))) : null;
    }));
    if (!cont.children.length) cont.append(el('p', { class: 'muted' }, 'Ningún tipo coincide coa busca.'));
  }
  pintar();
  setTimeout(() => busca.focus(), 50);
  return el('div', {}, busca, cont);
}

/** Que se engade co «+» dunha sección (tarxeta, fito, pregunta…); null se se fai desde o panel */
export function novoElemento(s) {
  const boton = { texto: 'Novo botón', url: '/participa/', estilo: 'principal' };
  switch (s.tipo) {
    case 'tarxetas': return ['items', { titulo: 'Novo título', texto: 'Texto da tarxeta.' }];
    case 'actividades': return ['items', { titulo: 'Nova actividade', estado: 'prevista' }];
    case 'presentacion': return ['chips', 'Nova etiqueta'];
    case 'cronoloxia': return ['fitos', { data: 'Data', titulo: 'Novo fito', estado: 'proximo' }];
    case 'acordeon': return ['items', { pregunta: 'Nova pregunta?', corpo: '<p>Resposta.</p>' }];
    case 'documentos': return ['items', { titulo: 'Novo documento' }];
    case 'lista': return ['items', 'Novo elemento'];
    case 'cifras': return ['cifras', { valor: '0', etiqueta: 'Texto da cifra' }];
    case 'programa': return ['dias', { dia: 'Novo día', actividades: [{ hora: '10:00', titulo: 'Actividade' }] }];
    case 'heroe': case 'chamada': case 'texto_imaxe': return ['botons', boton];
    default: return null;
  }
}

/** Bloques que se poden engadir nas columnas (co seu contido inicial) */
export const BLOQUES_NOVOS = {
  titulo: ['Título', () => ({ tipo: 'titulo', texto: 'Novo título', grande: false })],
  texto: ['Texto', () => ({ tipo: 'texto', corpo: '<p>Escribe aquí o texto.</p>' })],
  imaxe: ['Imaxe', null], // pide a foto
  botons: ['Botóns', () => ({ tipo: 'botons', botons: [{ texto: 'Novo botón', url: '/participa/', estilo: 'principal' }] })],
  video: ['Vídeo', null], // pide a ligazón
  cita: ['Cita', () => ({ tipo: 'cita', texto: 'Unha frase para destacar.' })],
  cifra: ['Cifra', () => ({ tipo: 'cifra', valor: '100', etiqueta: 'Texto da cifra' })],
  lista: ['Lista', () => ({ tipo: 'lista', items: ['Primeiro elemento', 'Segundo elemento'] })],
  espazo: ['Espazo', () => ({ tipo: 'espazo', grande: false })],
};

/**
 * Construtor: devolve o bloque do formulario que edita d[clave] (lista de seccións).
 * Só hai unha sección aberta á vez (a que se está editando, tamén ao premela na vista previa).
 * opcions.aoAbrir(id): avisa cando se abre unha sección (para resaltala na vista previa).
 * opcions.abertas: Set cos ids abertos (para conservalos ao repintar o editor).
 * opcions.modelos: { engadir(grella, escoller) → Node, gardar(seccion) } para os modelos gardados.
 * O bloque devolto ten: .abrir(id), .repintar(), .accion(id, accion), .engadirEn(posicion), .posicion(id).
 */
export function construtor(d, clave = 'seccions', { titulo = 'Seccións da páxina', axuda, aoAbrir, aoEngadir, abertas = new Set(), modelos } = {}) {
  if (!Array.isArray(d[clave])) d[clave] = [];
  const lista = () => d[clave];
  const cont = el('div', { class: 'construtor' });
  let arrastrando = null;

  function engadir(posicion) {
    // Pode recibir unha sección ou varias (un modelo de seccións)
    const escoller = (sOuVarias) => {
      const varias = Array.isArray(sOuVarias) ? sOuVarias : [sOuVarias];
      const s = varias[0];
      lista().splice(posicion, 0, ...varias);
      abertas.clear();
      abertas.add(s.id);
      m.pechar();
      aoEngadir?.(s.id);
      pintar();
      aoAbrir?.(s.id);
      setTimeout(() => cont.querySelector(`[data-sec="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    const grella = grellaTipos((tipo) => escoller({ id: novoId(), tipo, oculta: false, fondo: 'claro', ...tipos[tipo].novo() }));
    const m = modal('Engadir sección', modelos ? modelos.engadir(grella, (ss) => escoller((Array.isArray(ss) ? ss : [ss]).map((x) => ({ ...structuredClone(x), id: novoId() })))) : grella, { ancho: true });
    m.dialog.classList.add('modal-tipos');
  }

  function alternar(id) {
    const estaba = abertas.has(id);
    abertas.clear();
    if (!estaba) abertas.add(id);
    pintar();
    if (!estaba) aoAbrir?.(id);
  }

  function mover(de, a) {
    const l = lista();
    if (de === a || de < 0 || a < 0 || de >= l.length || a > l.length) return;
    const [s] = l.splice(de, 1);
    l.splice(a > de ? a - 1 : a, 0, s);
    pintar();
  }

  async function borrar(s) {
    const t = tipos[s.tipo];
    if (await confirmar(`Borrar a sección «${s.titulo || t?.nome || s.tipo}»?`, { detalle: 'Podes recuperala con ↶ (desfacer) mentres non saias do editor.' })) {
      lista().splice(lista().indexOf(s), 1);
      pintar();
      return true;
    }
    return false;
  }
  const duplicar = (s) => {
    const copia = { ...structuredClone(s), id: novoId() };
    aoEngadir?.(copia.id);
    lista().splice(lista().indexOf(s) + 1, 0, copia);
    pintar();
    return copia;
  };

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
      const antes = e.clientY < r.top + Math.min(r.height, 60) / 2;
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
          ctrl('⧉', 'Duplicar', () => duplicar(s)),
          ctrl(s.oculta ? '◌' : '◉', s.oculta ? 'Mostrar na web' : 'Ocultar na web (sen borrar)', () => { s.oculta = !s.oculta; pintar(); }),
          modelos ? ctrl('☆', 'Gardar esta sección como modelo', () => modelos.gardar(s)) : null,
          ctrl('🗑', 'Borrar sección', () => borrar(s), 'perigo'),
          el('span', { class: 'sec-chevron', 'aria-hidden': 'true' }, aberta ? '▴' : '▾'))),
      corpo,
      el('button', { type: 'button', class: 'engadir-aqui', onclick: () => engadir(i + 1) }, '+ Engadir sección aquí'));
    return tx;
  }

  function pintar() {
    const l = lista();
    cont.replaceChildren(
      ...(l.length ? l.map(tarxeta) : [el('div', { class: 'baleiro' }, 'Esta páxina aínda non ten seccións. Engade a primeira:')]),
      el('button', { type: 'button', class: 'btn', onclick: () => engadir(l.length) }, '+ Engadir sección'));
    cont.dispatchEvent(new Event('input', { bubbles: true }));
  }
  pintar();
  const bloque = c.bloque(titulo, axuda ?? 'Escribe os textos directamente na páxina da dereita. Aquí tes as opcións de cada sección: preme nunha para abrila, arrastra ⠿ para ordenar.', cont);
  const busca = (id) => lista().find((s) => s.id === id);
  bloque.posicion = (id) => lista().findIndex((s) => s.id === id);
  bloque.abrir = (id) => {
    if (!busca(id)) return false;
    if (!abertas.has(id)) alternar(id);
    else aoAbrir?.(id);
    setTimeout(() => cont.querySelector(`[data-sec="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    return true;
  };
  bloque.repintar = () => pintar();
  bloque.engadirEn = (posicion) => engadir(posicion);
  /** Accións que chegan da barra de sección da vista previa. Devolve true se cambiou algo. */
  bloque.accion = async (id, accion) => {
    const s = busca(id);
    if (!s) return false;
    const i = lista().indexOf(s);
    switch (accion) {
      case 'subir': if (i > 0) { mover(i, i - 1); return true; } return false;
      case 'baixar': if (i < lista().length - 1) { mover(i, i + 2); return true; } return false;
      case 'duplicar': duplicar(s); return true;
      case 'ocultar': s.oculta = !s.oculta; pintar(); return true;
      case 'borrar': return borrar(s);
      default: return false;
    }
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
