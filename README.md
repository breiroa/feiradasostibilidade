# Feira da Sostibilidade · web

Web da Feira da Sostibilidade do IES Luís Seoane (Pontevedra): portada do movemento, edicións que se van acumulando (2023 → 2027), actualidade, recursos e o proxecto SENDA 2030 dentro da V edición.

Publicada en **https://breiroa.github.io/feiradasostibilidade/**

## Editar contidos (sen tocar código)

Entra en [app.pagescms.org](https://app.pagescms.org) coa túa conta de GitHub e abre este repositorio. Desde aí podes engadir ou cambiar:

- **Noticias**: aparecen en Actualidade, na portada e na páxina da súa edición.
- **Edicións**: unha ficha por ano (datas, programa, cifras, galería, centros e entidades…).
- **Entidades**: nome, logo e web; despois engádense ás edicións.
- **Recursos**: xogos, estudos, podcasts e materiais.
- **Proxectos**: SENDA 2030 e as súas actividades (cambia o estado: prevista → en curso → feita).

Cada vez que gardas, a web reconstrúese e publícase soa en 1–2 minutos (pestana *Actions* de GitHub).

## Estrutura

| Carpeta | Contido |
|---|---|
| `src/content/` | Os contidos (Markdown e YAML), unha carpeta por tipo |
| `src/assets/media/` | Imaxes subidas desde o panel |
| `src/assets/legacy/` | Fotos herdadas da páxina FeiraLab orixinal |
| `src/pages/` | As páxinas |
| `src/components/` | Pezas reutilizables (tarxetas, galería, logos…) |
| `public/vieja/` | A páxina FeiraLab orixinal, tal cal (sen ligazóns desde a web) |

## Traballar en local

Require Node.js 22 ou superior.

```bash
npm install
npm run dev      # http://localhost:4321/feiradasostibilidade/
npm run build    # comproba que todo compila
```

Para usar un dominio propio: en `astro.config.mjs` cambiar `site` e eliminar `base`.
