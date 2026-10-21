// 1. Unifica o enderezo: www. e *.workers.dev redirixen (301) ao dominio principal.
// 2. Cabeceiras de seguridade en todas as respostas da web (as do panel están en public/_headers):
//    HSTS, nosniff, Referrer-Policy, Permissions-Policy e, nas páxinas HTML, unha CSP estrita.
//    Os scripts que Astro mete na páxina permítense polo seu hash (non se permite calquera script).
import { defineMiddleware } from 'astro:middleware';

const DOMINIO = 'feiradasostibilidade.com';

// Servizos que se poden incrustar (vídeos e a sección «HTML libre»)
export const FRAMES = [
  'https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://player.vimeo.com', 'https://www.google.com', 'https://maps.google.com',
  'https://docs.google.com', 'https://calendar.google.com', 'https://forms.office.com', 'https://open.spotify.com', 'https://w.soundcloud.com',
  'https://www.openstreetmap.org', 'https://umap.openstreetmap.fr', 'https://genial.ly', 'https://view.genial.ly', 'https://padlet.com', 'https://www.canva.com',
];

const enc = new TextEncoder();
async function hashScript(contido: string) {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(contido));
  return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(h)))}'`;
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const host = ctx.url.hostname;
  if (host === `www.${DOMINIO}` || host.endsWith('.workers.dev')) {
    return Response.redirect(`https://${DOMINIO}${ctx.url.pathname}${ctx.url.search}`, 301);
  }
  const res = await next();
  // As redireccións e respostas inmutables non se poden modificar: cópiase a resposta
  const r = new Response(res.body, res);
  const h = r.headers;
  if (ctx.url.protocol === 'https:') h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  h.set('X-Content-Type-Options', 'nosniff');
  if (!h.has('Referrer-Policy')) h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');

  if (import.meta.env.PROD && (h.get('Content-Type') ?? '').includes('text/html')) {
    const html = await r.text();
    const hashes = new Set<string>();
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) hashes.add(await hashScript(m[1]));
    h.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src 'self' ${[...hashes].join(' ')}`.trim(),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        `frame-src 'self' ${FRAMES.join(' ')}`,
        // Só se pode mostrar dentro desta mesma web (o panel usa a vista previa nun iframe)
        "frame-ancestors 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ].join('; '),
    );
    h.delete('Content-Length');
    return new Response(html, { status: r.status, statusText: r.statusText, headers: h });
  }
  return r;
});
