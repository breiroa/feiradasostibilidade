// Recibe os formularios de Participa e gárdaos en D1 (táboa inscricions).
// Funciona sen JavaScript: responde cunha redirección de volta á páxina.
import type { APIRoute } from 'astro';
import { db } from '../../lib/datos';
import { formulario, validarFormulario } from '../../lib/formularios';

export const prerender = false;

const LIMITE = 5; // envíos por IP
const VENTA = 10 * 60; // en 10 minutos

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const volver = (q: string) => redirect(`/participa/?${q}#formulario`, 303);
  let entrada: Record<string, string>;
  try {
    entrada = Object.fromEntries([...(await request.formData()).entries()].map(([k, v]) => [k, String(v)]));
  } catch {
    return volver('erro=datos');
  }

  // Campo trampa: as persoas non o ven; os robots enchérono
  if (entrada.web_alternativa) return volver('enviado=1');

  const f = formulario(entrada.tipo ?? '');
  if (!f) return volver('erro=datos');
  if (entrada.privacidade !== 'si') return volver(`erro=privacidade&tipo=${f.id}`);

  const { datos, erros } = validarFormulario(f, entrada);
  if (erros.length) return volver(`erro=${encodeURIComponent(erros.join(' '))}&tipo=${f.id}`);

  // Límite de envíos por IP
  const ip = request.headers.get('CF-Connecting-IP') ?? clientAddress ?? 'descoñecida';
  const clave = `form:${ip}`;
  const agora = Math.floor(Date.now() / 1000);
  const { n } = (await db().prepare('SELECT COUNT(*) AS n FROM intentos WHERE clave = ? AND ts > ?').bind(clave, agora - VENTA).first<{ n: number }>()) ?? { n: 0 };
  if (n >= LIMITE) return volver(`erro=${encodeURIComponent('Demasiados envíos seguidos. Proba de novo nuns minutos.')}&tipo=${f.id}`);

  await db().batch([
    db().prepare('INSERT INTO intentos (clave, ts) VALUES (?, ?)').bind(clave, agora),
    db().prepare('DELETE FROM intentos WHERE ts < ?').bind(agora - 86400),
    db().prepare('INSERT INTO inscricions (tipo, datos) VALUES (?, ?)').bind(f.id, JSON.stringify(datos)),
  ]);
  return volver(`enviado=${f.id}`);
};
