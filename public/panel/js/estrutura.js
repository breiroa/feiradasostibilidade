// «Cabeceira e pé»: o que sae arriba e abaixo en todas as páxinas da web.
import { api, caixaErros, coleccion, el, gardar, invalidar } from './nucleo.js';
import { sucio } from './coleccions.js';
import * as c from './campos.js';

const cab = (titulo, intro, ...extra) => el('div', { class: 'cab' }, el('div', {}, el('h1', {}, titulo), intro ? el('p', { class: 'muted' }, intro) : null), ...extra);

export async function cabeceiraPe(main) {
  const [docs, ms] = await Promise.all([coleccion('estrutura', { forzar: true }), coleccion('menus', { forzar: true })]);
  const item = docs.find((x) => x.id === 'xeral');
  const d = structuredClone(item?.datos ?? { cabeceira: { menu: 'principal', boton: {} }, pe: { texto: '', grupos: [], premios: [], menu: 'principal', menuLegal: 'legais' } });
  d.cabeceira ??= {};
  d.cabeceira.boton ??= {};
  d.pe ??= {};
  let actualizado = item?.actualizado;
  const opMenus = ms.map((m) => ({ valor: m.id, texto: m.datos.nome }));
  const erros = el('div');
  const marco = el('iframe', { class: 'estrutura-vista', title: 'A web con estes cambios gardados', src: '/' });

  const f = el('form', { novalidate: true, onsubmit: (e) => e.preventDefault(), oninput: () => { sucio.valor = true; }, onchange: () => { sucio.valor = true; } },
    c.bloque('Cabeceira', 'A barra de arriba: o logo e o menú principal.',
      c.escolla(d.cabeceira, 'menu', 'Menú da cabeceira', opMenus, { baleiro: '— O menú de sempre —', axuda: 'Os menús créanse e ordénanse en «Menús».' }),
      el('div', { class: 'fila2' },
        c.texto(d.cabeceira.boton, 'texto', 'Botón destacado (opcional)', { placeholder: 'Participa' }),
        c.texto(d.cabeceira.boton, 'url', 'Ligazón do botón', { placeholder: '/participa/' }))),
    c.bloque('Pé: texto e logos', 'A franxa clara de abaixo: quen organiza, impulsa e apoia, e os premios.',
      c.area(d.pe, 'texto', 'Texto do pé', { filas: 2 }),
      c.repetidor(d.pe, 'grupos', 'Grupos de logos', {
        novo: () => ({ titulo: '', entidades: [] }),
        engadirTexto: '+ Engadir grupo',
        axuda: 'As entidades e os seus logos xestiónanse en «Ecosistema».',
        pintarItem: (g) => [el('div', { class: 'fila2' }, c.texto(g, 'titulo', 'Título', { placeholder: 'Co apoio de' }), c.texto(g, 'nota', 'Nota pequena (opcional)')), c.entidades(g, 'entidades', 'Entidades')],
      }),
      c.repetidor(d.pe, 'premios', 'Premios e recoñecementos', {
        novo: () => ({ ano: '', texto: '' }),
        engadirTexto: '+ Engadir premio',
        pintarItem: (p) => el('div', { class: 'fila3' }, c.texto(p, 'ano', 'Ano'), el('div', { style: { gridColumn: 'span 2' } }, c.texto(p, 'texto', 'Premio'))),
      })),
    c.bloque('Pé: columnas e ligazóns', 'A franxa escura do final.',
      el('div', { class: 'fila2' },
        c.escolla(d.pe, 'menu', 'Menú da columna de navegación', opMenus, { baleiro: '— O mesmo da cabeceira —' }),
        c.texto(d.pe, 'tituloMenu', 'Título da columna', { placeholder: 'Navegación' })),
      el('div', { class: 'fila2' },
        el('div', { class: 'campo' }, el('label', {}, 'Columna de contactos'), el('p', { class: 'axuda' }, 'Mostra os contactos e redes de ', el('a', { href: '#/axustes' }, 'Axustes'), '.')),
        c.texto(d.pe, 'tituloContactos', 'Título da columna', { placeholder: 'Síguenos' })),
      c.escolla(d.pe, 'menuLegal', 'Menú das ligazóns legais (abaixo de todo)', opMenus, { baleiro: '— As de sempre —' }),
      c.rico(d.pe, 'licenzaCorpo', 'Texto da licenza', { axuda: 'Ex.: Contidos baixo licenza CC BY-SA 4.0, salvo indicación.' })),
    el('div', { class: 'accions-form' },
      el('button', { class: 'btn', type: 'button', onclick: gardarTodo }, 'Gardar cabeceira e pé'),
      el('span', { class: 'espazo' }),
      el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver na web ↗')));

  async function gardarTodo() {
    erros.replaceChildren();
    try {
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'estrutura', id: 'xeral', datos: d, actualizado } }), { mensaxe: 'Cabeceira e pé gardados' });
      actualizado = r.actualizado;
      sucio.valor = false;
      invalidar('estrutura');
      marco.src = `/?v=${Date.now()}`;
    } catch (e) { if (e.erros) erros.replaceChildren(caixaErros(e.erros)); }
  }

  main.replaceChildren(
    cab('Cabeceira e pé', 'O que sae en todas as páxinas. Despois de gardar, a vista de abaixo amosa a web actualizada.'),
    erros, f,
    el('details', { class: 'estrutura-detalles', open: true }, el('summary', {}, 'Ver a web (despois de gardar)'), marco));
  sucio.valor = false;
}
