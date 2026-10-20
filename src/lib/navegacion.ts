// Menú superior, navegación do pé e ligazóns legais (editables no panel, en Páxinas › Menú e pé).
// Se aínda non se gardou nada no panel, úsase o menú de sempre (src/data/site.ts).
import { obter, paxinasLibres } from './datos';
import { nav } from '../data/site';
import type { Navegacion, PaxinaLibre } from './esquemas';

export interface LigazonNav { href: string; texto: string }
export interface ItemNav extends LigazonNav { edicions?: boolean; fillos: LigazonNav[] }

const RUTAS_FIXAS: Record<string, string> = { inicio: '/', feiralab: '/feiralab/', participa: '/participa/', actualidade: '/actualidade/', recursos: '/recursos/', edicions: '/edicions/' };
export const rutaPaxina = (p: Pick<PaxinaLibre, 'id' | 'nai'>) => RUTAS_FIXAS[p.id] ?? (p.nai ? `/${p.nai}/${p.id}/` : `/${p.id}/`);

const legaisBase: LigazonNav[] = [
  { href: '/aviso-legal/', texto: 'Aviso legal' },
  { href: '/privacidade/', texto: 'Privacidade' },
  { href: '/cookies/', texto: 'Cookies' },
  { href: '/accesibilidade/', texto: 'Accesibilidade' },
];

export async function navegacion(): Promise<{ menu: ItemNav[]; pe: LigazonNav[]; legais: LigazonNav[] }> {
  const n = (await obter('navegacion', 'xeral')) as unknown as Navegacion | null;
  if (!n || !n.menu.length) {
    const menu = nav.map((i) => ({ href: `/${i.href}`, texto: i.texto, edicions: Boolean(i.despregable), fillos: [] }));
    return { menu, pe: menu, legais: legaisBase };
  }
  const lista = await paxinasLibres();
  const paxs = new Map(lista.map((p) => [p.id, p]));
  const resolver = (l: { tipo: string; paxina?: string; url?: string; texto?: string }): LigazonNav | null => {
    if (l.tipo === 'ligazon') return l.url && l.texto ? { href: l.url, texto: l.texto } : null;
    const p = l.paxina ? paxs.get(l.paxina) : undefined;
    // As páxinas fixas sempre existen aínda que non estean gardadas; as borradas ou en borrador non saen
    if (!p) return l.paxina && RUTAS_FIXAS[l.paxina] ? { href: RUTAS_FIXAS[l.paxina], texto: l.texto ?? l.paxina } : null;
    return { href: rutaPaxina(p), texto: l.texto || p.titulo };
  };
  const menu = n.menu.flatMap((i): ItemNav[] => {
    // As edicións (despregable cos anos) son as subpáxinas automáticas da páxina Edicións
    if (i.tipo === 'edicions' || (i.tipo === 'paxina' && i.paxina === 'edicions' && i.auto)) {
      return [{ href: '/edicions/', texto: i.texto || paxs.get('edicions')?.titulo || 'Edicións', edicions: true, fillos: [] }];
    }
    const r = resolver(i);
    if (!r) return [];
    const fillos = i.fillos.map(resolver).filter((x): x is LigazonNav => Boolean(x));
    if (i.auto && i.tipo === 'paxina' && i.paxina) {
      for (const p of lista.filter((x) => x.nai === i.paxina)) if (!fillos.some((f) => f.href === rutaPaxina(p))) fillos.push({ href: rutaPaxina(p), texto: p.titulo });
    }
    return [{ ...r, fillos }];
  });
  const pe = n.peIgual || !n.pe.length ? menu : n.pe.map(resolver).filter((x): x is LigazonNav => Boolean(x));
  const legais = n.legais.length ? n.legais.map(resolver).filter((x): x is LigazonNav => Boolean(x)) : legaisBase;
  return { menu, pe, legais };
}
