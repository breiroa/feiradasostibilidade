// Páxinas › Menú e pé: que páxinas saen no menú superior (con submenús), na navegación do pé e nas ligazóns legais.
import { api, caixaErros, coleccion, el, gardar, invalidar } from './nucleo.js';
import { sucio } from './coleccions.js';
import * as c from './campos.js';

const MENU_BASE = {
  menu: [
    { tipo: 'paxina', paxina: 'inicio', fillos: [] },
    { tipo: 'paxina', paxina: 'feiralab', fillos: [] },
    { tipo: 'edicions', fillos: [] },
    { tipo: 'paxina', paxina: 'actualidade', fillos: [] },
    { tipo: 'paxina', paxina: 'recursos', fillos: [] },
    { tipo: 'paxina', paxina: 'participa', fillos: [] },
  ],
  peIgual: true,
  pe: [],
  legais: ['aviso-legal', 'privacidade', 'cookies', 'accesibilidade'].map((paxina) => ({ tipo: 'paxina', paxina })),
};

export async function menuEPe(cont) {
  const [docs, paxs] = await Promise.all([coleccion('navegacion', { forzar: true }), coleccion('paxinas_libres', { forzar: true })]);
  const item = docs.find((x) => x.id === 'xeral');
  const d = structuredClone(item?.datos ?? MENU_BASE);
  let actualizado = item?.actualizado;
  const opcionsPax = paxs.map((p) => ({ valor: p.id, texto: `${p.datos.titulo}${p.datos.borrador ? ' (borrador)' : ''}` }));
  const erros = el('div');
  const avisoLonxitude = el('div');

  // Un elemento: páxina da web, ligazón libre ou (só no menú) o despregable automático de Edicións
  const elemento = (x, { conEdicions = false, conFillos = false } = {}) => {
    const caixa = el('div');
    const pintar = () => caixa.replaceChildren(
      el('div', { class: 'fila3' },
        c.escolla(x, 'tipo', 'Tipo', [
          { valor: 'paxina', texto: 'Páxina da web' }, { valor: 'ligazon', texto: 'Ligazón libre' },
          ...(conEdicions ? [{ valor: 'edicions', texto: 'Edicións (despregable automático)' }] : []),
        ], { aoCambiar: pintar }),
        x.tipo === 'paxina' ? c.escolla(x, 'paxina', 'Páxina', opcionsPax, { baleiro: 'Escolle…' }) : x.tipo === 'ligazon' ? c.texto(x, 'url', 'Enderezo', { placeholder: '/paxina/ ou https://…' }) : el('div'),
        c.texto(x, 'texto', x.tipo === 'ligazon' ? 'Texto' : 'Texto (opcional)', { placeholder: x.tipo === 'paxina' ? 'O título da páxina' : '' })),
      conFillos && x.tipo !== 'edicions'
        ? c.repetidor(x, 'fillos', 'Submenú (opcional)', { novo: () => ({ tipo: 'paxina' }), engadirTexto: '+ Engadir ao submenú',
          axuda: 'Se engades elementos, este punto do menú ábrese como despregable.', pintarItem: (f) => elemento(f) })
        : null);
    pintar();
    return caixa;
  };

  const comprobar = () => avisoLonxitude.replaceChildren(d.menu.length > 7
    ? el('div', { class: 'aviso-caixa' }, `O menú ten ${d.menu.length} elementos. Con máis de 7 non cabe ben nunha liña: mellor agrupar algúns nun submenú.`)
    : null);
  const peBloque = el('div');
  const pintarPe = () => peBloque.replaceChildren(
    c.marca(d, 'peIgual', 'Igual que o menú superior'),
    d.peIgual ? null : c.repetidor(d, 'pe', 'Ligazóns da columna «Navegación»', { novo: () => ({ tipo: 'paxina' }), engadirTexto: '+ Engadir ligazón', pintarItem: (x) => elemento(x) }));

  const f = el('form', { novalidate: true, onsubmit: (e) => e.preventDefault(),
    oninput: () => { sucio.valor = true; comprobar(); },
    onchange: (e) => { sucio.valor = true; comprobar(); if (e.target.type === 'checkbox') pintarPe(); } },
    c.bloque('Menú superior', 'Ordena con as frechas. Cada punto pode ser unha páxina, unha ligazón ou o despregable de Edicións, e pode ter un submenú.',
      avisoLonxitude,
      c.repetidor(d, 'menu', '', { novo: () => ({ tipo: 'paxina', fillos: [] }), engadirTexto: '+ Engadir ao menú', pintarItem: (x) => elemento(x, { conEdicions: true, conFillos: true }) })),
    c.bloque('Pé de páxina: navegación', null, peBloque),
    c.bloque('Pé de páxina: ligazóns legais', 'Aviso legal, privacidade, cookies…',
      c.repetidor(d, 'legais', '', { novo: () => ({ tipo: 'paxina' }), engadirTexto: '+ Engadir ligazón', pintarItem: (x) => elemento(x) })),
    el('div', { class: 'accions-form' },
      el('button', { class: 'btn', type: 'button', onclick: async () => {
        erros.replaceChildren();
        try {
          const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'navegacion', id: 'xeral', datos: d, actualizado, forzar: true } }), { mensaxe: 'Menú gardado' });
          actualizado = r.actualizado;
          sucio.valor = false;
          invalidar('navegacion');
        } catch (e) { if (e.erros) erros.replaceChildren(caixaErros(e.erros)); }
      } }, 'Gardar menú e pé'),
      el('span', { class: 'espazo' }),
      el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver na web ↗')));
  pintarPe();
  comprobar();
  cont.replaceChildren(erros, f);
  sucio.valor = false;
}
