// «Cabeceira e pé»: o que sae arriba e abaixo en todas as páxinas da web.
// Editor visual coma o das páxinas: á dereita a web, onde se escriben os textos do pé directamente;
// á esquerda as seccións libres que van enriba do pé e as opcións da cabeceira e do pé.
import { coleccion, el } from './nucleo.js';
import * as c from './campos.js';
import { editorVista } from './editor-vista.js';
import { modelosSeccion } from './modelos.js';

export async function cabeceiraPe(main) {
  const [docs, ms] = await Promise.all([coleccion('estrutura', { forzar: true }), coleccion('menus', { forzar: true })]);
  const item = docs.find((x) => x.id === 'xeral');
  const d = structuredClone(item?.datos ?? { cabeceira: { menu: 'principal', boton: {} }, pe: { texto: '', grupos: [], premios: [], menu: 'principal', menuLegal: 'legais' } });
  d.cabeceira ??= {};
  d.cabeceira.boton ??= {};
  d.pe ??= {};
  d.pe.mostrarMarca ??= true;
  d.pe.mostrarContactos ??= true;
  const opMenus = ms.map((m) => ({ valor: m.id, texto: m.datos.nome }));

  const axustes = (d) => [
    el('div', { class: 'ed-nota' }, 'Os textos do pé tamén se poden escribir directamente na vista da dereita. As seccións da outra pestana saen en todas as páxinas, enriba do pé.'),
    c.bloque('Cabeceira', 'A barra de arriba: o logo e o menú principal. O logo e as cores cámbianse en «Identidade visual».',
      c.escolla(d.cabeceira, 'menu', 'Menú da cabeceira', opMenus, { baleiro: '— O menú de sempre —', axuda: 'Os menús créanse e ordénanse en «Menús».' }),
      el('div', { class: 'fila2' },
        c.texto(d.cabeceira.boton, 'texto', 'Botón destacado (opcional)', { placeholder: 'Participa' }),
        c.texto(d.cabeceira.boton, 'url', 'Ligazón do botón', { placeholder: '/participa/' }))),
    c.bloque('Pé: logos e premios', 'A franxa clara: quen organiza, impulsa e apoia, e os recoñecementos.',
      c.repetidor(d.pe, 'grupos', 'Grupos de logos', {
        novo: () => ({ titulo: 'Novo grupo', entidades: [] }),
        engadirTexto: '+ Engadir grupo',
        axuda: 'As entidades e os seus logos xestiónanse en «Ecosistema».',
        pintarItem: (g) => [el('div', { class: 'fila2' }, c.texto(g, 'titulo', 'Título', { placeholder: 'Co apoio de' }), c.texto(g, 'nota', 'Nota pequena (opcional)')), c.entidades(g, 'entidades', 'Entidades')],
      }),
      c.repetidor(d.pe, 'premios', 'Premios e recoñecementos', {
        novo: () => ({ ano: String(new Date().getFullYear()), texto: 'Novo recoñecemento' }),
        engadirTexto: '+ Engadir premio',
        pintarItem: (p) => el('div', { class: 'fila3' }, c.texto(p, 'ano', 'Ano'), el('div', { style: { gridColumn: 'span 2' } }, c.texto(p, 'texto', 'Premio'))),
      })),
    c.bloque('Pé: franxa escura', 'Logo e texto, columna de navegación, contactos e ligazóns legais.',
      c.marca(d.pe, 'mostrarMarca', 'Mostrar o logo e o nome'),
      c.area(d.pe, 'texto', 'Texto baixo o logo', { filas: 2 }),
      el('div', { class: 'fila2' },
        c.escolla(d.pe, 'menu', 'Menú da columna de navegación', opMenus, { baleiro: '— O mesmo da cabeceira —' }),
        c.texto(d.pe, 'tituloMenu', 'Título da columna', { placeholder: 'Navegación' })),
      c.marca(d.pe, 'mostrarContactos', 'Mostrar a columna de contactos e redes'),
      el('div', { class: 'fila2' },
        c.texto(d.pe, 'tituloContactos', 'Título da columna', { placeholder: 'Síguenos' }),
        el('div', { class: 'campo' }, el('label', {}, 'Contactos'), el('p', { class: 'axuda' }, 'Saen os contactos e redes de ', el('a', { href: '#/axustes' }, 'Axustes'), '.'))),
      c.escolla(d.pe, 'menuLegal', 'Menú das ligazóns legais (abaixo de todo)', opMenus, { baleiro: '— As de sempre —' }),
      c.rico(d.pe, 'licenzaCorpo', 'Texto da licenza', { axuda: 'Ex.: Contidos baixo licenza CC BY-SA 4.0, salvo indicación.' })),
  ];

  editorVista(main, {
    coleccion: 'estrutura',
    id: 'xeral',
    d,
    item,
    titulo: () => 'Cabeceira e pé',
    volver: ['#/', 'Resumo'],
    verNaWeb: () => '/',
    axustes,
    pestanaAxustes: 'Cabeceira e pé',
    pestanaSeccions: 'Seccións enriba do pé',
    axustesAbertos: true,
    modelos: modelosSeccion(),
  });
}
