// «Modelos»: páxinas e conxuntos de seccións para reutilizar. Constrúense co mesmo editor visual que as páxinas.
//  - Modelos de páxina: úsanse en «+ Nova páxina › Desde un modelo».
//  - Modelos de seccións: aparecen en «+ Engadir sección › Modelos gardados».
// Pódese gardar calquera páxina (☆ en Páxinas) ou sección (☆ no editor) como modelo.
import { api, caixaErros, coleccion, confirmar, dataHora, el, gardar, invalidar, modal, slug as slugify } from './nucleo.js';
import * as c from './campos.js';
import { editorVista } from './editor-vista.js';

const cab = (titulo, intro, ...extra) => el('div', { class: 'cab' }, el('div', {}, el('h1', {}, titulo), intro ? el('p', { class: 'muted' }, intro) : null), ...extra);
const novoId = () => Math.random().toString(36).slice(2, 10);
const gardados = async () => (await coleccion('modelos', { forzar: true })).map((m) => ({ id: m.id, ...m.datos, actualizado: m.actualizado, editadoPor: m.editadoPor }));

/** Modelos de páxina para «Nova páxina» */
export async function modelosPaxina() {
  return (await gardados()).filter((m) => m.tipo === 'paxina').map((m) => ({ id: m.id, nome: m.nome, desc: m.desc, datos: { cabeceira: m.cabeceira, seccions: m.seccions } }));
}

/** Pide nome e descrición e garda un modelo */
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

const crearModelo = (datos, mensaxe = 'Modelo gardado') =>
  gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'modelos', novo: true, id: slugify(datos.nome), datos } }), { mensaxe });

/** Garda unha páxina enteira como modelo */
export function gardarPaxinaComoModelo(datos) {
  pedirNome('Gardar a páxina como modelo', async ({ nome, desc }) => {
    await crearModelo({ tipo: 'paxina', nome, desc, cabeceira: datos.cabeceira, seccions: structuredClone(datos.seccions ?? []) });
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
        const secs = ms.filter((m) => m.tipo === 'seccions' && m.seccions?.length);
        lista.replaceChildren(secs.length
          ? el('div', { class: 'tipos-grella' }, secs.map((m) => el('button', { type: 'button', class: 'tipo-boton', onclick: () => escoller(m.seccions) },
            el('span', { class: 'tipo-icona' }, '☆'), el('b', {}, m.nome), el('small', {}, `${m.desc ?? ''}${m.seccions.length > 1 ? ` (${m.seccions.length} seccións)` : ''}`))))
          : el('p', { class: 'muted' }, 'Aínda non hai modelos de seccións. Crea un en «Modelos» ou preme ☆ na cabeceira dunha sección.'));
      });
      lista.hidden = true;
      return el('div', {}, el('div', { class: 'segmentos', style: { marginBottom: '14px' } }, botons), tipos, lista);
    },
    gardar(seccion) {
      pedirNome('Gardar a sección como modelo', async ({ nome, desc }) => {
        await crearModelo({ tipo: 'seccions', nome, desc, seccions: [structuredClone(seccion)] });
        invalidar('modelos');
      });
    },
  };
}

/** Ruta #/modelos[/id] */
export async function modelos(main, id) {
  if (id) return editarModelo(main, id);
  const ms = await gardados();
  const novo = () => {
    const d = { nome: '', desc: '', tipo: 'paxina' };
    const erros = el('div');
    const m = modal('Novo modelo', el('div', {}, erros,
      c.texto(d, 'nome', 'Nome', { obrig: true }),
      c.texto(d, 'desc', 'Descrición curta (opcional)'),
      c.escolla(d, 'tipo', 'Tipo', [{ valor: 'paxina', texto: 'Modelo de páxina (para crear páxinas novas)' }, { valor: 'seccions', texto: 'Modelo de seccións (para engadir a calquera páxina)' }])), {
      botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn', onclick: async () => {
          if (!d.nome.trim()) { erros.replaceChildren(caixaErros(['Escribe un nome.'])); return; }
          try {
            const r = await crearModelo({ ...d, seccions: [{ id: novoId(), tipo: 'texto', oculta: false, fondo: 'branco', corpo: '<p>Escribe aquí.</p>', estreito: true }] }, 'Modelo creado');
            invalidar('modelos');
            m.pechar();
            location.hash = `#/modelos/${r.id}`;
          } catch (e) { erros.replaceChildren(caixaErros(e.erros ?? ['Non se puido crear.'])); }
        } }, 'Crear e editar')],
    });
  };
  const borrar = async (x) => {
    if (!(await confirmar(`Borrar o modelo «${x.nome}»?`, { detalle: 'As páxinas feitas con el non cambian. Vai á papeleira.' }))) return;
    await gardar(() => api('documentos', { metodo: 'DELETE', datos: { coleccion: 'modelos', id: x.id } }), { mensaxe: 'Modelo borrado' });
    invalidar('modelos');
    modelos(main);
  };
  const duplicar = async (x) => {
    const { id: _, actualizado, editadoPor, ...datos } = x;
    const r = await crearModelo({ ...structuredClone(datos), nome: `${x.nome} (copia)` }, 'Modelo duplicado');
    invalidar('modelos');
    location.hash = `#/modelos/${r.id}`;
  };
  const grupo = (titulo, axuda, lista) => el('section', { class: 'pax-grupo' }, el('h2', {}, titulo), el('p', { class: 'muted pax-axuda' }, axuda),
    lista.length ? lista.map((x) => el('a', { class: 'lista-fila', href: `#/modelos/${x.id}` },
      el('div', {}, el('b', {}, x.nome), el('br'), el('small', { class: 'muted' }, `${x.desc ? `${x.desc} · ` : ''}${(x.seccions ?? []).length} seccións`)),
      el('div', { class: 'accions' },
        el('span', { class: 'muted' }, x.actualizado ? dataHora(x.actualizado) : ''),
        el('button', { type: 'button', class: 'icobtn', title: 'Duplicar', onclick: (e) => { e.preventDefault(); duplicar(x); } }, '⧉'),
        el('button', { type: 'button', class: 'icobtn perigo', title: 'Borrar', onclick: (e) => { e.preventDefault(); borrar(x); } }, '🗑'))))
      : el('p', { class: 'muted' }, 'Aínda non hai ningún.'));
  main.replaceChildren(
    cab('Modelos', 'Páxinas e seccións de exemplo para reutilizar. Edítanse co mesmo editor visual que as páxinas.', el('button', { class: 'btn', type: 'button', onclick: novo }, '+ Novo modelo')),
    grupo('Modelos de páxina', 'Úsanse en «Páxinas › + Nova páxina › Desde un modelo». Para gardar unha páxina existente como modelo, preme ☆ na lista de Páxinas.', ms.filter((m) => m.tipo === 'paxina')),
    grupo('Modelos de seccións', 'Aparecen en «+ Engadir sección › Modelos gardados». Para gardar unha sección, preme ☆ na súa cabeceira no editor.', ms.filter((m) => m.tipo === 'seccions')));
}

async function editarModelo(main, id) {
  const items = await coleccion('modelos', { forzar: true });
  const it = items.find((x) => x.id === id);
  if (!it) { main.replaceChildren(el('a', { class: 'volver', href: '#/modelos' }, '← Modelos'), el('div', { class: 'baleiro' }, 'Non se atopou este modelo.')); return; }
  const d = structuredClone(it.datos);
  d.seccions ??= [];
  editorVista(main, {
    coleccion: 'modelos', id, d, item: it,
    titulo: (x) => `Modelo: ${x.nome}`,
    volver: ['#/modelos', 'Modelos'],
    modelos: modelosSeccion(),
    pestanaAxustes: 'Modelo',
    axustes: (x) => [c.bloque('Modelo', null,
      c.texto(x, 'nome', 'Nome', { obrig: true }),
      c.texto(x, 'desc', 'Descrición curta (opcional)'),
      c.escolla(x, 'tipo', 'Tipo', [{ valor: 'paxina', texto: 'Modelo de páxina' }, { valor: 'seccions', texto: 'Modelo de seccións' }]))],
  });
}
