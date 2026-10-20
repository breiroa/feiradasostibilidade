// Serve imaxes e ficheiros gardados en D1 (troceados en media_bloques).
// /media/<id>/g → imaxe grande · /media/<id>/m → miniatura · /media/<id>/f → ficheiro (PDF…)
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id = '', variante = 'g' } = params;
  if (!/^[a-z0-9-]{3,80}$/.test(id) || !/^[gmf]$/.test(variante)) return new Response('Non atopado', { status: 404 });

  const meta = await db().prepare('SELECT tipo, nome, variantes FROM media WHERE id = ?').bind(id).first<{ tipo: string; nome: string; variantes: string }>();
  if (!meta) return new Response('Non atopado', { status: 404 });

  // Se non existe a miniatura, servir a grande
  const disp = meta.variantes.split(',');
  const v = disp.includes(variante) ? variante : disp[0];

  const { results } = await db()
    .prepare('SELECT datos FROM media_bloques WHERE media_id = ? AND variante = ? ORDER BY n')
    .bind(id, v)
    .all<{ datos: ArrayBuffer | number[] }>();
  if (!results.length) return new Response('Non atopado', { status: 404 });

  const partes = results.map((r) => (r.datos instanceof ArrayBuffer ? new Uint8Array(r.datos) : Uint8Array.from(r.datos)));
  const total = partes.reduce((s, p) => s + p.length, 0);
  const corpo = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    corpo.set(p, pos);
    pos += p.length;
  }

  const cabeceiras: Record<string, string> = {
    'Content-Type': meta.tipo,
    'Content-Length': String(total),
    // Os ids son únicos: se cambia a imaxe, cambia o id → caché longa segura
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };
  if (v === 'f') cabeceiras['Content-Disposition'] = `inline; filename="${meta.nome.replace(/[^\w.\- ]/g, '_')}"`;
  return new Response(corpo, { headers: cabeceiras });
};
