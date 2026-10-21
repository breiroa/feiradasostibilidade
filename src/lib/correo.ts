// Correos da web (convites ao panel, benvida e avisos de mensaxes do formulario), enviados con Brevo.
// Configuración: dous segredos do Worker (Cloudflare › Workers › feiradasostibilidade › Settings, tipo «Secret»,
// ou `wrangler secret put`), que se manteñen entre despregues:
//   - BREVO_API_KEY     → clave da API de Brevo (SMTP & API › API keys)
//   - CORREO_REMITENTE  → enderezo remitente dun dominio verificado en Brevo (p. ex. ola@feiradasostibilidade.com)
// Se falta algo, non se envía nada (e o panel amosa a ligazón para copiala a man).
import { env } from 'cloudflare:workers';

const WEB = 'https://feiradasostibilidade.com';
interface Config { clave?: string; remitente?: string }
const config = (): Config => {
  const e = env as unknown as { BREVO_API_KEY?: string; CORREO_REMITENTE?: string };
  return { clave: e.BREVO_API_KEY, remitente: e.CORREO_REMITENTE };
};
export const correoActivo = () => Boolean(config().clave && config().remitente);

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Plantilla común: cabeceira escura co logo, foto, título, texto, botón e pé. Táboas e estilos en liña (clientes de correo). */
export function plantilla({ titulo, parrafos, boton, nota, foto = true }: { titulo: string; parrafos: string[]; boton?: { texto: string; url: string }; nota?: string; foto?: boolean }) {
  const verde = '#3c783c', negro = '#1a1428', morado = '#64508c', crema = '#f7f4ee';
  return `<!doctype html><html lang="gl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${crema};font-family:Helvetica,Arial,sans-serif;color:#2b2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${crema};padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(26,20,40,.08)">
<tr><td style="background:${negro};padding:22px 28px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle"><img src="${WEB}/logo-feira.png" width="40" height="36" alt="" style="display:block;border:0"></td>
    <td style="vertical-align:middle;padding-left:12px;font-family:Georgia,serif;font-size:19px;font-weight:bold;color:#ffffff">Feira da <span style="color:#8fd18f;font-style:italic">Sostibilidade</span></td>
  </tr></table>
</td></tr>
${foto ? `<tr><td style="line-height:0"><img src="${WEB}/correo/cabeceira.jpg" width="560" height="200" alt="A Feira da Sostibilidade no IES Luís Seoane" style="display:block;width:100%;max-width:560px;height:auto;border:0"></td></tr>` : ''}
<tr><td style="padding:30px 32px 10px">
  <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:${negro}">${esc(titulo)}</h1>
  ${parrafos.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#4a4060">${p}</p>`).join('')}
</td></tr>
${boton ? `<tr><td style="padding:10px 32px 26px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${verde};border-radius:99px"><a href="${esc(boton.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:99px">${esc(boton.texto)}</a></td></tr></table>
<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#8a8199">Se o botón non funciona, copia esta ligazón no navegador:<br><a href="${esc(boton.url)}" style="color:${morado};word-break:break-all">${esc(boton.url)}</a></p></td></tr>` : ''}
${nota ? `<tr><td style="padding:0 32px 26px"><p style="margin:0;padding:14px 16px;background:#f0ecf8;border-radius:12px;font-size:14px;line-height:1.5;color:#4a4060">${nota}</p></td></tr>` : ''}
<tr><td style="padding:18px 32px;background:#f4f2f8;font-size:12px;line-height:1.5;color:#8a8199">Feira da Sostibilidade · IES Luís Seoane · Monte Porreiro, Pontevedra<br><a href="${WEB}" style="color:${morado}">feiradasostibilidade.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

/** Envía un correo. Devolve true se se enviou. */
export async function enviar({ para, nome, asunto, html, responderA }: { para: string; nome?: string; asunto: string; html: string; responderA?: string }) {
  const { clave, remitente } = config();
  if (!clave || !remitente) return false;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': clave, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Feira da Sostibilidade', email: remitente },
      to: [{ email: para, ...(nome ? { name: nome } : {}) }],
      ...(responderA ? { replyTo: { email: responderA } } : {}),
      subject: asunto,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    console.warn('Brevo respondeu', r.status, await r.text().catch(() => ''));
    return false;
  }
  return true;
}

// ── Correos concretos ──

export const enviarConvite = (para: string, nome: string, ligazon: string, superadmin: boolean) =>
  enviar({
    para, nome,
    asunto: 'Convite ao panel da Feira da Sostibilidade',
    html: plantilla({
      titulo: `Ola, ${nome.split(' ')[0]}!`,
      parrafos: [
        `Convidámoste a xestionar a web da <b>Feira da Sostibilidade</b>${superadmin ? ' con permisos de <b>superadministración</b>' : ''}.`,
        'Para activar a túa conta, preme o botón: escollerás o teu contrasinal e configurarás a verificación en dous pasos co teu teléfono (con Google Authenticator, Microsoft Authenticator ou similar).',
      ],
      boton: { texto: 'Activar a miña conta', url: ligazon },
      nota: 'A ligazón vale durante 7 días e só se pode usar unha vez. Se non esperabas este correo, podes ignoralo.',
    }),
  });

export const enviarBenvida = (para: string, nome: string, superadmin: boolean) =>
  enviar({
    para, nome,
    asunto: 'Benvida ao panel da Feira da Sostibilidade',
    html: plantilla({
      titulo: `Grazas por darte de alta, ${nome.split(' ')[0]}!`,
      parrafos: [
        'A túa conta xa está activa e protexida coa verificación en dous pasos.',
        superadmin
          ? 'Tes permisos de <b>superadministración</b>: ademais dos contidos, podes xestionar as persoas, os axustes, a identidade visual e o diagnóstico da web.'
          : 'Podes xestionar páxinas, menús, noticias, recursos, fotos e logos. Os cambios vense na web ao gardar.',
        'Para entrar, usa o teu correo, o contrasinal e o código da aplicación do teléfono.',
      ],
      boton: { texto: 'Ir ao panel', url: `${WEB}/panel/` },
      nota: 'Consello: garda o enderezo do panel nos marcadores do navegador.',
    }),
  });

const NOMES: Record<string, string> = { centro: 'Centro educativo', entidade: 'Entidade', prensa: 'Prensa', contacto: 'Pregunta' };
export function enviarMensaxeFormulario(para: string, tipo: string, datos: Record<string, string>) {
  const filas = Object.entries(datos).map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v).replace(/\n/g, '<br>')}`);
  return enviar({
    para,
    asunto: `Nova mensaxe da web · ${NOMES[tipo] ?? tipo}${datos.nome ? `: ${datos.nome.replace(/[\r\n]+/g, ' ')}` : ''}`,
    responderA: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(datos.email ?? '') ? datos.email : undefined,
    html: plantilla({ titulo: 'Nova mensaxe desde a web', parrafos: [`Tipo: <b>${esc(NOMES[tipo] ?? tipo)}</b>`, ...filas], nota: 'Responder a este correo respóndelle directamente á persoa. Tamén queda gardada no panel (Diagnóstico › Mensaxes).', foto: false }),
  });
}
