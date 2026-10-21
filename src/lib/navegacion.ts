// Menús da web (panel › Menús) e onde se usan (panel › Cabeceira e pé).
// Se aínda non hai menús gardados, úsanse os de sempre (src/data/site.ts).
import { edicions, estrutura, menus, paxinasLibres } from './datos';
import { nav } from '../data/site';
import type { Menu, PaxinaLibre } from './esquemas';

export interface LigazonNav { href: string; texto: string }
export interface ItemNav extends LigazonNav { fillos: LigazonNav[] }

const RUTAS_FIXAS: Record<string, string> = { inicio: '/', feiralab: '/feiralab/', participa: '/participa/', actualidade: '/actualidade/', recursos: '/recursos/', edicions: '/edicions/' };
export const rutaPaxina = (p: Pick<PaxinaLibre, 'id' | 'nai'>) => RUTAS_FIXAS[p.id] ?? (p.nai ? `/${p.nai}/${p.id}/` : `/${p.id}/`);

const legaisBase: LigazonNav[] = [
  { href: '/aviso-legal/', texto: 'Aviso legal' },
  { href: '/privacidade/', texto: 'Privacidade' },
  { href: '/cookies/', texto: 'Cookies' },
  { href: '/accesibilidade/', texto: 'Accesibilidade' },
];

/** Resolve un menú gardado en ligazóns (as páxinas borradas ou en borrador non saen) */
function resolverMenu(m: Menu, lista: PaxinaLibre[], anos: { id: string; ano: number }[]): ItemNav[] {
  const paxs = new Map(lista.map((p) => [p.id, p]));
  const resolver = (l: { tipo: string; paxina?: string; url?: string; texto?: string }): LigazonNav | null => {
    if (l.tipo === 'ligazon') return l.url && l.texto ? { href: l.url, texto: l.texto } : null;
    const p = l.paxina ? paxs.get(l.paxina) : undefined;
    if (!p) return l.paxina && RUTAS_FIXAS[l.paxina] ? { href: RUTAS_FIXAS[l.paxina], texto: l.texto ?? l.paxina } : null;
    return { href: rutaPaxina(p), texto: l.texto || p.titulo };
  };
  return m.items.flatMap((i): ItemNav[] => {
    const r = resolver(i);
    if (!r) return [];
    const fillos = i.fillos.map(resolver).filter((x): x is LigazonNav => Boolean(x));
    // Subpáxinas automáticas (opcional): as fillas da páxina, na orde da árbore (as edicións, das máis novas)
    if (i.auto && i.tipo === 'paxina' && i.paxina) {
      const fillas = lista.filter((x) => x.nai === i.paxina);
      if (i.paxina === 'edicions') fillas.sort((a, b) => (anos.find((e) => e.id === b.id)?.ano ?? 0) - (anos.find((e) => e.id === a.id)?.ano ?? 0));
      for (const p of fillas) if (!fillos.some((f) => f.href === rutaPaxina(p))) fillos.push({ href: rutaPaxina(p), texto: p.titulo });
    }
    return [{ ...r, fillos }];
  });
}

export async function navegacion(): Promise<{ menu: ItemNav[]; pe: LigazonNav[]; legais: LigazonNav[]; boton?: LigazonNav }> {
  const [e, ms] = await Promise.all([estrutura(), menus()]);
  const buscar = (id?: string) => (id ? ms.find((m) => m.id === id) : undefined);
  const mCab = buscar(e.cabeceira.menu);
  const mPe = buscar(e.pe.menu);
  const mLegal = buscar(e.pe.menuLegal);
  const base = nav.map((i) => ({ href: `/${i.href}`, texto: i.texto, fillos: [] }));
  const [lista, eds] = mCab || mPe || mLegal ? await Promise.all([paxinasLibres(), edicions()]) : [[], []];
  const menu = mCab ? resolverMenu(mCab, lista, eds) : base;
  const pe = mPe ? resolverMenu(mPe, lista, eds).map(({ href, texto }) => ({ href, texto })) : menu.map(({ href, texto }) => ({ href, texto }));
  const legais = mLegal ? resolverMenu(mLegal, lista, eds).map(({ href, texto }) => ({ href, texto })) : legaisBase;
  const b = e.cabeceira.boton;
  return { menu, pe, legais, boton: b?.texto && b.url ? { href: b.url, texto: b.texto } : undefined };
}
