// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Web renderizada en Cloudflare Workers lendo os contidos de D1 (ver wrangler.jsonc).
// `site` actualízase co enderezo definitivo ao publicar.
export default defineConfig({
  site: 'https://feiradasostibilidade.workers.dev',
  output: 'server',
  trailingSlash: 'ignore',
  adapter: cloudflare({ imageService: 'passthrough' }),
});
