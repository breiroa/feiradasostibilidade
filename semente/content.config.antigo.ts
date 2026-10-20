import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// O panel (Pages CMS) pode gardar campos baleiros como "" ou null: trátanse como "sen valor".
const baleiro = (v: unknown) => (v === '' || v === null ? undefined : v);
const opcional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(baleiro, schema.optional());

// As referencias poden chegar como id ("cidel-galicia") ou como ruta do panel
// ("src/content/entidades/cidel-galicia.yaml"): quedamos co nome do ficheiro sen extensión.
const idDe = (v: unknown) => (typeof v === 'string' ? v.split('/').pop()!.replace(/\.(md|ya?ml)$/, '') : v);
const ref = (coleccion: 'edicions' | 'entidades' | 'proxectos') => z.preprocess(idDe, reference(coleccion));
const refOpcional = (coleccion: 'edicions' | 'entidades' | 'proxectos') =>
  z.preprocess((v) => idDe(baleiro(v)), reference(coleccion).optional());

// Cada colección corresponde a unha carpeta de src/content/ e a unha sección do CMS (.pages.yml).
// Se un ficheiro non cumpre o esquema, `npm run build` falla e indica o campo.

const edicions = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/edicions' }),
  schema: ({ image }) =>
    z.object({
      numero: z.number().int(),
      ano: z.number().int(),
      titulo: z.string(),
      lema: opcional(z.string()),
      datas: z.string(),
      lugar: z.string(),
      estado: z.enum(['proxima', 'pasada']),
      resumo: z.string(),
      portada: opcional(image()),
      portadaAlt: opcional(z.string()),
      cifras: z.array(z.object({ valor: z.string(), etiqueta: z.string() })).default([]),
      fitos: z.array(z.string()).default([]),
      programa: z
        .array(
          z.object({
            dia: z.string(),
            actividades: z.array(
              z.object({
                hora: opcional(z.string()),
                titulo: z.string(),
                descricion: opcional(z.string()),
              }),
            ),
          }),
        )
        .default([]),
      centros: z.array(z.string()).default([]),
      entidades: z.array(ref('entidades')).default([]),
      galeria: z.array(z.object({ imaxe: image(), alt: z.string() })).default([]),
      videos: z.array(z.object({ titulo: z.string(), url: z.string().url() })).default([]),
      documentos: z.array(z.object({ titulo: z.string(), url: opcional(z.string()) })).default([]),
      prensa: z.array(z.object({ medio: z.string(), titulo: opcional(z.string()), url: opcional(z.string().url()) })).default([]),
      proxecto: refOpcional('proxectos'),
    }),
});

const noticias = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/noticias' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      data: z.coerce.date(),
      resumo: z.string(),
      edicion: refOpcional('edicions'),
      imaxe: opcional(image()),
      imaxeAlt: opcional(z.string()),
      borrador: z.boolean().default(false),
    }),
});

const entidades = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/entidades' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string(),
      papel: z.enum(['organiza', 'financia', 'colabora', 'centro']),
      logo: opcional(image()),
      web: opcional(z.string().url()),
      orde: z.number().default(100),
    }),
});

const recursos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/recursos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      tipo: z.enum(['xogo', 'podcast', 'estudo', 'guia', 'audiovisual', 'obradoiro', 'outro']),
      resumo: z.string(),
      edicion: refOpcional('edicions'),
      temas: z.array(z.string()).default([]),
      ods: z.array(z.number().int().min(1).max(17)).default([]),
      ligazon: opcional(z.string().url()),
      ficheiro: opcional(z.string()),
      imaxe: opcional(image()),
      imaxeAlt: opcional(z.string()),
      autoria: opcional(z.string()),
      licenza: z.string().default('CC BY-SA 4.0'),
    }),
});

const proxectos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/proxectos' }),
  schema: z.object({
    titulo: z.string(),
    nomeCurto: z.string(),
    edicion: ref('edicions'),
    resumo: z.string(),
    financiamento: z.string(),
    entidades: z.array(ref('entidades')).default([]),
    cifras: z.array(z.object({ valor: z.string(), etiqueta: z.string() })).default([]),
    actividades: z.array(
      z.object({
        codigo: z.string(),
        resultado: z.string(),
        titulo: z.string(),
        descricion: z.string(),
        estado: z.enum(['prevista', 'en-curso', 'feita']).default('prevista'),
      }),
    ),
  }),
});

export const collections = { edicions, noticias, entidades, recursos, proxectos };
