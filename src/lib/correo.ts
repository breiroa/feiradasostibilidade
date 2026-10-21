// Envío das mensaxes do formulario por correo (Cloudflare Email Routing, gratuíto).
// Só funciona se en wrangler.jsonc hai o enlace «send_email» chamado CORREO e a variable CORREO_DESTINO
// (o enderezo onde se reciben, verificado en Cloudflare › Email › Email Routing). Se non, non fai nada.
import { env } from 'cloudflare:workers';

const REMITENTE = 'formulario@feiradasostibilidade.com';
const NOMES: Record<string, string> = { centro: 'Centro educativo', entidade: 'Entidade', prensa: 'Prensa', contacto: 'Pregunta' };

/** Codifica unha cabeceira con acentos (RFC 2047) */
const cab = (t: string) => `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(t)))}?=`;
const limpar = (t: string) => t.replace(/[\r\n]+/g, ' ').trim();

export async function enviarCorreo(tipo: string, datos: Record<string, string>) {
  const { CORREO: correo, CORREO_DESTINO: destino } = env as unknown as { CORREO?: { send: (m: unknown) => Promise<void> }; CORREO_DESTINO?: string };
  if (!correo || !destino) return false;
  const { EmailMessage } = await import('cloudflare:email');
  const corpo = Object.entries(datos).map(([k, v]) => `${k}: ${v}`).join('\n');
  const asunto = `Feira da Sostibilidade · ${NOMES[tipo] ?? tipo}: ${limpar(datos.nome ?? '')}`;
  const responder = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(datos.email ?? '') ? `Reply-To: ${datos.email}\r\n` : '';
  const mime =
    `From: ${cab('Web da Feira da Sostibilidade')} <${REMITENTE}>\r\n` +
    `To: <${destino}>\r\n` +
    responder +
    `Subject: ${cab(limpar(asunto))}\r\n` +
    `Message-ID: <${crypto.randomUUID()}@feiradasostibilidade.com>\r\n` +
    `Date: ${new Date().toUTCString()}\r\n` +
    'MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n' +
    `Nova mensaxe desde o formulario da web:\r\n\r\n${corpo.replace(/\n/g, '\r\n')}\r\n\r\n(Responder a este correo responde á persoa que o enviou. Copia gardada no panel › Diagnóstico › Mensaxes.)\r\n`;
  await correo.send(new EmailMessage(REMITENTE, destino, mime));
  return true;
}
