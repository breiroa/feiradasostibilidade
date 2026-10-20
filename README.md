# Feira da Sostibilidade · web e panel

Web da Feira da Sostibilidade do IES Luís Seoane (Pontevedra) con **panel propio** para xestionar os contidos.
Todo funciona no plan gratuíto de Cloudflare:

- **Cloudflare Workers**: serve a web e o panel (Astro, páxinas xeradas ao momento).
- **Cloudflare D1**: base de datos con contidos, imaxes, contas, sesións e inscricións.
- **GitHub**: garda o código.

## Panel (`/panel/`)

- Contas individuais con **verificación en dous pasos obrigatoria** (app de autenticación).
- A primeira persoa que entra crea a conta de superadministración; as demais entran por **convite** (ligazón que se copia e se envía).
- Seccións: Edicións, Noticias, Recursos, Proxectos, Entidades e logos, Textos das páxinas, Biblioteca, Inscricións (formularios de Participa), Persoas administradoras, Axustes e pé, A miña conta.
- Gardar = cambio visible na web ao instante. As imaxes optimízanse no navegador (WebP) antes de subir.
- Copia de seguridade: Axustes → «Descargar copia». D1 garda ademais copias automáticas de 7 días.

## Estrutura

| Carpeta | Contido |
|---|---|
| `src/pages/` | Páxinas públicas e API (`src/pages/api/`) |
| `src/lib/datos.ts` | Acceso á base de datos (único sitio que coñece D1) |
| `src/lib/esquemas.ts` | Esquemas dos contidos (validación ao ler e ao gardar) |
| `src/lib/panel/` | Seguridade (contrasinais, 2FA, sesións), saneado do HTML, axudas da API |
| `public/panel/` | O panel (HTML + CSS + JavaScript sen dependencias) |
| `migrations/` | Estrutura da base de datos |
| `semente/`, `scripts/semente.mjs` | Contidos iniciais (xeran `semente/semente.sql`) |
| `public/vieja/` | A páxina FeiraLab orixinal, tal cal |

## Traballar en local

Require Node.js 22 ou superior.

```bash
npm install
npm run semente      # xera semente/semente.sql
npm run bd:local     # crea a base de datos local e carga a semente
npm run dev          # http://localhost:4321  (panel en /panel/)
```

## Publicar

```bash
npx wrangler login   # unha vez: autorizar no navegador
npm run deploy
```

A primeira vez: `npx wrangler d1 create feira`, copiar o `database_id` en `wrangler.jsonc` e executar `npm run bd:remota`.
