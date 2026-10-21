// Contidos (edicións, noticias, entidades, recursos, proxectos, páxinas, axustes).
// GET    ?coleccion=X            → lista (inclúe borradores)
// POST   {coleccion, id?, datos} → crea ou garda (valida e limpa o HTML)
// PATCH  {coleccion, ids[]}      → nova orde
// DELETE {coleccion, id}         → borra (se non se usa noutro sitio)
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { esquemaInicio, esquemas, PAXINAS_SISTEMA, SEN_FILLAS, type Coleccion } from '../../../lib/esquemas';
import { conAdmin, erro, json, lerJson, slug } from '../../../lib/panel/api';
import { limparHtml } from '../../../lib/panel/saneado';
import { versionSQL } from '../../../lib/panel/versions';

export const prerender = false;

const COLECCIONS = Object.keys(esquemas) as Coleccion[];
const valida = (c: unknown): c is Coleccion => typeof c === 'string' && (COLECCIONS as string[]).includes(c);
const ID = /^[a-z0-9-]{1,80}$/;
// Coleccións que só poden cambiar as persoas superadministradoras
const SO_SUPER: string[] = ['axustes', 'identidade'];
// Enderezos que xa usan outras páxinas da web
const RESERVADOS = ['inicio', 'feiralab', 'edicions', 'actualidade', 'recursos', 'participa', 'panel', 'api', 'media', 'vieja', 'a-feira', 'documentos', '404'];

export const GET: APIRoute = conAdmin(async ({ url }) => {
  const c = url.searchParams.get('coleccion');
  // «edicions» xa non é unha colección: son as páxinas con datos de edición (para os selectores do panel)
  if (c === 'edicions') {
    const { results } = await db().prepare("SELECT id, datos, orde, actualizado, editado_por FROM documentos WHERE coleccion = 'paxinas_libres' ORDER BY orde, id").all<{ id: string; datos: string; orde: number; actualizado: string; editado_por: string | null }>();
    const items = results
      .map((r) => ({ ...r, d: JSON.parse(r.datos) }))
      .filter((r) => r.d.edicion)
      .map((r) => ({ id: r.id, orde: r.orde, actualizado: r.actualizado, editadoPor: r.editado_por, datos: { ...r.d.edicion, titulo: r.d.titulo, resumo: r.d.descricion, portada: r.d.imaxe, borrador: r.d.borrador } }));
    return json({ ok: true, items });
  }
  if (!valida(c)) return erro('Colección descoñecida.');
  const { results } = await db().prepare('SELECT id, datos, orde, actualizado, editado_por FROM documentos WHERE coleccion = ? ORDER BY orde, id').bind(c).all<{ id: string; datos: string; orde: number; actualizado: string; editado_por: string | null }>();
  return json({ ok: true, items: results.map((r) => ({ id: r.id, orde: r.orde, actualizado: r.actualizado, editadoPor: r.editado_por, datos: JSON.parse(r.datos) })) });
});

export const POST: APIRoute = conAdmin(async ({ request }, { admin }) => {
  const b = await lerJson<{ coleccion?: string; id?: string; datos?: unknown; novo?: boolean; actualizado?: string; forzar?: boolean; accion?: string }>(request);
  if (!valida(b.coleccion)) return erro('Colección descoñecida.');
  const c = b.coleccion;
  if (SO_SUPER.includes(c) && admin.rol !== 'superadmin') return erro('Só as persoas superadministradoras poden cambiar isto.', 403);

  const limpos = await limparHtml(b.datos ?? {});
  const esquema = c === 'paxinas' && b.id === 'inicio' ? esquemaInicio : esquemas[c];
  const res = esquema.safeParse(limpos);
  if (!res.success) {
    return erro(res.error.issues.map((i) => `${i.path.join(' › ') || 'Datos'}: ${i.message}`), 422);
  }
  const datos = res.data as Record<string, unknown>;

  // Subpáxinas: un só nivel, e só baixo páxinas que o permitan
  if (c === 'paxinas_libres' && datos.nai) {
    const nai = String(datos.nai);
    const mai = await db().prepare("SELECT datos FROM documentos WHERE coleccion = 'paxinas_libres' AND id = ?").bind(nai).first<{ datos: string }>();
    if (nai === b.id || SEN_FILLAS.includes(nai) || !mai || JSON.parse(mai.datos).nai) return erro('Esa páxina non pode ter subpáxinas. Escolle outra páxina nai.', 422);
    if (b.id && !b.novo) {
      const { results } = await db().prepare("SELECT datos FROM documentos WHERE coleccion = 'paxinas_libres'").all<{ datos: string }>();
      if (results.some((r) => JSON.parse(r.datos).nai === b.id)) return erro('Esta páxina ten subpáxinas, así que non pode ser subpáxina doutra.', 422);
    }
  }

  // Identificador: as edicións usan o ano; o resto, o texto do título
  let id = (b.id ?? '').trim();
  if (b.novo || !id) {
    if (c === 'axustes' || c === 'estrutura' || c === 'identidade') id = 'xeral';
    else if (c === 'paxinas_libres' && !id && datos.edicion) id = String((datos.edicion as { ano: number }).ano);
    else if (!id) id = slug(String(datos.titulo ?? datos.nome ?? datos.nomeCurto ?? 'elemento'));
    if (!ID.test(id)) return erro('O enderezo (identificador) só pode ter letras minúsculas, números e guións.', 422);
    if (c === 'paxinas_libres' && RESERVADOS.includes(id)) return erro(`O enderezo «${id}» está reservado para outra parte da web. Escolle outro.`, 422);
    const existe = await db().prepare('SELECT 1 FROM documentos WHERE coleccion = ? AND id = ?').bind(c, id).first();
    if (existe) {
      if (c === 'paxinas_libres' && datos.edicion && id === String((datos.edicion as { ano: number }).ano)) return erro(`Xa existe unha páxina co enderezo ${id}.`, 409);
      let n = 2;
      while (await db().prepare('SELECT 1 FROM documentos WHERE coleccion = ? AND id = ?').bind(c, `${id}-${n}`).first()) n++;
      id = `${id}-${n}`;
    }
    const max = await db().prepare('SELECT COALESCE(MAX(orde), 0) AS m FROM documentos WHERE coleccion = ?').bind(c).first<{ m: number }>();
    const orde = c === 'edicions' ? 3000 - Number(datos.ano) : (max?.m ?? 0) + 1;
    await db().batch([
      db().prepare('INSERT INTO documentos (coleccion, id, datos, orde, editado_por) VALUES (?, ?, ?, ?, ?)').bind(c, id, JSON.stringify(datos), orde, admin.nome),
      ...versionSQL(c, id, JSON.stringify(datos), admin.nome, b.accion === 'restaurado' ? 'restaurado' : 'creado'),
    ]);
  } else {
    if (!ID.test(id)) return erro('Identificador non válido.');
    const actual = await db()
      .prepare('SELECT datos, actualizado, editado_por FROM documentos WHERE coleccion = ? AND id = ?')
      .bind(c, id)
      .first<{ datos: string; actualizado: string; editado_por: string | null }>();
    // Se outra persoa gardou mentres se editaba, avísase en vez de pisar os seus cambios
    if (actual && b.actualizado && actual.actualizado !== b.actualizado && !b.forzar) {
      return json({ ok: false, conflito: true, editadoPor: actual.editado_por, actualizado: actual.actualizado, erros: [`${actual.editado_por ?? 'Outra persoa'} gardou esta páxina mentres a editabas.`] }, 409);
    }
    if (!actual && !['paxinas', 'axustes', 'estrutura', 'identidade'].includes(c)) return erro('Non se atopou o elemento (quizais outra persoa o borrou).', 404);
    const novo = JSON.stringify(datos);
    // O primeiro cambio dun documento garda tamén como estaba antes, para poder volver a el
    const sen = actual && !(await db().prepare('SELECT 1 FROM versions WHERE coleccion = ? AND doc_id = ? LIMIT 1').bind(c, id).first());
    await db().batch([
      ...(sen ? [db().prepare('INSERT INTO versions (coleccion, doc_id, datos, autor, accion, creado) VALUES (?, ?, ?, ?, ?, ?)').bind(c, id, actual.datos, actual.editado_por, 'orixinal', actual.actualizado)] : []),
      actual
        ? db().prepare("UPDATE documentos SET datos = ?, actualizado = datetime('now'), editado_por = ? WHERE coleccion = ? AND id = ?").bind(novo, admin.nome, c, id)
        : db().prepare('INSERT INTO documentos (coleccion, id, datos, editado_por) VALUES (?, ?, ?, ?)').bind(c, id, novo, admin.nome),
      ...versionSQL(c, id, novo, admin.nome, b.accion === 'restaurado' ? 'restaurado' : 'gardado'),
    ]);
  }
  const fila = await db().prepare('SELECT actualizado FROM documentos WHERE coleccion = ? AND id = ?').bind(c, id).first<{ actualizado: string }>();
  return json({ ok: true, id, datos, actualizado: fila?.actualizado, editadoPor: admin.nome });
});

export const PATCH: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ coleccion?: string; ids?: string[] }>(request);
  if (!valida(b.coleccion) || !Array.isArray(b.ids)) return erro('Datos non válidos.');
  const ids = b.ids.filter((i) => typeof i === 'string' && ID.test(i)).slice(0, 500);
  await db().batch(ids.map((id, n) => db().prepare('UPDATE documentos SET orde = ? WHERE coleccion = ? AND id = ?').bind(n + 1, b.coleccion, id)));
  return json({ ok: true });
});

/** Percorre un documento (incluídas as súas seccións) e di se referencia o id */
function referencia(v: unknown, c: Coleccion | 'edicions', id: string, clave = ''): boolean {
  if (Array.isArray(v)) {
    if ((c === 'entidades' && (clave === 'entidades' || clave === 'ecosistemaEntidades')) || (c === 'recursos' && clave === 'recursos')) {
      if (v.includes(id)) return true;
    }
    return v.some((x) => referencia(x, c, id));
  }
  if (v && typeof v === 'object') return Object.entries(v).some(([k, x]) => referencia(x, c, id, k));
  if (typeof v === 'string' && v === id) {
    if (c === 'edicions' && (clave === 'edicion' || clave === 'edicionActual')) return true;
  }
  return false;
}

/** Busca ligazóns (campos «url») e seccións de subpáxinas que apunten a unha páxina */
function apuntaA(v: unknown, rutas: string[], nai: string, clave = ''): boolean {
  if (Array.isArray(v)) return v.some((x) => apuntaA(x, rutas, nai));
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o.tipo === 'subpaxinas' && o.nai === nai) return true;
    if (o.tipo === 'paxina' && o.paxina === nai) return true; // elemento do menú
    return Object.entries(o).some(([k, x]) => apuntaA(x, rutas, nai, k));
  }
  return typeof v === 'string' && clave === 'url' && rutas.some((r) => v.split(/[?#]/)[0] === r);
}

/** Onde se usa un documento (para non deixar referencias rotas) */
async function usos(c: Coleccion, id: string): Promise<string[]> {
  if (!['entidades', 'recursos', 'paxinas_libres', 'menus'].includes(c)) return [];
  const { results } = await db().prepare('SELECT coleccion, id, datos FROM documentos').all<{ coleccion: string; id: string; datos: string }>();
  let rutas: string[] = [];
  if (c === 'paxinas_libres') {
    const propia = results.find((r) => r.coleccion === c && r.id === id);
    const nai = propia ? JSON.parse(propia.datos).nai : '';
    const ruta = nai ? `/${nai}/${id}/` : `/${id}/`;
    rutas = [ruta, ruta.slice(0, -1)];
  }
  const eEdicion = c === 'paxinas_libres' && Boolean(JSON.parse(results.find((r) => r.coleccion === c && r.id === id)?.datos ?? '{}').edicion);
  const usa = (d: Record<string, unknown>) =>
    c === 'menus' ? (d as { cabeceira?: { menu?: string }; pe?: { menu?: string; menuLegal?: string } }).cabeceira?.menu === id || (d as { pe?: { menu?: string; menuLegal?: string } }).pe?.menu === id || (d as { pe?: { menuLegal?: string } }).pe?.menuLegal === id
      : c === 'paxinas_libres' ? d.nai === id || apuntaA(d, rutas, id) || (eEdicion && referencia(d, 'edicions', id))
      : referencia(d, c, id);
  return results
    .filter((r) => !(r.coleccion === c && r.id === id) && usa(JSON.parse(r.datos)))
    .map((r) => {
      const d = JSON.parse(r.datos);
      return `${r.coleccion}: ${d.titulo ?? d.nome ?? d.nomeCurto ?? r.id}`;
    });
}

export const DELETE: APIRoute = conAdmin(async ({ request }, { admin }) => {
  const b = await lerJson<{ coleccion?: string; id?: string }>(request);
  if (!valida(b.coleccion) || !b.id || !ID.test(b.id)) return erro('Datos non válidos.');
  if (b.coleccion === 'axustes' || b.coleccion === 'estrutura' || b.coleccion === 'identidade') return erro('Os axustes non se poden borrar.');
  if (b.coleccion === 'paxinas_libres' && (PAXINAS_SISTEMA as readonly string[]).includes(b.id)) return erro('Esta páxina é fixa da web e non se pode borrar (podes ocultar ou cambiar as súas seccións).');
  const onde = await usos(b.coleccion, b.id);
  if (onde.length) return erro([`Non se pode borrar porque se usa en:`, ...onde.slice(0, 8)], 409);
  // Vai á papeleira: o historial garda o documento borrado e pódese recuperar
  const fila = await db().prepare('SELECT datos FROM documentos WHERE coleccion = ? AND id = ?').bind(b.coleccion, b.id).first<{ datos: string }>();
  if (!fila) return json({ ok: true });
  await db().batch([
    ...versionSQL(b.coleccion, b.id, fila.datos, admin.nome, 'borrado'),
    db().prepare('DELETE FROM documentos WHERE coleccion = ? AND id = ?').bind(b.coleccion, b.id),
  ]);
  return json({ ok: true });
});
