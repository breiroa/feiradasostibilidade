// Acceso á base de datos (Cloudflare D1). Toda a web pública le os contidos desde aquí.
// Se algún día se cambia de base de datos, só hai que tocar este ficheiro.
import { env } from 'cloudflare:workers';
import { paxinasPorDefecto } from './paxinas-sistema';
import { esquemas, seccion, type Seccion, type Axustes, type Coleccion, type Edicion, type Entidade, type Estrutura, type Identidade, type Menu, type Noticia, type PaxinaLibre, type Recurso } from './esquemas';

export const db = (): D1Database => (env as unknown as { DB: D1Database }).DB;

interface Fila {
  id: string;
  datos: string;
  orde: number;
}

/** Le e valida un documento. Se non é válido devolve null (e avisa no rexistro) para non romper a páxina. */
function parse<C extends Coleccion>(coleccion: C, fila: Fila) {
  const datos = JSON.parse(fila.datos);
  // Unha sección mal formada omítese, pero non tumba a páxina enteira
  if (datos && Array.isArray(datos.seccions)) datos.seccions = seccionsValidas(datos.seccions);
  const res = esquemas[coleccion].safeParse(datos);
  if (!res.success) {
    console.warn(`Documento non válido ${coleccion}/${fila.id}`, res.error.issues);
    return null;
  }
  return { ...(res.data as object), id: fila.id, orde: fila.orde };
}

export async function listar<C extends Coleccion>(coleccion: C) {
  const { results } = await db()
    .prepare('SELECT id, datos, orde FROM documentos WHERE coleccion = ? ORDER BY orde, id')
    .bind(coleccion)
    .all<Fila>();
  return results.map((f) => parse(coleccion, f)).filter((d) => d !== null);
}

export async function obter<C extends Coleccion>(coleccion: C, id: string) {
  const fila = await db()
    .prepare('SELECT id, datos, orde FROM documentos WHERE coleccion = ? AND id = ?')
    .bind(coleccion, id)
    .first<Fila>();
  return fila ? parse(coleccion, fila) : null;
}

// ── Accesos tipados para as páxinas ──

/** Unha páxina de edición (subpáxina de «Edicións» con datos de edición) vista como edición, para tarxetas e listados */
export const comoEdicion = (p: PaxinaLibre): Edicion => ({
  ...p.edicion!,
  id: p.id,
  titulo: p.titulo,
  resumo: p.descricion ?? '',
  portada: p.imaxe,
  portadaAlt: p.imaxeAlt,
});

/** Todas as edicións publicadas (as máis novas primeiro) */
export const edicions = async () =>
  (await paxinasLibres()).filter((p) => p.edicion).map(comoEdicion).sort((a, b) => b.ano - a.ano);

export const edicion = async (id: string) => {
  const p = await paxinaLibre(id);
  return p?.edicion ? comoEdicion(p) : null;
};

export const noticias = async () =>
  ((await listar('noticias')) as unknown as Noticia[])
    .filter((n) => !n.borrador)
    .sort((a, b) => b.data.localeCompare(a.data));

export const noticia = async (id: string) => {
  const n = (await obter('noticias', id)) as unknown as Noticia | null;
  return n && !n.borrador ? n : null;
};

export const recursos = async () =>
  ((await listar('recursos')) as unknown as Recurso[]).filter((r) => !r.borrador).sort((a, b) => a.titulo.localeCompare(b.titulo, 'gl'));

export const recurso = async (id: string) => {
  const r = (await obter('recursos', id)) as unknown as Recurso | null;
  return r && !r.borrador ? r : null;
};

/** Tipos de recurso (de Axustes); se aínda non se definiron, os de sempre */
export const TIPOS_RECURSO_BASE = [
  { id: 'xogo', nome: 'Xogo educativo' }, { id: 'podcast', nome: 'Podcast' }, { id: 'estudo', nome: 'Estudo e investigación' },
  { id: 'guia', nome: 'Guía' }, { id: 'audiovisual', nome: 'Audiovisual' }, { id: 'obradoiro', nome: 'Obradoiro' }, { id: 'outro', nome: 'Outro' },
];
export async function tiposRecurso(): Promise<Record<string, string>> {
  const ax = await axustes();
  const lista = ax.tiposRecurso?.length ? ax.tiposRecurso : TIPOS_RECURSO_BASE;
  return Object.fromEntries(lista.map((t) => [t.id, t.nome]));
}

// ── Menús, cabeceira e pé ──
export const menus = async () => (await listar('menus')) as unknown as Menu[];
export const menu = async (id: string) => (await obter('menus', id)) as unknown as Menu | null;
export async function estrutura(): Promise<Estrutura> {
  const e = (await obter('estrutura', 'xeral')) as unknown as Estrutura | null;
  return e ?? (esquemas.estrutura.parse({ cabeceira: { menu: 'principal' }, pe: { menu: 'principal', menuLegal: 'legais' } }) as Estrutura);
}

export async function identidade(): Promise<Identidade> {
  const i = (await obter('identidade', 'xeral')) as unknown as Identidade | null;
  return i ?? (esquemas.identidade.parse({}) as Identidade);
}

/** Todas as entidades nun mapa id → entidade (para resolver grupos de logos) */
export async function mapaEntidades(): Promise<Map<string, Entidade>> {
  const lista = (await listar('entidades')) as unknown as Entidade[];
  // Proporción (ancho/alto) de cada logo, para igualar o seu tamaño visual
  const logos = lista.map((e) => e.logo).filter((l): l is string => Boolean(l));
  if (logos.length) {
    const prop = new Map<string, number>();
    for (let i = 0; i < logos.length; i += 90) {
      const lote = logos.slice(i, i + 90);
      const { results } = await db()
        .prepare(`SELECT id, ancho, alto FROM media WHERE id IN (${lote.map(() => '?').join(',')})`)
        .bind(...lote)
        .all<{ id: string; ancho: number | null; alto: number | null }>();
      for (const r of results) if (r.ancho && r.alto) prop.set(r.id, r.ancho / r.alto);
    }
    for (const e of lista) if (e.logo && prop.has(e.logo)) e.proporcion = prop.get(e.logo);
  }
  return new Map(lista.map((e) => [e.id, e]));
}

/** Resolve unha lista de ids de entidades, mantendo a orde e saltando as que non existan */
export const resolverEntidades = (ids: string[], mapa: Map<string, Entidade>) =>
  ids.map((id) => mapa.get(id)).filter((e): e is Entidade => Boolean(e));

const axustesBase: Axustes = {
  nome: 'Feira da Sostibilidade',
  lema: 'Pensa, consume e actúa',
  descricion: 'A Feira da Sostibilidade do IES Luís Seoane (Pontevedra).',
  edicionActual: '2027',
  contactos: [],
  seo: { indexar: true, idioma: 'gl' },
  tiposRecurso: [],
};

export async function axustes(): Promise<Axustes> {
  const a = await obter('axustes', 'xeral');
  return (a as unknown as Axustes) ?? axustesBase;
}

/** Textos dunha páxina fixa (inicio, a-feira, participa…) */
export async function paxina<T = Record<string, unknown>>(id: string): Promise<T> {
  const p = await obter('paxinas', id);
  return (p ?? {}) as T;
}

// ── Páxinas libres (FeiraLab, subpáxinas, legais…) ──
export const paxinasLibres = async () =>
  ((await listar('paxinas_libres')) as unknown as PaxinaLibre[]).filter((p) => !p.borrador);

export async function paxinaLibre(id: string) {
  const p = (await obter('paxinas_libres', id)) as unknown as PaxinaLibre | null;
  return p && !p.borrador ? p : null;
}

/** Páxina fixa (inicio, participa, actualidade…): o documento do panel ou, se aínda non existe, o contido por defecto */
export async function paxinaSistema(id: keyof typeof paxinasPorDefecto) {
  const p = (await obter('paxinas_libres', id)) as unknown as PaxinaLibre | null;
  return p ?? { ...paxinasPorDefecto[id], id };
}

/** As páxinas de listado (Actualidade, Recursos, Edicións) sempre levan o seu listado: se se borrou, engádese ao final */
export function conListado(p: PaxinaLibre, de: 'noticias' | 'recursos' | 'edicions'): PaxinaLibre {
  if (p.seccions.some((s) => s.tipo === 'listado' && s.de === de)) return p;
  return { ...p, seccions: [...p.seccions, { id: 'listado', tipo: 'listado', oculta: false, fondo: 'claro', de }] };
}

/** Valida unha lista de seccións unha a unha; as non válidas omítense (e avísase no rexistro) */
export function seccionsValidas(lista: unknown): Seccion[] {
  if (!Array.isArray(lista)) return [];
  return lista.flatMap((x) => {
    const r = seccion.safeParse(x);
    if (!r.success) console.warn('Sección non válida', r.error.issues);
    return r.success ? [r.data] : [];
  });
}
