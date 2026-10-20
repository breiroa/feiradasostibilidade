// Esquemas dos contidos. Úsanse ao ler (web pública) e ao gardar (panel),
// para que nunca chegue á web un documento mal formado.
import { z } from 'astro/zod';

// Campos baleiros ("" ou null) cóntanse como "sen valor"
const baleiro = (v: unknown) => (v === '' || v === null ? undefined : v);
const opc = <T extends z.ZodTypeAny>(s: T) => z.preprocess(baleiro, s.optional());

const texto = z.string().trim();
const url = z.string().trim().refine((v) => /^(https?:\/\/|mailto:|\/|#)/.test(v), 'Debe comezar por https://, mailto: ou /');
/** Identificador dunha imaxe ou ficheiro da biblioteca (táboa media) */
const mediaId = z.string().regex(/^[a-z0-9-]{3,80}$/, 'Imaxe non válida');
/** Identificador doutro documento (edición, entidade…) */
const ref = z.string().regex(/^[a-z0-9-]{1,80}$/, 'Referencia non válida');
const cifra = z.object({ valor: texto.min(1), etiqueta: texto.min(1) });
const boton = z.object({ texto: texto.min(1), url, estilo: z.enum(['principal', 'secundario']).default('principal') });
const imaxeAlt = z.object({ imaxe: mediaId, alt: opc(texto) });
const grupoLogos = z.object({ titulo: texto.min(1), entidades: z.array(ref).default([]) });

// ───────────── SECCIÓNS (construtor de páxinas) ─────────────
// Campos comúns a todas: identificador interno, oculta, fondo, etiqueta superior e título.
const base = {
  id: z.string().max(40).default(() => Math.random().toString(36).slice(2, 10)),
  oculta: z.boolean().default(false),
  fondo: z.enum(['claro', 'branco', 'verde', 'morado', 'escuro']).default('claro'),
  ancla: opc(z.string().regex(/^[a-z0-9-]{1,40}$/, 'O ancla só pode ter minúsculas, números e guións')),
  etiqueta: opc(texto),
  titulo: opc(texto),
};

export const seccion = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('heroe'), ...base, destaque: opc(texto), texto: opc(texto), imaxe: opc(mediaId), imaxeAlt: opc(texto), botons: z.array(boton).default([]), cifras: z.array(cifra).default([]) }),
  z.object({ tipo: z.literal('texto'), ...base, corpo: z.string().default(''), estreito: z.boolean().default(true) }),
  z.object({ tipo: z.literal('texto_imaxe'), ...base, corpo: z.string().default(''), imaxe: opc(mediaId), imaxeAlt: opc(texto), posicion: z.enum(['esquerda', 'dereita']).default('dereita'), botons: z.array(boton).default([]) }),
  z.object({ tipo: z.literal('cifras'), ...base, texto: opc(texto), cifras: z.array(cifra).default([]) }),
  z.object({
    tipo: z.literal('tarxetas'), ...base, texto: opc(texto), columnas: z.coerce.number().int().min(2).max(4).default(3),
    items: z.array(z.object({ titulo: texto.min(1), etiqueta: opc(texto), texto: opc(texto), imaxe: opc(mediaId), imaxeAlt: opc(texto), url: opc(url) })).default([]),
  }),
  z.object({ tipo: z.literal('galeria'), ...base, imaxes: z.array(imaxeAlt).default([]) }),
  z.object({ tipo: z.literal('video'), ...base, texto: opc(texto), url }),
  z.object({ tipo: z.literal('logos'), ...base, texto: opc(texto), grupos: z.array(grupoLogos).default([]) }),
  z.object({
    tipo: z.literal('programa'), ...base, texto: opc(texto),
    dias: z.array(z.object({ dia: texto.min(1), actividades: z.array(z.object({ hora: opc(texto), titulo: texto.min(1), descricion: opc(texto) })).default([]) })).default([]),
  }),
  z.object({ tipo: z.literal('actividades'), ...base, texto: opc(texto), proxecto: ref }),
  z.object({ tipo: z.literal('cronoloxia'), ...base, texto: opc(texto), fitos: z.array(z.object({ data: texto.min(1), titulo: texto.min(1), texto: opc(texto), estado: z.enum(['feito', 'agora', 'proximo']).default('proximo') })).default([]) }),
  z.object({ tipo: z.literal('documentos'), ...base, items: z.array(z.object({ titulo: texto.min(1), detalle: opc(texto), url: opc(url), ficheiro: opc(mediaId) })).default([]) }),
  z.object({ tipo: z.literal('lista'), ...base, items: z.array(texto.min(1)).default([]) }),
  z.object({ tipo: z.literal('recursos'), ...base, texto: opc(texto), recursos: z.array(ref).default([]), edicion: opc(ref) }),
  z.object({ tipo: z.literal('cita'), ...base, texto: texto.min(1), destaque: opc(texto), autoria: opc(texto) }),
  z.object({ tipo: z.literal('chamada'), ...base, texto: opc(texto), botons: z.array(boton).default([]) }),
  z.object({ tipo: z.literal('noticias'), ...base, edicion: opc(ref), numero: z.coerce.number().int().min(1).max(12).default(3) }),
  z.object({ tipo: z.literal('edicions'), ...base, texto: opc(texto) }),
  z.object({ tipo: z.literal('edicion_actual'), ...base }),
  z.object({ tipo: z.literal('subpaxinas'), ...base, texto: opc(texto), nai: ref }),
]);
export type Seccion = z.infer<typeof seccion>;
const seccions = z.array(seccion).default([]);
/** Portada (páxina fixa «inicio»): só seccións */
export const esquemaInicio = z.object({ seccions });

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
    portada: opc(mediaId),
    portadaAlt: opc(texto),
    // Datos destacados que saen tamén nas tarxetas e na portada
    cifras: z.array(cifra).default([]),
    fitos: z.array(texto.min(1)).default([]),
    proxecto: opc(ref),
    seccions,
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
    // Portada vertical (xérase soa ao subir un PDF) e imaxe horizontal opcional
    portada: opc(mediaId),
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

  // Páxinas creables (FeiraLab e as súas subpáxinas, páxinas legais, outras)
  paxinas_libres: z.object({
    titulo: texto.min(1),
    descricion: opc(texto),
    // '' = páxina solta (/enderezo/); 'feiralab' = subpáxina (/feiralab/enderezo/)
    nai: z.preprocess((v) => v ?? '', z.enum(['', 'feiralab'])),
    imaxe: opc(mediaId),
    borrador: z.boolean().default(false),
    seccions,
  }),

  // Páxinas fixas con estrutura propia (inicio con seccións; participa cos seus campos)
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
        premios: z.array(z.object({ ano: texto.min(1), texto: texto.min(1) })).default([]),
      })
      .default({ texto: '', grupos: [], premios: [] }),
  }),
};

export type Coleccion = keyof typeof esquemas;
export type Edicion = z.infer<(typeof esquemas)['edicions']> & { id: string };
export type Noticia = z.infer<(typeof esquemas)['noticias']> & { id: string };
export type Entidade = z.infer<(typeof esquemas)['entidades']> & { id: string };
export type Recurso = z.infer<(typeof esquemas)['recursos']> & { id: string };
export type Proxecto = z.infer<(typeof esquemas)['proxectos']> & { id: string };
export type PaxinaLibre = z.infer<(typeof esquemas)['paxinas_libres']> & { id: string };
export type Axustes = z.infer<(typeof esquemas)['axustes']>;
export const colecciones = Object.keys(esquemas) as Coleccion[];
