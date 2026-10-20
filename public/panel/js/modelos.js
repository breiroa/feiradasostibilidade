// Modelos: seccións e páxinas para reutilizar. Hai uns cantos de serie e pódense gardar outros
// (☆ nunha sección do editor, ou «Gardar como modelo» nunha páxina).
import { api, caixaErros, coleccion, confirmar, dataCurta, dataHora, el, gardar, invalidar, modal } from './nucleo.js';
import * as c from './campos.js';

const s = (tipo, extra = {}) => ({ id: tipo, tipo, oculta: false, fondo: 'claro', ...extra });

/** Modelos de páxina incluídos de serie */
export const modelosDeSerie = [
  { id: 'serie-texto', nome: 'Páxina de texto', desc: 'Cabeceira sinxela e un bloque de texto', datos: {
    seccions: [s('texto', { fondo: 'branco', corpo: '<p>Escribe aquí o texto da páxina.</p>', estreito: true })] } },
  { id: 'serie-presentacion', nome: 'Presentación con portada', desc: 'Foto grande, texto e imaxe, tarxetas e chamada', datos: {
    seccions: [
      s('heroe', { fondo: 'escuro', titulo: 'Título da páxina.', destaque: 'Unha frase destacada.', texto: 'Unha ou dúas frases de presentación.', botons: [], cifras: [] }),
      s('texto_imaxe', { fondo: 'branco', etiqueta: 'Que é', titulo: 'Explica a idea principal.', corpo: '<p>Texto da presentación.</p>', posicion: 'dereita', botons: [] }),
      s('tarxetas', { fondo: 'claro', etiqueta: 'Como', titulo: 'Tres puntos clave.', columnas: 3, numerar: true, items: [{ titulo: 'Primeiro' }, { titulo: 'Segundo' }, { titulo: 'Terceiro' }] }),
      s('chamada', { fondo: 'morado', titulo: 'Queres participar?', texto: 'Escríbenos e contámosche.', botons: [{ texto: 'Participa', url: '/participa/', estilo: 'principal' }] }),
    ] } },
  { id: 'serie-proxecto', nome: 'Proxecto', desc: 'Portada, presentación, cronoloxía, galería e chamada', datos: {
    seccions: [
      s('heroe', { fondo: 'escuro', titulo: 'Nome do proxecto.', destaque: 'O lema.', texto: 'Curso 2026–2027', botons: [], cifras: [] }),
      s('texto_imaxe', { fondo: 'branco', etiqueta: 'O proxecto', titulo: 'De que trata.', corpo: '<p>Obxectivos e contexto.</p>', posicion: 'dereita', botons: [] }),
      s('cronoloxia', { fondo: 'claro', etiqueta: 'Paso a paso', titulo: 'O camiño.', fitos: [{ data: 'Outono', titulo: 'Primeiro paso', estado: 'feito' }, { data: 'Inverno', titulo: 'Segundo paso', estado: 'agora' }, { data: 'Primavera', titulo: 'Na Feira', estado: 'proximo' }] }),
      s('galeria', { fondo: 'branco', etiqueta: 'Imaxes', titulo: 'Así vai.', modo: 'carrusel', imaxes: [] }),
      s('chamada', { fondo: 'morado', titulo: 'Queres sumarte?', botons: [{ texto: 'Participa', url: '/participa/', estilo: 'principal' }] }),
    ] } },
  { id: 'serie-faq', nome: 'Preguntas frecuentes', desc: 'Cabeceira e acordeón de preguntas', datos: {
    seccions: [s('acordeon', { fondo: 'branco', etiqueta: 'Dúbidas', titulo: 'Preguntas frecuentes.', items: [{ pregunta: 'Primeira pregunta?', corpo: '<p>Resposta.</p>' }, { pregunta: 'Segunda pregunta?', corpo: '<p>Resposta.</p>' }] })] } },
];

const gardados = async () => (await coleccion('modelos', { forzar: true })).map((m) => ({ id: m.id, ...m.datos, actualizado: m.actualizado, editadoPor: m.editadoPor }));

/** Modelos de páxina (de serie + gardados) para «Nova páxina» */
export async function modelosPaxina() {
  const meus = (await gardados()).filter((m) => m.tipo === 'paxina').map((m) => ({ id: m.id, nome: m.nome, desc: m.desc, datos: { cabeceira: m.cabeceira, seccions: m.seccions } }));
  return [...modelosDeSerie, ...meus];
}

/** Pide un nome e garda un modelo */
function pedirNome(titulo, aoGardar) {
  const d = { nome: '', desc: '' };
  const erros = el('div');
  const m = modal(titulo, el('div', {}, erros, c.texto(d, 'nome', 'Nome do modelo', { obrig: true }), c.texto(d, 'desc', 'Descrición curta (opcional)')), {
    botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
      el('button', { type: 'button', class: 'btn', onclick: async () => {
        if (!d.nome.trim()) { erros.replaceChildren(caixaErros(['Escribe un nome.'])); return; }
        try { await aoGardar(d); m.pechar(); } catch (e) { erros.replaceChildren(caixaErros(e.erros ?? ['Non se puido gardar.'])); }
      } }, 'Gardar modelo')],
  });
}

/** Garda unha páxina enteira como modelo */
export function gardarPaxinaComoModelo(datos) {
  pedirNome('Gardar a páxina como modelo', async ({ nome, desc }) => {
    await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'modelos', novo: true, datos: { tipo: 'paxina', nome, desc, cabeceira: datos.cabeceira, seccions: datos.seccions } } }), { mensaxe: 'Modelo gardado' });
    invalidar('modelos');
  });
}

/** Integración co construtor: pestana «Modelos gardados» ao engadir e ☆ para gardar unha sección */
export function modelosSeccion() {
  return {
    engadir(grella, escoller) {
      const lista = el('div', {}, el('p', { class: 'muted' }, 'Cargando…'));
      const ver = (k) => { tipos.hidden = k !== 'tipos'; lista.hidden = k !== 'gardados'; botons.forEach((b) => b.classList.toggle('activo', b.dataset.k === k)); };
      const tipos = el('div', {}, grella);
      const botons = [el('button', { type: 'button', class: 'seg activo', 'data-k': 'tipos', onclick: () => ver('tipos') }, 'Tipos de sección'),
        el('button', { type: 'button', class: 'seg', 'data-k': 'gardados', onclick: () => ver('gardados') }, 'Modelos gardados')];
      gardados().then((ms) => {
        const secs = ms.filter((m) => m.tipo === 'seccion');
        lista.replaceChildren(secs.length
          ? el('div', { class: 'tipos-grella' }, secs.map((m) => el('button', { type: 'button', class: 'tipo-boton', onclick: () => escoller(m.seccion) },
            el('span', { class: 'tipo-icona' }, '☆'), el('b', {}, m.nome), el('small', {}, m.desc ?? ''))))
          : el('p', { class: 'muted' }, 'Aínda non gardaches ningunha sección. Para facelo, preme ☆ na cabeceira dunha sección.'));
      });
      lista.hidden = true;
      return el('div', {}, el('div', { class: 'segmentos', style: { marginBottom: '14px' } }, botons), tipos, lista);
    },
    gardar(seccion) {
      pedirNome('Gardar a sección como modelo', async ({ nome, desc }) => {
        await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'modelos', novo: true, datos: { tipo: 'seccion', nome, desc, seccion: structuredClone(seccion) } } }), { mensaxe: 'Modelo gardado' });
        invalidar('modelos');
      });
    },
  };
}

/** Pestana Páxinas › Modelos: lista dos modelos gardados (e os de serie) */
export async function pestanaModelos(cont) {
  const ms = await gardados();
  const fila = (m, deSerie = false) => el('tr', {},
    el('td', {}, el('b', {}, m.nome), m.desc ? [el('br'), el('small', { class: 'muted' }, m.desc)] : null),
    el('td', {}, m.tipo === 'seccion' ? 'Sección' : 'Páxina'),
    el('td', { class: 'muted' }, deSerie ? 'De serie' : `${dataHora(m.actualizado)}${m.editadoPor ? ` · ${m.editadoPor}` : ''}`),
    el('td', {}, deSerie ? null : el('button', { type: 'button', class: 'icobtn perigo', title: 'Borrar modelo', onclick: async () => {
      if (!(await confirmar(`Borrar o modelo «${m.nome}»?`, { detalle: 'As páxinas feitas con el non cambian.' }))) return;
      await gardar(() => api('documentos', { metodo: 'DELETE', datos: { coleccion: 'modelos', id: m.id } }), { mensaxe: 'Modelo borrado' });
      invalidar('modelos');
      pestanaModelos(cont);
    } }, '🗑')));
  cont.replaceChildren(
    el('p', { class: 'muted' }, 'Os modelos de páxina úsanse en «+ Nova páxina». As seccións gardadas aparecen en «+ Engadir sección › Modelos gardados». Para gardar unha sección, preme ☆ na súa cabeceira; para gardar unha páxina enteira, usa ☆ na lista de páxinas.'),
    el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Modelo'), el('th', {}, 'Tipo'), el('th', {}, 'Gardado'), el('th', {}))),
      el('tbody', {}, ms.map((m) => fila(m)), modelosDeSerie.map((m) => fila({ ...m, tipo: 'paxina' }, true))))));
}
