// Biblioteca de imaxes e ficheiros (gardados en D1, troceados).
// GET → lista con uso · POST (multipart) → subir · PATCH {id, alt, nome, etiqueta} · DELETE {id} (só se non se usa)
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { conAdmin, erro, json, lerJson, slug } from '../../../lib/panel/api';
import { token } from '../../../lib/panel/seguridade';

export const prerender = false;

const BLOQUE = 900_000; // bytes por fila (límite de D1: 2 MB por fila)
const MAX_IMAXE = 6 * 1024 * 1024;
const MAX_FICHEIRO = 20 * 1024 * 1024;
const ETIQUETAS = ['xeral', 'logos', 'edicions', 'noticias', 'recursos', 'documentos'];

const eWebp = (b: Uint8Array) => b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
const ePdf = (b: Uint8Array) => String.fromCharCode(...b.slice(0, 5)) === '%PDF-';

/** Ids de media que aparecen nalgún documento */
async function idsUsados() {
  const { results } = await db().prepare('SELECT datos FROM documentos').all<{ datos: string }>();
  const usados = new Set<string>();
  for (const r of results) for (const m of r.datos.matchAll(/"([a-z0-9-]{3,80})"|\/media\/([a-z0-9-]{3,80})\//g)) usados.add(m[1] ?? m[2]);
  return usados;
}

export const GET: APIRoute = conAdmin(async () => {
  const [{ results }, usados] = await Promise.all([
    db().prepare('SELECT id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes, creado FROM media ORDER BY creado DESC').all(),
    idsUsados(),
  ]);
  return json({ ok: true, items: results.map((m) => ({ ...m, usado: usados.has(String(m.id)) })) });
});

export const POST: APIRoute = conAdmin(async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro('Non se puido ler o ficheiro.');
  }
  const g = form.get('g'), m = form.get('m'), f = form.get('f');
  const nome = String(form.get('nome') ?? 'ficheiro').slice(0, 160);
  const alt = String(form.get('alt') ?? '').slice(0, 300);
  const etiqueta = ETIQUETAS.includes(String(form.get('etiqueta'))) ? String(form.get('etiqueta')) : 'xeral';
  const variantes: Record<string, Uint8Array> = {};
  let tipo = 'image/webp';

  if (g instanceof File) {
    const bg = new Uint8Array(await g.arrayBuffer());
    if (!eWebp(bg) || bg.length > MAX_IMAXE) return erro('A imaxe non é válida (debe optimizarse no navegador antes de subila).');
    variantes.g = bg;
    if (m instanceof File) {
      const bm = new Uint8Array(await m.arrayBuffer());
      if (eWebp(bm) && bm.length <= MAX_IMAXE) variantes.m = bm;
    }
  } else if (f instanceof File) {
    const bf = new Uint8Array(await f.arrayBuffer());
    if (bf.length > MAX_FICHEIRO) return erro('O ficheiro supera os 20 MB.');
    if (!ePdf(bf)) return erro('De momento só se poden subir PDF.');
    variantes.f = bf;
    tipo = 'application/pdf';
  } else return erro('Non chegou ningún ficheiro.');

  const id = `${slug(nome.replace(/\.[a-z0-9]+$/i, '')).slice(0, 50)}-${token(4).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'x'}`;
  const ancho = Number(form.get('ancho')) || null, alto = Number(form.get('alto')) || null;
  const total = Object.values(variantes).reduce((s, b) => s + b.length, 0);

  const sentenzas = [
    db().prepare('INSERT INTO media (id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, tipo, nome, alt, etiqueta, ancho, alto, total, Object.keys(variantes).join(',')),
  ];
  for (const [v, buf] of Object.entries(variantes)) {
    for (let n = 0, i = 0; i < buf.length; n++, i += BLOQUE) {
      sentenzas.push(db().prepare('INSERT INTO media_bloques (media_id, variante, n, datos) VALUES (?, ?, ?, ?)').bind(id, v, n, buf.slice(i, i + BLOQUE)));
    }
  }
  await db().batch(sentenzas);
  return json({ ok: true, item: { id, tipo, nome, alt, etiqueta, ancho, alto, bytes: total, variantes: Object.keys(variantes).join(','), usado: false } });
});

export const PATCH: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ id?: string; alt?: string; nome?: string; etiqueta?: string }>(request);
  if (!b.id) return erro('Falta o identificador.');
  const etiqueta = ETIQUETAS.includes(b.etiqueta ?? '') ? b.etiqueta : null;
  await db()
    .prepare('UPDATE media SET alt = COALESCE(?, alt), nome = COALESCE(?, nome), etiqueta = COALESCE(?, etiqueta) WHERE id = ?')
    .bind(b.alt?.slice(0, 300) ?? null, b.nome?.slice(0, 160) ?? null, etiqueta, b.id)
    .run();
  return json({ ok: true });
});

export const DELETE: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ id?: string }>(request);
  if (!b.id) return erro('Falta o identificador.');
  if ((await idsUsados()).has(b.id)) return erro('Este ficheiro úsase nalgunha páxina. Quítao de alí antes de borralo.', 409);
  await db().batch([db().prepare('DELETE FROM media_bloques WHERE media_id = ?').bind(b.id), db().prepare('DELETE FROM media WHERE id = ?').bind(b.id)]);
  return json({ ok: true });
});
