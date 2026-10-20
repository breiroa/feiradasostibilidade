// Copia de seguridade: descarga todos os contidos e inscricións nun JSON
// (as imaxes non se inclúen; quedan na base de datos e en D1 Time Travel).
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { conAdmin } from '../../../lib/panel/api';

export const prerender = false;

export const GET: APIRoute = conAdmin(async () => {
  const [docs, insc, media] = await Promise.all([
    db().prepare('SELECT coleccion, id, datos, orde, actualizado FROM documentos ORDER BY coleccion, orde').all<{ datos: string }>(),
    db().prepare('SELECT * FROM inscricions ORDER BY id').all<{ datos: string }>(),
    db().prepare('SELECT id, tipo, nome, alt, etiqueta, ancho, alto, bytes, variantes, creado FROM media').all(),
  ]);
  const copia = {
    xerada: new Date().toISOString(),
    documentos: docs.results.map((d) => ({ ...d, datos: JSON.parse(d.datos) })),
    inscricions: insc.results.map((i) => ({ ...i, datos: JSON.parse(i.datos) })),
    media: media.results,
  };
  const data = copia.xerada.slice(0, 10);
  return new Response(JSON.stringify(copia, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="copia-feira-${data}.json"`,
      'Cache-Control': 'no-store',
    },
  });
});
