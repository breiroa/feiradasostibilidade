// Páxinas › Menú e pé: o menú constrúese arrastrando páxinas.
//  - Á esquerda, as páxinas da web (arrastrar ou «+» para engadilas).
//  - Á dereita, o menú: arrastrar enriba/debaixo dun elemento para ordenar, ou sobre el (á dereita) para metelo no seu submenú.
//  - Un elemento con fillos convértese só nun despregable. «Subpáxinas automáticas» engade soas as subpáxinas
//    da páxina (en «Edicións», os anos de cada edición).
import { api, caixaErros, coleccion, el, gardar, invalidar, modal } from './nucleo.js';
import { sucio } from './coleccions.js';
import { pedirLigazon } from './editor-vista.js';

const RUTAS_FIXAS = { inicio: '/', feiralab: '/feiralab/', participa: '/participa/', actualidade: '/actualidade/', recursos: '/recursos/', edicions: '/edicions/' };
const MENU_BASE = {
  menu: [
    { tipo: 'paxina', paxina: 'inicio', fillos: [] },
    { tipo: 'paxina', paxina: 'feiralab', fillos: [], auto: false },
    { tipo: 'paxina', paxina: 'edicions', fillos: [], auto: true },
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
  // Compatibilidade: o antigo elemento «Edicións (automático)» é a páxina Edicións con subpáxinas automáticas
  for (const i of d.menu) if (i.tipo === 'edicions') Object.assign(i, { tipo: 'paxina', paxina: 'edicions', auto: true });
  let actualizado = item?.actualizado;
  const erros = el('div');
  const paxDe = (id) => paxs.find((p) => p.id === id);
  const rutaDe = (p) => RUTAS_FIXAS[p.id] ?? (p.datos.nai ? `/${p.datos.nai}/${p.id}/` : `/${p.id}/`);
  const nomeDe = (i) => i.texto || (i.tipo === 'ligazon' ? i.url : paxDe(i.paxina)?.datos.titulo ?? `(páxina borrada: ${i.paxina})`);
  const subpaxinas = (id) => (id === 'edicions' ? ['(os anos das edicións)'] : paxs.filter((p) => p.datos.nai === id).map((p) => p.datos.titulo));
  let arrastre = null; // { de: 'paleta'|'arbore', item, orixe: {lista, i} }
  const cambio = () => { sucio.valor = true; pintar(); };

  // ── Árbore dunha lista (menú: dous niveis; pé e legais: un nivel) ──
  function arbore(lista, { niveis = 2, baleiro }) {
    const ul = el('ul', { class: 'menu-arbore' });
    const soltarFinal = el('li', { class: 'menu-soltar-final' }, lista.length ? 'Solta aquí para poñer ao final' : baleiro);
    zonaSoltar(soltarFinal, () => ({ lista, pos: lista.length }));
    lista.forEach((it, i) => ul.append(nodo(it, lista, i, niveis)));
    ul.append(soltarFinal);
    return ul;
  }

  function nodo(it, lista, i, niveis) {
    const p = it.tipo === 'paxina' ? paxDe(it.paxina) : null;
    const podeFillos = niveis > 1;
    const autos = podeFillos && it.auto && it.tipo === 'paxina' ? subpaxinas(it.paxina) : [];
    const li = el('li', { class: 'menu-nodo' });
    const fila = el('div', { class: 'menu-fila', draggable: true },
      el('span', { class: 'pax-asa', 'aria-hidden': 'true' }, '⠿'),
      el('div', { class: 'menu-nome' },
        el('b', {}, nomeDe(it)),
        el('small', { class: 'muted' }, it.tipo === 'ligazon' ? it.url : p ? rutaDe(p) : ''),
        p?.datos.borrador ? el('span', { class: 'pill aviso' }, 'Borrador: non sae') : null,
        it.tipo === 'paxina' && !p ? el('span', { class: 'pill aviso' }, 'Non existe') : null),
      el('div', { class: 'accions' },
        podeFillos && it.tipo === 'paxina' && (subpaxinas(it.paxina).length || it.auto)
          ? el('label', { class: 'menu-auto', title: 'O despregable mostra soas as subpáxinas desta páxina' }, el('input', { type: 'checkbox', checked: Boolean(it.auto), onchange: (e) => { it.auto = e.target.checked; cambio(); } }), it.paxina === 'edicions' ? 'Anos automáticos' : 'Subpáxinas automáticas')
          : null,
        el('button', { type: 'button', class: 'icobtn', title: 'Cambiar o texto', onclick: () => renomear(it) }, '✎'),
        it.tipo === 'ligazon' ? el('button', { type: 'button', class: 'icobtn', title: 'Cambiar a ligazón', onclick: async () => { const r = await pedirLigazon({ url: it.url }); if (r && r !== 'quitar') { it.url = r.url; cambio(); } } }, '🔗') : null,
        el('button', { type: 'button', class: 'icobtn perigo', title: 'Quitar do menú', onclick: () => { lista.splice(i, 1); cambio(); } }, '×')));
    li.append(fila);
    // Arrastrar este elemento
    fila.addEventListener('dragstart', (e) => { arrastre = { item: it, orixe: { lista, i } }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'menu'); fila.classList.add('arrastrando'); });
    fila.addEventListener('dragend', limparMarcas);
    // Soltar sobre este elemento: arriba/abaixo = ordenar; á dereita = dentro (submenú)
    fila.addEventListener('dragover', (e) => {
      if (!arrastre || arrastre.item === it) return;
      const b = fila.getBoundingClientRect();
      const dentro = podeFillos && e.clientX > b.left + 60 && e.clientY > b.top + b.height * 0.25 && e.clientY < b.bottom - b.height * 0.25 && !(arrastre.item.fillos?.length);
      const antes = !dentro && e.clientY < b.top + b.height / 2;
      e.preventDefault();
      fila.classList.toggle('soltar-dentro', dentro);
      fila.classList.toggle('soltar-antes', antes);
      fila.classList.toggle('soltar-despois', !dentro && !antes);
    });
    fila.addEventListener('dragleave', () => fila.classList.remove('soltar-dentro', 'soltar-antes', 'soltar-despois'));
    fila.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!arrastre) return;
      const dentro = fila.classList.contains('soltar-dentro');
      const antes = fila.classList.contains('soltar-antes');
      if (dentro) { it.fillos = it.fillos ?? []; soltar({ lista: it.fillos, pos: it.fillos.length }); }
      else soltar({ lista, pos: antes ? i : i + 1 });
    });
    if (podeFillos && (it.fillos?.length || autos.length)) {
      const sub = el('ul', { class: 'menu-arbore menu-sub' });
      (it.fillos ?? []).forEach((f, k) => sub.append(nodo(f, it.fillos, k, 1)));
      if (autos.length) sub.append(el('li', { class: 'menu-auto-lista muted' }, `Automáticas: ${autos.slice(0, 6).join(' · ')}${autos.length > 6 ? '…' : ''}`));
      li.append(sub);
    }
    return li;
  }

  function zonaSoltar(nodo_, destino) {
    nodo_.addEventListener('dragover', (e) => { if (arrastre) { e.preventDefault(); nodo_.classList.add('activo'); } });
    nodo_.addEventListener('dragleave', () => nodo_.classList.remove('activo'));
    nodo_.addEventListener('drop', (e) => { e.preventDefault(); if (arrastre) soltar(destino()); });
  }

  function soltar({ lista, pos }) {
    const a = arrastre;
    arrastre = null;
    limparMarcas();
    if (!a) return;
    let it = a.item;
    if (lista !== d.menu && lista !== d.pe && lista !== d.legais && it.fillos?.length) {
      modal('Non se pode', el('p', {}, 'Ese elemento ten o seu propio despregable: non se pode meter dentro doutro. Baleira antes o seu submenú.'));
      return;
    }
    if (a.orixe) {
      // Mover: quitalo do sitio de orixe (axustando a posición se é a mesma lista)
      a.orixe.lista.splice(a.orixe.i, 1);
      if (a.orixe.lista === lista && a.orixe.i < pos) pos--;
    } else it = structuredClone(it);
    if (lista !== d.menu) { delete it.fillos; delete it.auto; } // os submenús non teñen máis niveis
    else it.fillos = it.fillos ?? [];
    lista.splice(pos, 0, it);
    cambio();
  }
  function limparMarcas() {
    cont.querySelectorAll('.arrastrando, .soltar-dentro, .soltar-antes, .soltar-despois, .activo').forEach((x) => x.classList.remove('arrastrando', 'soltar-dentro', 'soltar-antes', 'soltar-despois', 'activo'));
  }

  function renomear(it) {
    const i = el('input', { type: 'text', value: it.texto ?? '', placeholder: nomeDe({ ...it, texto: '' }) });
    const m = modal('Texto no menú', el('div', { class: 'campo' }, el('label', {}, 'Texto'), i, el('div', { class: 'axuda' }, it.tipo === 'paxina' ? 'Baleiro = o título da páxina.' : '')), {
      botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn', onclick: () => { const v = i.value.trim(); if (v) it.texto = v; else if (it.tipo === 'paxina') delete it.texto; m.pechar(); cambio(); } }, 'Aceptar')],
    });
    setTimeout(() => i.focus(), 30);
  }

  async function engadirLigazon(lista) {
    const r = await pedirLigazon({ boton: true, texto: '' });
    if (!r || r === 'quitar' || !r.texto) return;
    lista.push({ tipo: 'ligazon', url: r.url, texto: r.texto, ...(lista === d.menu ? { fillos: [] } : {}) });
    cambio();
  }

  // ── Paleta de páxinas ──
  let destinoPaleta = 'menu';
  function paleta() {
    const raiz = paxs.filter((p) => !p.datos.nai);
    const item = (p, nivel = 0) => {
      const novo = { tipo: 'paxina', paxina: p.id };
      const li = el('li', { class: `paleta-item nivel-${nivel}`, draggable: true },
        el('span', { class: 'pax-asa', 'aria-hidden': 'true' }, '⠿'),
        el('span', { class: 'paleta-nome' }, p.datos.titulo, p.datos.borrador ? el('small', { class: 'muted' }, ' (borrador)') : null),
        el('button', { type: 'button', class: 'icobtn', title: 'Engadir', onclick: () => { const l = d[destinoPaleta]; l.push({ ...novo, ...(destinoPaleta === 'menu' ? { fillos: [] } : {}) }); cambio(); } }, '+'));
      li.addEventListener('dragstart', (e) => { arrastre = { item: novo }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', 'paxina'); });
      li.addEventListener('dragend', limparMarcas);
      return [li, ...paxs.filter((x) => x.datos.nai === p.id).map((x) => item(x, 1))];
    };
    return el('div', { class: 'menu-paleta' },
      el('h3', {}, 'Páxinas da web'),
      el('p', { class: 'muted' }, 'Arrastra unha páxina ao menú ou preme «+».'),
      el('div', { class: 'campo' }, el('label', {}, '«+» engade en:'), el('select', { onchange: (e) => { destinoPaleta = e.target.value; } },
        el('option', { value: 'menu' }, 'Menú superior'), el('option', { value: 'pe' }, 'Pé: navegación'), el('option', { value: 'legais' }, 'Pé: legais'))),
      el('ul', {}, raiz.flatMap((p) => item(p))));
  }

  // ── Pintar todo ──
  const vista = el('div');
  function pintar() {
    const n = d.menu.length;
    vista.replaceChildren(
      el('div', { class: 'menu-editor' },
        paleta(),
        el('div', { class: 'menu-columnas' },
          el('section', { class: 'menu-bloque' },
            el('h3', {}, 'Menú superior'),
            el('p', { class: 'muted' }, 'Arrastra para ordenar. Solta un elemento sobre a parte dereita doutro para metelo no seu despregable.'),
            n > 7 ? el('div', { class: 'aviso-caixa' }, `O menú ten ${n} elementos: con máis de 7 non cabe nunha liña. Mellor meter algúns nun despregable.`) : null,
            arbore(d.menu, { niveis: 2, baleiro: 'Arrastra aquí páxinas para crear o menú' }),
            el('button', { type: 'button', class: 'btn-mini', onclick: () => engadirLigazon(d.menu) }, '+ Ligazón externa')),
          el('section', { class: 'menu-bloque' },
            el('h3', {}, 'Pé de páxina: navegación'),
            el('label', { class: 'marca' }, el('input', { type: 'checkbox', checked: d.peIgual, onchange: (e) => { d.peIgual = e.target.checked; cambio(); } }), ' Igual que o menú superior'),
            d.peIgual ? null : [arbore(d.pe, { niveis: 1, baleiro: 'Arrastra aquí páxinas' }), el('button', { type: 'button', class: 'btn-mini', onclick: () => engadirLigazon(d.pe) }, '+ Ligazón externa')]),
          el('section', { class: 'menu-bloque' },
            el('h3', {}, 'Pé de páxina: ligazóns legais'),
            arbore(d.legais, { niveis: 1, baleiro: 'Arrastra aquí as páxinas legais' })))),
      el('div', { class: 'accions-form' },
        el('button', { class: 'btn', type: 'button', onclick: gardarMenu }, 'Gardar menú e pé'),
        el('span', { class: 'espazo' }),
        el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver na web ↗')));
  }

  async function gardarMenu() {
    erros.replaceChildren();
    try {
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'navegacion', id: 'xeral', datos: d, actualizado, forzar: true } }), { mensaxe: 'Menú gardado' });
      actualizado = r.actualizado;
      sucio.valor = false;
      invalidar('navegacion');
    } catch (e) { if (e.erros) erros.replaceChildren(caixaErros(e.erros)); }
  }

  pintar();
  cont.replaceChildren(erros, vista);
  sucio.valor = false;
}
