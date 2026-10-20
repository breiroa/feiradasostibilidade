// Contidos (edicións, noticias, entidades, recursos, proxectos, páxinas, axustes).
// GET    ?coleccion=X            → lista (inclúe borradores)
// POST   {coleccion, id?, datos} → crea ou garda (valida e limpa o HTML)
// PATCH  {coleccion, ids[]}      → nova orde
// DELETE {coleccion, id}         → borra (se non se usa noutro sitio)
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { esquemaInicio, esquemas, type Coleccion } from '../../../lib/esquemas';
import { conAdmin, erro, json, lerJson, slug } from '../../../lib/panel/api';
import { sanearHtml } from '../../../lib/panel/saneado';

export const prerender = false;

const COLECCIONS = Object.keys(esquemas) as Coleccion[];
const valida = (c: unknown): c is Coleccion => typeof c === 'string' && (COLECCIONS as string[]).includes(c);
const ID = /^[a-z0-9-]{1,80}$/;
// Enderezos que xa usan outras páxinas da web
const RESERVADOS = ['inicio', 'feiralab', 'edicions', 'actualidade', 'recursos', 'participa', 'panel', 'api', 'media', 'vieja', 'a-feira', 'documentos', '404'];

/** Limpa recursivamente os campos de texto enriquecido (os que se chaman corpo ou rematan en Corpo) */
async function limparHtml(v: unknown, clave = ''): Promise<unknown> {
  if (typeof v === 'string') return clave === 'corpo' || clave.endsWith('Corpo') ? sanearHtml(v) : v;
  if (Array.isArray(v)) return Promise.all(v.map((x) => limparHtml(x)));
  if (v && typeof v === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) saida[k] = await limparHtml(x, k);
    return saida;
  }
  return v;
}

export const GET: APIRoute = conAdmin(async ({ url }) => {
  const c = url.searchParams.get('coleccion');
  if (!valida(c)) return erro('Colección descoñecida.');
  const { results } = await db().prepare('SELECT id, datos, orde, actualizado FROM documentos WHERE coleccion = ? ORDER BY orde, id').bind(c).all<{ id: string; datos: string; orde: number; actualizado: string }>();
  return json({ ok: true, items: results.map((r) => ({ id: r.id, orde: r.orde, actualizado: r.actualizado, datos: JSON.parse(r.datos) })) });
});

export const POST: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ coleccion?: string; id?: string; datos?: unknown; novo?: boolean }>(request);
  if (!valida(b.coleccion)) return erro('Colección descoñecida.');
  const c = b.coleccion;

  const limpos = await limparHtml(b.datos ?? {});
  const esquema = c === 'paxinas' && b.id === 'inicio' ? esquemaInicio : esquemas[c];
  const res = esquema.safeParse(limpos);
  if (!res.success) {
    return erro(res.error.issues.map((i) => `${i.path.join(' › ') || 'Datos'}: ${i.message}`), 422);
  }
  const datos = res.data as Record<string, unknown>;

  // Identificador: as edicións usan o ano; o resto, o texto do título
  let id = (b.id ?? '').trim();
  if (b.novo || !id) {
    if (c === 'axustes') id = 'xeral';
    else if (c === 'edicions') id = String(datos.ano);
    else if (!id) id = slug(String(datos.titulo ?? datos.nome ?? datos.nomeCurto ?? 'elemento'));
    if (!ID.test(id)) return erro('O enderezo (identificador) só pode ter letras minúsculas, números e guións.', 422);
    if (c === 'paxinas_libres' && RESERVADOS.includes(id)) return erro(`O enderezo «${id}» está reservado para outra parte da web. Escolle outro.`, 422);
    const existe = await db().prepare('SELECT 1 FROM documentos WHERE coleccion = ? AND id = ?').bind(c, id).first();
    if (existe) {
      if (c === 'edicions') return erro(`Xa existe unha edición do ano ${id}.`, 409);
      let n = 2;
      while (await db().prepare('SELECT 1 FROM documentos WHERE coleccion = ? AND id = ?').bind(c, `${id}-${n}`).first()) n++;
      id = `${id}-${n}`;
    }
    const max = await db().prepare('SELECT COALESCE(MAX(orde), 0) AS m FROM documentos WHERE coleccion = ?').bind(c).first<{ m: number }>();
    const orde = c === 'edicions' ? 3000 - Number(datos.ano) : (max?.m ?? 0) + 1;
    await db().prepare('INSERT INTO documentos (coleccion, id, datos, orde) VALUES (?, ?, ?, ?)').bind(c, id, JSON.stringify(datos), orde).run();
  } else {
    if (!ID.test(id)) return erro('Identificador non válido.');
    const r = await db()
      .prepare("UPDATE documentos SET datos = ?, actualizado = datetime('now') WHERE coleccion = ? AND id = ?")
      .bind(JSON.stringify(datos), c, id)
      .run();
    if (!r.meta.changes) {
      // Páxinas e axustes poden non existir aínda: créanse
      if (c === 'paxinas' || c === 'axustes') await db().prepare('INSERT INTO documentos (coleccion, id, datos) VALUES (?, ?, ?)').bind(c, id, JSON.stringify(datos)).run();
      else return erro('Non se atopou o elemento (quizais outra persoa o borrou).', 404);
    }
  }
  return json({ ok: true, id, datos });
});

export const PATCH: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ coleccion?: string; ids?: string[] }>(request);
  if (!valida(b.coleccion) || !Array.isArray(b.ids)) return erro('Datos non válidos.');
  const ids = b.ids.filter((i) => typeof i === 'string' && ID.test(i)).slice(0, 500);
  await db().batch(ids.map((id, n) => db().prepare('UPDATE documentos SET orde = ? WHERE coleccion = ? AND id = ?').bind(n + 1, b.coleccion, id)));
  return json({ ok: true });
});

/** Percorre un documento (incluídas as súas seccións) e di se referencia o id */
function referencia(v: unknown, c: Coleccion, id: string, clave = ''): boolean {
  if (Array.isArray(v)) {
    if ((c === 'entidades' && (clave === 'entidades' || clave === 'ecosistemaEntidades')) || (c === 'recursos' && clave === 'recursos')) {
      if (v.includes(id)) return true;
    }
    return v.some((x) => referencia(x, c, id));
  }
  if (v && typeof v === 'object') return Object.entries(v).some(([k, x]) => referencia(x, c, id, k));
  if (typeof v === 'string' && v === id) {
    if (c === 'edicions' && (clave === 'edicion' || clave === 'edicionActual')) return true;
    if (c === 'proxectos' && clave === 'proxecto') return true;
  }
  return false;
}

/** Onde se usa un documento (para non deixar referencias rotas) */
async function usos(c: Coleccion, id: string): Promise<string[]> {
  if (!['entidades', 'edicions', 'proxectos', 'recursos'].includes(c)) return [];
  const { results } = await db().prepare('SELECT coleccion, id, datos FROM documentos').all<{ coleccion: string; id: string; datos: string }>();
  return results
    .filter((r) => !(r.coleccion === c && r.id === id) && referencia(JSON.parse(r.datos), c, id))
    .map((r) => {
      const d = JSON.parse(r.datos);
      return `${r.coleccion}: ${d.titulo ?? d.nome ?? d.nomeCurto ?? r.id}`;
    });
}

export const DELETE: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ coleccion?: string; id?: string }>(request);
  if (!valida(b.coleccion) || !b.id || !ID.test(b.id)) return erro('Datos non válidos.');
  if (b.coleccion === 'axustes') return erro('Os axustes non se poden borrar.');
  if (b.coleccion === 'paxinas_libres' && b.id === 'feiralab') return erro('A páxina principal de FeiraLab non se pode borrar (podes ocultar as súas seccións).');
  const onde = await usos(b.coleccion, b.id);
  if (onde.length) return erro([`Non se pode borrar porque se usa en:`, ...onde.slice(0, 8)], 409);
  await db().prepare('DELETE FROM documentos WHERE coleccion = ? AND id = ?').bind(b.coleccion, b.id).run();
  return json({ ok: true });
});
