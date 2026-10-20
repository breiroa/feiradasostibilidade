// Inscricións e mensaxes recibidas desde Participa.
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { conAdmin, erro, json, lerJson } from '../../../lib/panel/api';

export const prerender = false;

const ESTADOS = ['nova', 'vista', 'aceptada', 'descartada'];

export const GET: APIRoute = conAdmin(async () => {
  const { results } = await db().prepare('SELECT * FROM inscricions ORDER BY creado DESC').all<{ datos: string }>();
  return json({ ok: true, items: results.map((r) => ({ ...r, datos: JSON.parse(r.datos) })) });
});

export const PATCH: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ id?: number; estado?: string; notas?: string }>(request);
  if (!b.id) return erro('Falta o identificador.');
  if (b.estado && !ESTADOS.includes(b.estado)) return erro('Estado non válido.');
  await db()
    .prepare('UPDATE inscricions SET estado = COALESCE(?, estado), notas = COALESCE(?, notas) WHERE id = ?')
    .bind(b.estado ?? null, b.notas?.slice(0, 4000) ?? null, b.id)
    .run();
  return json({ ok: true });
});

export const DELETE: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ id?: number }>(request);
  if (!b.id) return erro('Falta o identificador.');
  await db().prepare('DELETE FROM inscricions WHERE id = ?').bind(b.id).run();
  return json({ ok: true });
});
