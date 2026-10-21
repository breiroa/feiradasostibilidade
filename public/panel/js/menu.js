// «Menús»: os menús da web (o principal, o das ligazóns legais e os que se creen). En «Cabeceira e pé» escóllese
// cal vai en cada sitio. Cada menú constrúese arrastrando páxinas:
//  - Á esquerda, as páxinas da web (arrastrar ou «+» para engadilas).
//  - Á dereita, o menú: arrastrar enriba/debaixo dun elemento para ordenar, ou sobre el (á dereita) para metelo no seu
//    despregable. Un elemento con fillos convértese só nun despregable. Os textos (p. ex. os anos) escríbense a man.
import { api, caixaErros, coleccion, confirmar, dataHora, el, gardar, invalidar, modal, slug as slugify } from './nucleo.js';
import { sucio } from './coleccions.js';
import { pedirLigazon } from './editor-vista.js';

const RUTAS_FIXAS = { inicio: '/', feiralab: '/feiralab/', participa: '/participa/', actualidade: '/actualidade/', recursos: '/recursos/', edicions: '/edicions/' };
const cab = (titulo, intro, ...extra) => el('div', { class: 'cab' }, el('div', {}, el('h1', {}, titulo), intro ? el('p', { class: 'muted' }, intro) : null), ...extra);

/** Ruta #/menus[/id] */
export async function menus(main, id) {
  if (id) return editarMenu(main, id);
  const [lista, est] = await Promise.all([coleccion('menus', { forzar: true }), coleccion('estrutura', { forzar: true })]);
  const e = est.find((x) => x.id === 'xeral')?.datos ?? {};
  const usos = (m) => [e.cabeceira?.menu === m.id && 'Cabeceira', e.pe?.menu === m.id && 'Pé: navegación', e.pe?.menuLegal === m.id && 'Pé: legais'].filter(Boolean);
  const novo = async () => {
    const i = el('input', { type: 'text', placeholder: 'Menú de FeiraLab' });
    const m = modal('Novo menú', el('div', { class: 'campo' }, el('label', {}, 'Nome do menú'), i, el('div', { class: 'axuda' }, 'Só para recoñecelo no panel.')), {
      botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn', onclick: async () => {
          if (!i.value.trim()) return;
          const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'menus', novo: true, id: slugify(i.value), datos: { nome: i.value.trim(), items: [] } } }), { mensaxe: 'Menú creado' });
          invalidar('menus');
          m.pechar();
          location.hash = `#/menus/${r.id}`;
        } }, 'Crear')],
    });
    setTimeout(() => i.focus(), 30);
  };
  const borrar = async (m) => {
    if (!(await confirmar(`Borrar o menú «${m.datos.nome}»?`, { detalle: 'Vai á papeleira (Páxinas › Papeleira).' }))) return;
    try {
      await gardar(() => api('documentos', { metodo: 'DELETE', datos: { coleccion: 'menus', id: m.id } }), { mensaxe: 'Menú borrado' });
      invalidar('menus');
      menus(main);
    } catch (err) { if (err.erros) modal('Non se pode borrar', el('div', {}, caixaErros(err.erros), el('p', { class: 'muted' }, 'Escolle antes outro menú en «Cabeceira e pé».'))); }
  };
  main.replaceChildren(
    cab('Menús', 'Os menús da web. En «Cabeceira e pé» escolles cal sae arriba e cales no pé.', el('button', { class: 'btn', type: 'button', onclick: novo }, '+ Novo menú')),
    el('div', { class: 'tarxetas-lista' }, lista.length ? lista.map((m) => el('a', { class: 'lista-fila', href: `#/menus/${m.id}` },
      el('div', {}, el('b', {}, m.datos.nome), el('br'), el('small', { class: 'muted' }, `${m.datos.items.length} elementos${usos(m).length ? ` · ${usos(m).join(', ')}` : ' · non se usa'}`)),
      el('div', { class: 'accions' },
        el('span', { class: 'muted' }, m.actualizado ? dataHora(m.actualizado) : ''),
        el('button', { type: 'button', class: 'icobtn perigo', title: 'Borrar', onclick: (ev) => { ev.preventDefault(); borrar(m); } }, '🗑')))) : el('p', { class: 'muted' }, 'Aínda non hai menús.')));
}

async function editarMenu(main, id) {
  const [lista, paxs] = await Promise.all([coleccion('menus', { forzar: true }), coleccion('paxinas_libres', { forzar: true })]);
  const item = lista.find((x) => x.id === id);
  if (!item) { main.replaceChildren(el('a', { class: 'volver', href: '#/menus' }, '← Menús'), el('div', { class: 'baleiro' }, 'Non se atopou este menú.')); return; }
  const d = structuredClone(item.datos);
  let actualizado = item.actualizado;
  const erros = el('div');
  const paxDe = (pid) => paxs.find((p) => p.id === pid);
  const rutaDe = (p) => RUTAS_FIXAS[p.id] ?? (p.datos.nai ? `/${p.datos.nai}/${p.id}/` : `/${p.id}/`);
  const nomeDe = (i) => i.texto || (i.tipo === 'ligazon' ? i.url : paxDe(i.paxina)?.datos.titulo ?? `(páxina borrada: ${i.paxina})`);
  const subpaxinas = (pid) => paxs.filter((p) => p.datos.nai === pid).map((p) => p.datos.titulo);
  let arrastre = null; // { item, orixe?: {lista, i} }
  const cambio = () => { sucio.valor = true; pintar(); };

  function arbore(l, niveis, baleiro) {
    const ul = el('ul', { class: 'menu-arbore' });
    const soltarFinal = el('li', { class: 'menu-soltar-final' }, l.length ? 'Solta aquí para poñer ao final' : baleiro);
    soltarFinal.addEventListener('dragover', (e) => { if (arrastre) { e.preventDefault(); soltarFinal.classList.add('activo'); } });
    soltarFinal.addEventListener('dragleave', () => soltarFinal.classList.remove('activo'));
    soltarFinal.addEventListener('drop', (e) => { e.preventDefault(); if (arrastre) soltar(l, l.length); });
    l.forEach((it, i) => ul.append(nodo(it, l, i, niveis)));
    ul.append(soltarFinal);
    return ul;
  }

  function nodo(it, l, i, niveis) {
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
          ? el('label', { class: 'menu-auto', title: 'O despregable engade soas as subpáxinas desta páxina (co seu título)' }, el('input', { type: 'checkbox', checked: Boolean(it.auto), onchange: (e) => { it.auto = e.target.checked; cambio(); } }), 'Engadir subpáxinas soas')
          : null,
        el('button', { type: 'button', class: 'icobtn', title: 'Cambiar o texto', onclick: () => renomear(it) }, '✎'),
        el('button', { type: 'button', class: 'icobtn', title: 'Cambiar a páxina ou ligazón', onclick: () => cambiarDestino(it) }, '🔗'),
        el('button', { type: 'button', class: 'icobtn perigo', title: 'Quitar do menú', onclick: () => { l.splice(i, 1); cambio(); } }, '×')));
    li.append(fila);
    fila.addEventListener('dragstart', (e) => { e.stopPropagation(); arrastre = { item: it, orixe: { lista: l, i } }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'menu'); fila.classList.add('arrastrando'); });
    fila.addEventListener('dragend', limparMarcas);
    fila.addEventListener('dragover', (e) => {
      if (!arrastre || arrastre.item === it) return;
      const b = fila.getBoundingClientRect();
      const dentro = podeFillos && e.clientX > b.left + 60 && e.clientY > b.top + b.height * 0.2 && e.clientY < b.bottom - b.height * 0.2 && !(arrastre.item.fillos?.length);
      const antes = !dentro && e.clientY < b.top + b.height / 2;
      e.preventDefault();
      e.stopPropagation();
      fila.classList.toggle('soltar-dentro', dentro);
      fila.classList.toggle('soltar-antes', antes);
      fila.classList.toggle('soltar-despois', !dentro && !antes);
    });
    fila.addEventListener('dragleave', () => fila.classList.remove('soltar-dentro', 'soltar-antes', 'soltar-despois'));
    fila.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!arrastre) return;
      const dentro = fila.classList.contains('soltar-dentro');
      const antes = fila.classList.contains('soltar-antes');
      if (dentro) { it.fillos = it.fillos ?? []; soltar(it.fillos, it.fillos.length); }
      else soltar(l, antes ? i : i + 1);
    });
    if (podeFillos && (it.fillos?.length || autos.length)) {
      const sub = el('ul', { class: 'menu-arbore menu-sub' });
      (it.fillos ?? []).forEach((f, k) => sub.append(nodo(f, it.fillos, k, 1)));
      if (autos.length) sub.append(el('li', { class: 'menu-auto-lista muted' }, `E soas: ${autos.slice(0, 6).join(' · ')}${autos.length > 6 ? '…' : ''}`));
      li.append(sub);
    }
    return li;
  }

  function soltar(l, pos) {
    const a = arrastre;
    arrastre = null;
    limparMarcas();
    if (!a) return;
    let it = a.item;
    if (l !== d.items && it.fillos?.length) {
      modal('Non se pode', el('p', {}, 'Ese elemento ten o seu propio despregable: non se pode meter dentro doutro. Baleira antes o seu despregable.'));
      return;
    }
    if (a.orixe) {
      a.orixe.lista.splice(a.orixe.i, 1);
      if (a.orixe.lista === l && a.orixe.i < pos) pos--;
    } else it = structuredClone(it);
    it.fillos = l === d.items ? it.fillos ?? [] : [];
    if (l !== d.items) it.auto = false;
    l.splice(pos, 0, it);
    cambio();
  }
  function limparMarcas() {
    main.querySelectorAll('.arrastrando, .soltar-dentro, .soltar-antes, .soltar-despois, .activo').forEach((x) => x.classList.remove('arrastrando', 'soltar-dentro', 'soltar-antes', 'soltar-despois', 'activo'));
  }

  function renomear(it) {
    const i = el('input', { type: 'text', value: it.texto ?? '', placeholder: nomeDe({ ...it, texto: '' }) });
    const m = modal('Texto no menú', el('div', { class: 'campo' }, el('label', {}, 'Texto'), i, el('div', { class: 'axuda' }, it.tipo === 'paxina' ? 'Baleiro = o título da páxina.' : '')), {
      botons: [el('button', { type: 'button', class: 'btn-ghost', onclick: () => m.pechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn', onclick: () => { const v = i.value.trim(); if (v) it.texto = v; else if (it.tipo === 'paxina') delete it.texto; m.pechar(); cambio(); } }, 'Aceptar')],
    });
    setTimeout(() => i.focus(), 30);
  }
  async function cambiarDestino(it) {
    const actual = it.tipo === 'ligazon' ? it.url : paxDe(it.paxina) ? rutaDe(paxDe(it.paxina)) : '';
    const r = await pedirLigazon({ url: actual });
    if (!r || r === 'quitar') return;
    const p = paxs.find((x) => rutaDe(x) === r.url);
    if (p) Object.assign(it, { tipo: 'paxina', paxina: p.id, url: undefined });
    else Object.assign(it, { tipo: 'ligazon', url: r.url, paxina: undefined, texto: it.texto || r.url });
    cambio();
  }
  async function engadirLigazon() {
    const r = await pedirLigazon({ boton: true, texto: '' });
    if (!r || r === 'quitar' || !r.texto) return;
    d.items.push({ tipo: 'ligazon', url: r.url, texto: r.texto, fillos: [], auto: false });
    cambio();
  }

  function paleta() {
    const raiz = paxs.filter((p) => !p.datos.nai);
    const fila_ = (p, nivel = 0) => {
      const novo = { tipo: 'paxina', paxina: p.id, fillos: [], auto: false };
      const li = el('li', { class: `paleta-item nivel-${nivel}`, draggable: true },
        el('span', { class: 'pax-asa', 'aria-hidden': 'true' }, '⠿'),
        el('span', { class: 'paleta-nome' }, p.datos.titulo, p.datos.borrador ? el('small', { class: 'muted' }, ' (borrador)') : null),
        el('button', { type: 'button', class: 'icobtn', title: 'Engadir ao final do menú', onclick: () => { d.items.push(structuredClone(novo)); cambio(); } }, '+'));
      li.addEventListener('dragstart', (e) => { arrastre = { item: novo }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', 'paxina'); });
      li.addEventListener('dragend', limparMarcas);
      const fillas = paxs.filter((x) => x.datos.nai === p.id);
      if (p.id === 'edicions') fillas.sort((a, b) => (b.datos.edicion?.ano ?? 0) - (a.datos.edicion?.ano ?? 0));
      return [li, ...fillas.map((x) => fila_(x, 1))];
    };
    return el('div', { class: 'menu-paleta' },
      el('h3', {}, 'Páxinas da web'),
      el('p', { class: 'muted' }, 'Arrastra unha páxina ao menú (ou dentro dun elemento para facer un despregable), ou preme «+».'),
      el('ul', {}, raiz.flatMap((p) => fila_(p))));
  }

  const nome = { nome: d.nome };
  const vista = el('div');
  function pintar() {
    const n = d.items.length;
    vista.replaceChildren(
      el('div', { class: 'menu-editor' },
        paleta(),
        el('div', { class: 'menu-columnas' },
          el('section', { class: 'menu-bloque' },
            el('div', { class: 'campo' }, el('label', {}, 'Nome do menú'), el('input', { type: 'text', value: nome.nome, oninput: (e) => { d.nome = e.target.value; sucio.valor = true; } })),
            el('p', { class: 'muted' }, 'Arrastra para ordenar. Solta un elemento sobre a parte dereita doutro para metelo no seu despregable.'),
            n > 7 ? el('div', { class: 'aviso-caixa' }, `O menú ten ${n} elementos: con máis de 7 non cabe nunha liña na cabeceira. Mellor meter algúns nun despregable.`) : null,
            arbore(d.items, 2, 'Arrastra aquí páxinas para crear o menú'),
            el('button', { type: 'button', class: 'btn-mini', onclick: engadirLigazon }, '+ Ligazón externa')))),
      el('div', { class: 'accions-form' },
        el('button', { class: 'btn', type: 'button', onclick: gardarMenu }, 'Gardar menú'),
        el('a', { class: 'btn-ghost', href: '#/menus' }, 'Volver aos menús'),
        el('span', { class: 'espazo' }),
        el('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'Ver na web ↗')));
  }

  async function gardarMenu() {
    erros.replaceChildren();
    try {
      const r = await gardar(() => api('documentos', { metodo: 'POST', datos: { coleccion: 'menus', id, datos: d, actualizado } }), { mensaxe: 'Menú gardado' });
      actualizado = r.actualizado;
      sucio.valor = false;
      invalidar('menus');
    } catch (e) { if (e.erros) erros.replaceChildren(caixaErros(e.erros)); }
  }

  pintar();
  main.replaceChildren(el('a', { class: 'volver', href: '#/menus' }, '← Menús'), cab(d.nome, 'Os textos dos elementos pódense cambiar (✎): por exemplo, «2027» en lugar do título completo da edición.'), erros, vista);
  sucio.valor = false;
}
