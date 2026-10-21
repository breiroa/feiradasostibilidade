// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Web renderizada en Cloudflare Workers lendo os contidos de D1 (ver wrangler.jsonc).
// `site` actualízase co enderezo definitivo ao publicar.
export default defineConfig({
  site: 'https://feiradasostibilidade.com',
  output: 'server',
  trailingSlash: 'ignore',
  // Astro 7 elimina por defecto os espazos entre elementos en liña (`'jsx'`); mantemos o comportamento anterior
  compressHTML: true,
  adapter: cloudflare({ imageService: 'passthrough' }),
});
