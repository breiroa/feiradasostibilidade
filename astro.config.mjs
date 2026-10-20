// @ts-check
import { defineConfig } from 'astro/config';

// Para pasar a un dominio propio: cambiar `site` e eliminar `base`.
export default defineConfig({
  site: 'https://breiroa.github.io',
  base: '/feiradasostibilidade',
  trailingSlash: 'always',
});
