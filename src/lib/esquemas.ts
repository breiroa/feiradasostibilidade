// Esquemas dos contidos. Úsanse ao ler (web pública) e ao gardar (panel),
// para que nunca chegue á web un documento mal formado.
import { z } from 'astro/zod';

// Campos baleiros ("" ou null) cóntanse como "sen valor"
const baleiro = (v: unknown) => (v === '' || v === null ? undefined : v);
const opc = <T extends z.ZodTypeAny>(s: T) => z.preprocess(baleiro, s.optional());

const texto = z.string().trim();
const url = z.string().trim().refine((v) => /^(https?:\/\/|mailto:|\/)/.test(v), 'Debe comezar por https://, mailto: ou /');
/** Identificador dunha imaxe ou ficheiro da biblioteca (táboa media) */
const mediaId = z.string().regex(/^[a-z0-9-]{3,80}$/, 'Imaxe non válida');
/** Identificador doutro documento (edición, entidade…) */
const ref = z.string().regex(/^[a-z0-9-]{1,80}$/, 'Referencia non válida');
const cifra = z.object({ valor: texto.min(1), etiqueta: texto.min(1) });

export const esquemas = {
  edicions: z.object({
    numero: z.coerce.number().int().min(1),
    ano: z.coerce.number().int().min(2000).max(2100),
    titulo: texto.min(1),
    lema: opc(texto),
    datas: texto.min(1),
    lugar: texto.min(1),
    estado: z.enum(['proxima', 'pasada']),
    resumo: texto.min(1),
    corpo: z.string().default(''),
    portada: opc(mediaId),
    portadaAlt: opc(texto),
    cifras: z.array(cifra).default([]),
    fitos: z.array(texto.min(1)).default([]),
    programa: z
      .array(
        z.object({
          dia: texto.min(1),
          actividades: z.array(z.object({ hora: opc(texto), titulo: texto.min(1), descricion: opc(texto) })).default([]),
        }),
      )
      .default([]),
    centros: z.array(texto.min(1)).default([]),
    // Grupos de logos con título libre: «Organiza», «Impulsan», «Co apoio de», «Colaboran»…
    grupos: z.array(z.object({ titulo: texto.min(1), entidades: z.array(ref).default([]) })).default([]),
    galeria: z.array(z.object({ imaxe: mediaId, alt: opc(texto) })).default([]),
    videos: z.array(z.object({ titulo: texto.min(1), url })).default([]),
    documentos: z.array(z.object({ titulo: texto.min(1), url: opc(url), ficheiro: opc(mediaId) })).default([]),
    prensa: z.array(z.object({ medio: texto.min(1), titulo: opc(texto), url: opc(url) })).default([]),
    proxecto: opc(ref),
  }),

  noticias: z.object({
    titulo: texto.min(1),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD'),
    resumo: texto.min(1),
    edicion: opc(ref),
    imaxe: opc(mediaId),
    imaxeAlt: opc(texto),
    corpo: z.string().default(''),
    borrador: z.boolean().default(false),
  }),

  entidades: z.object({
    nome: texto.min(1),
    tipo: z.enum(['centro', 'entidade', 'institucion', 'empresa']).default('entidade'),
    logo: opc(mediaId),
    web: opc(url),
  }),

  recursos: z.object({
    titulo: texto.min(1),
    tipo: z.enum(['xogo', 'podcast', 'estudo', 'guia', 'audiovisual', 'obradoiro', 'outro']),
    resumo: texto.min(1),
    edicion: opc(ref),
    temas: z.array(texto.min(1)).default([]),
    ods: z.array(z.coerce.number().int().min(1).max(17)).default([]),
    ligazon: opc(url),
    ficheiro: opc(mediaId),
    imaxe: opc(mediaId),
    imaxeAlt: opc(texto),
    autoria: opc(texto),
    licenza: texto.default('CC BY-SA 4.0'),
    corpo: z.string().default(''),
  }),

  proxectos: z.object({
    titulo: texto.min(1),
    nomeCurto: texto.min(1),
    subtitulo: opc(texto),
    edicion: ref,
    resumo: texto.min(1),
    financiamento: texto.min(1),
    entidades: z.array(ref).default([]),
    cifras: z.array(cifra).default([]),
    corpo: z.string().default(''),
    actividades: z
      .array(
        z.object({
          codigo: texto.min(1),
          resultado: texto.min(1),
          titulo: texto.min(1),
          descricion: texto.min(1),
          estado: z.enum(['prevista', 'en-curso', 'feita']).default('prevista'),
        }),
      )
      .default([]),
  }),

  // Textos das páxinas fixas. Cada páxina ten os seus campos.
  paxinas: z.record(z.string(), z.unknown()),

  axustes: z.object({
    nome: texto.min(1),
    lema: texto.min(1),
    descricion: texto.min(1),
    edicionActual: ref,
    instagram: opc(url),
    instagramUsuario: opc(texto),
    correo: opc(texto),
    webIes: opc(url),
    pe: z
      .object({
        texto: z.string().default(''),
        grupos: z.array(z.object({ titulo: texto.min(1), entidades: z.array(ref).default([]), nota: opc(texto) })).default([]),
      })
      .default({ texto: '', grupos: [] }),
  }),
};

export type Coleccion = keyof typeof esquemas;
export type Edicion = z.infer<(typeof esquemas)['edicions']> & { id: string };
export type Noticia = z.infer<(typeof esquemas)['noticias']> & { id: string };
export type Entidade = z.infer<(typeof esquemas)['entidades']> & { id: string };
export type Recurso = z.infer<(typeof esquemas)['recursos']> & { id: string };
export type Proxecto = z.infer<(typeof esquemas)['proxectos']> & { id: string };
export type Axustes = z.infer<(typeof esquemas)['axustes']>;
export const colecciones = Object.keys(esquemas) as Coleccion[];
