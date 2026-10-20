// Historial e papeleira.
// GET ?coleccion=X&id=Y   → versións dun documento (sen os datos)
// GET ?version=N          → datos dunha versión
// GET ?papeleira=1[&coleccion=X] → documentos borrados que se poden recuperar
// (Para restaurar, o panel garda os datos da versión co POST normal de documentos)
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { conAdmin, erro, json } from '../../../lib/panel/api';

export const prerender = false;

export const GET: APIRoute = conAdmin(async ({ url }) => {
  const p = url.searchParams;
  if (p.get('version')) {
    const v = await db().prepare('SELECT id, coleccion, doc_id, datos, autor, accion, creado FROM versions WHERE id = ?').bind(Number(p.get('version'))).first<{ datos: string } & Record<string, unknown>>();
    if (!v) return erro('Non se atopou esa versión.', 404);
    return json({ ok: true, version: { ...v, datos: JSON.parse(v.datos) } });
  }
  if (p.get('papeleira')) {
    const c = p.get('coleccion');
    const { results } = await db()
      .prepare(
        `SELECT v.id, v.coleccion, v.doc_id, v.datos, v.autor, v.creado FROM versions v
         WHERE v.accion = 'borrado' ${c ? 'AND v.coleccion = ?' : ''}
           AND v.id = (SELECT MAX(id) FROM versions x WHERE x.coleccion = v.coleccion AND x.doc_id = v.doc_id)
           AND NOT EXISTS (SELECT 1 FROM documentos d WHERE d.coleccion = v.coleccion AND d.id = v.doc_id)
         ORDER BY v.id DESC LIMIT 200`,
      )
      .bind(...(c ? [c] : []))
      .all<{ id: number; coleccion: string; doc_id: string; datos: string; autor: string | null; creado: string }>();
    return json({
      ok: true,
      items: results.map((r) => {
        const d = JSON.parse(r.datos);
        return { id: r.id, coleccion: r.coleccion, docId: r.doc_id, titulo: d.titulo ?? d.nome ?? r.doc_id, autor: r.autor, creado: r.creado };
      }),
    });
  }
  const c = p.get('coleccion');
  const id = p.get('id');
  if (!c || !id) return erro('Faltan datos.');
  const { results } = await db().prepare('SELECT id, autor, accion, creado FROM versions WHERE coleccion = ? AND doc_id = ? ORDER BY id DESC').bind(c, id).all();
  return json({ ok: true, items: results });
});
