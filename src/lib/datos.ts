// Acceso á base de datos (Cloudflare D1). Toda a web pública le os contidos desde aquí.
// Se algún día se cambia de base de datos, só hai que tocar este ficheiro.
import { env } from 'cloudflare:workers';
import { esquemas, type Axustes, type Coleccion, type Edicion, type Entidade, type Noticia, type Proxecto, type Recurso } from './esquemas';

export const db = (): D1Database => (env as unknown as { DB: D1Database }).DB;

interface Fila {
  id: string;
  datos: string;
  orde: number;
}

/** Le e valida un documento. Se non é válido devolve null (e avisa no rexistro) para non romper a páxina. */
function parse<C extends Coleccion>(coleccion: C, fila: Fila) {
  const res = esquemas[coleccion].safeParse(JSON.parse(fila.datos));
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

export const edicions = async () =>
  ((await listar('edicions')) as unknown as Edicion[]).sort((a, b) => b.ano - a.ano);

export const edicion = async (id: string) => (await obter('edicions', id)) as unknown as Edicion | null;

export const noticias = async () =>
  ((await listar('noticias')) as unknown as Noticia[])
    .filter((n) => !n.borrador)
    .sort((a, b) => b.data.localeCompare(a.data));

export const noticia = async (id: string) => {
  const n = (await obter('noticias', id)) as unknown as Noticia | null;
  return n && !n.borrador ? n : null;
};

export const recursos = async () =>
  ((await listar('recursos')) as unknown as Recurso[]).sort((a, b) => a.titulo.localeCompare(b.titulo, 'gl'));

export const recurso = async (id: string) => (await obter('recursos', id)) as unknown as Recurso | null;

export const proxecto = async (id: string) => (await obter('proxectos', id)) as unknown as Proxecto | null;

export const proxectos = async () => (await listar('proxectos')) as unknown as Proxecto[];

/** Todas as entidades nun mapa id → entidade (para resolver grupos de logos) */
export async function mapaEntidades(): Promise<Map<string, Entidade>> {
  const lista = (await listar('entidades')) as unknown as Entidade[];
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
  pe: { texto: '', grupos: [] },
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
