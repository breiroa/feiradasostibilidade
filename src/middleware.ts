// Unifica o enderezo: www. e *.workers.dev redirixen (301) ao dominio principal.
import { defineMiddleware } from 'astro:middleware';

const DOMINIO = 'feiradasostibilidade.com';

export const onRequest = defineMiddleware((ctx, next) => {
  const host = ctx.url.hostname;
  if (host === `www.${DOMINIO}` || host.endsWith('.workers.dev')) {
    return Response.redirect(`https://${DOMINIO}${ctx.url.pathname}${ctx.url.search}`, 301);
  }
  return next();
});
