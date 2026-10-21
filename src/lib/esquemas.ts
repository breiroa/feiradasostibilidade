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
  // Opcións de deseño (todas opcionais): espazado, aliñamento da cabeceira, ancho e foto de fondo
  deseno: z
    .object({
      espazo: z.enum(['compacto', 'normal', 'amplo']).default('normal'),
      alinear: z.enum(['esquerda', 'centro']).default('esquerda'),
      ancho: opc(z.enum(['estreito', 'normal', 'ancho'])),
      fondoImaxe: opc(mediaId),
    })
    .optional(),
};

/** Bloques libres que se poñen dentro das columnas */
const bloque = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('titulo'), texto: texto.min(1), grande: z.boolean().default(false) }),
  z.object({ tipo: z.literal('texto'), corpo: z.string().default('') }),
  z.object({ tipo: z.literal('imaxe'), imaxe: mediaId, alt: opc(texto), pe: opc(texto), forma: z.enum(['rectangular', 'cadrada', 'redonda']).default('rectangular') }),
  z.object({ tipo: z.literal('botons'), botons: z.array(boton).default([]) }),
  z.object({ tipo: z.literal('video'), url }),
  z.object({ tipo: z.literal('cita'), texto: texto.min(1), autoria: opc(texto) }),
  z.object({ tipo: z.literal('cifra'), valor: texto.min(1), etiqueta: texto.min(1) }),
  z.object({ tipo: z.literal('lista'), items: z.array(texto.min(1)).default([]) }),
  z.object({ tipo: z.literal('espazo'), grande: z.boolean().default(false) }),
]);
export type Bloque = z.infer<typeof bloque>;

export const seccion = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('heroe'), ...base, destaque: opc(texto), texto: opc(texto), imaxe: opc(mediaId), imaxeAlt: opc(texto), botons: z.array(boton).default([]), cifras: z.array(cifra).default([]) }),
  z.object({ tipo: z.literal('texto'), ...base, corpo: z.string().default(''), estreito: z.boolean().default(true) }),
  z.object({ tipo: z.literal('texto_imaxe'), ...base, corpo: z.string().default(''), imaxe: opc(mediaId), imaxeAlt: opc(texto), posicion: z.enum(['esquerda', 'dereita']).default('dereita'), botons: z.array(boton).default([]) }),
  z.object({ tipo: z.literal('cifras'), ...base, texto: opc(texto), cifras: z.array(cifra).default([]) }),
  z.object({
    tipo: z.literal('tarxetas'), ...base, texto: opc(texto), columnas: z.coerce.number().int().min(2).max(4).default(3), numerar: z.boolean().default(true),
    items: z.array(z.object({ titulo: texto.min(1), etiqueta: opc(texto), texto: opc(texto), imaxe: opc(mediaId), imaxeAlt: opc(texto), url: opc(url), boton: opc(texto) })).default([]),
  }),
  z.object({ tipo: z.literal('galeria'), ...base, modo: z.enum(['carrusel', 'grella']).default('carrusel'), imaxes: z.array(imaxeAlt).default([]) }),
  z.object({ tipo: z.literal('video'), ...base, texto: opc(texto), url }),
  z.object({ tipo: z.literal('logos'), ...base, texto: opc(texto), grupos: z.array(grupoLogos).default([]) }),
  z.object({
    tipo: z.literal('programa'), ...base, texto: opc(texto),
    dias: z.array(z.object({ dia: texto.min(1), actividades: z.array(z.object({ hora: opc(texto), titulo: texto.min(1), descricion: opc(texto) })).default([]) })).default([]),
  }),
  // Actividades (dun proxecto, un plan…) co seu estado e barra de progreso
  z.object({
    tipo: z.literal('actividades'), ...base, texto: opc(texto), progreso: z.boolean().default(true),
    items: z.array(z.object({ codigo: opc(texto), titulo: texto.min(1), descricion: opc(texto), estado: z.enum(['prevista', 'en-curso', 'feita']).default('prevista') })).default([]),
  }),
  // Presentación: lema, texto grande, etiquetas e cifras (p. ex. o resumo dunha edición)
  z.object({ tipo: z.literal('presentacion'), ...base, lema: opc(texto), texto: opc(texto), chips: z.array(texto.min(1)).default([]), cifras: z.array(cifra).default([]) }),
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
  // Formulario de contacto e participación (o mesmo de Participa); pódese poñer en calquera páxina
  z.object({ tipo: z.literal('formulario'), ...base, texto: opc(texto), graciasTitulo: opc(texto), graciasTexto: opc(texto) }),
  // Listado completo con filtros: todas as noticias, todos os recursos ou todas as edicións
  z.object({ tipo: z.literal('listado'), ...base, texto: opc(texto), de: z.enum(['noticias', 'recursos', 'edicions']), tipos: z.array(ref).default([]), filtro: z.boolean().default(true) }),
  // Columnas (2 ou 3) con bloques libres: título, texto, imaxe, botóns, vídeo, cita, cifra, lista, espazo
  z.object({
    tipo: z.literal('columnas'), ...base, texto: opc(texto),
    proporcion: z.enum(['1-1', '2-1', '1-2', '1-1-1']).default('1-1'),
    vertical: z.enum(['arriba', 'centro']).default('arriba'),
    columnas: z.array(z.object({ bloques: z.array(bloque).default([]) })).default([]),
  }),
  // Preguntas frecuentes (acordeón)
  z.object({ tipo: z.literal('acordeon'), ...base, texto: opc(texto), items: z.array(z.object({ pregunta: texto.min(1), corpo: z.string().default('') })).default([]) }), // «corpo» para que o servidor limpe o HTML
  // HTML libre (saneado ao gardar: sen scripts nin eventos; iframes só de servizos coñecidos)
  z.object({ tipo: z.literal('html'), ...base, html: z.string().default(''), ancho: z.enum(['estreito', 'normal', 'completo']).default('normal') }),
  // Unha foto grande (ancho do texto, ancho normal ou toda a pantalla) con pé
  z.object({ tipo: z.literal('imaxe'), ...base, imaxe: mediaId, alt: opc(texto), pe: opc(texto), tamano: z.enum(['texto', 'normal', 'completa']).default('normal') }),
]);
export type Seccion = z.infer<typeof seccion>;
const seccions = z.array(seccion).default([]);

/** Cabeceira sinxela dunha páxina (etiqueta, título con final en cor, texto, foto e datas) */
const cabeceira = z.object({
  etiqueta: opc(texto),
  titulo: opc(texto),
  destaque: opc(texto),
  texto: opc(texto),
  imaxe: opc(mediaId),
  imaxeAlt: opc(texto),
  datas: z.array(z.object({ data: texto.min(1), texto: texto.min(1) })).default([]),
});

/** Elemento dun menú: unha páxina da web (co seu título ou outro texto) ou unha ligazón libre */
const ligazonMenu = z.object({ tipo: z.enum(['paxina', 'ligazon']).default('paxina'), paxina: opc(ref), url: opc(url), texto: opc(texto) });
/** Elemento de primeiro nivel: pode ter despregable (fillos a man e/ou as subpáxinas da páxina, automáticas) */
const elementoMenu = ligazonMenu.extend({ fillos: z.array(ligazonMenu).default([]), auto: z.boolean().default(false) });
const grupoPe = z.object({ titulo: texto.min(1), entidades: z.array(ref).default([]), nota: opc(texto) });

/** Datos dunha edición da Feira (as edicións son páxinas, subpáxinas de «Edicións», con este bloque) */
const datosEdicion = z.object({
  numero: z.coerce.number().int().min(1),
  ano: z.coerce.number().int().min(2000).max(2100),
  datas: texto.min(1),
  lugar: texto.min(1),
  estado: z.enum(['proxima', 'pasada']).default('pasada'),
  lema: opc(texto),
  cifras: z.array(cifra).default([]),
  fitos: z.array(texto.min(1)).default([]),
});

/** Portada (páxina fixa «inicio»): só seccións */
export const esquemaInicio = z.object({ seccions });

export const TIPOS_CONTACTO = ['web', 'correo', 'telefono', 'instagram', 'facebook', 'x', 'bluesky', 'mastodon', 'youtube', 'tiktok', 'linkedin', 'whatsapp', 'telegram', 'spotify', 'outro'] as const;

export const esquemas = {
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
    // Un dos tipos definidos en Axustes › Tipos de recurso
    tipo: ref,
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
    borrador: z.boolean().default(false),
    // Contido libre da ficha (editor visual): vídeos, galerías, documentos, texto…
    seccions,
  }),

  // Antigos proxectos (xa non se usan: o seu contido pasou ás páxinas). Mantéñense só para ler copias.
  proxectos: z.object({ titulo: texto.min(1) }).passthrough(),

  // Todas as páxinas da web construídas con seccións: Inicio, Participa, FeiraLab, Actualidade, Recursos,
  // Edicións e as súas subpáxinas (cada edición da Feira), legais e as que se creen no panel
  paxinas_libres: z.object({
    titulo: texto.min(1),
    descricion: opc(texto),
    // '' = páxina solta (/enderezo/); 'outra-paxina' = subpáxina (/outra-paxina/enderezo/)
    nai: z.preprocess((v) => v ?? '', z.union([z.literal(''), ref])),
    imaxe: opc(mediaId),
    imaxeAlt: opc(texto),
    borrador: z.boolean().default(false),
    // Cabeceira sinxela (úsase cando a páxina non empeza cunha sección de portada)
    cabeceira: cabeceira.optional(),
    // Se é unha edición da Feira: datos para as tarxetas, a edición destacada e o despregable
    edicion: datosEdicion.optional(),
    seccions,
  }),

  // Menús (o principal, o legal, e os que se creen): a cabeceira e o pé escollen cal usar
  menus: z.object({
    nome: texto.min(1),
    items: z.array(elementoMenu).default([]),
  }),

  // Cabeceira e pé da web (documento único «xeral»)
  estrutura: z.object({
    cabeceira: z
      .object({
        menu: opc(ref),
        boton: z.object({ texto: opc(texto), url: opc(url) }).default({}),
      })
      .default({}),
    pe: z
      .object({
        texto: z.string().default(''),
        grupos: z.array(grupoPe).default([]),
        premios: z.array(z.object({ ano: texto.min(1), texto: texto.min(1) })).default([]),
        menu: opc(ref),
        tituloMenu: texto.default('Navegación'),
        menuLegal: opc(ref),
        tituloContactos: texto.default('Síguenos'),
        licenzaCorpo: z.string().default('Contidos baixo licenza <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.gl" rel="license noopener">CC BY-SA 4.0</a>, salvo indicación.'),
      })
      .default({}),
  }),

  // Modelos: unha páxina enteira ou un conxunto de seccións para reutilizar
  modelos: z.preprocess(
    // Formato antigo: {tipo: 'seccion', seccion}
    (v) => (v && typeof v === 'object' && (v as { tipo?: string }).tipo === 'seccion' ? { ...(v as object), tipo: 'seccions', seccions: [(v as { seccion: unknown }).seccion] } : v),
    z.object({ tipo: z.enum(['paxina', 'seccions']), nome: texto.min(1), desc: opc(texto), cabeceira: cabeceira.optional(), seccions }),
  ),

  // Páxinas fixas antigas (xa migradas a paxinas_libres; só se len como respaldo)
  paxinas: z.record(z.string(), z.unknown()),

  axustes: z.object({
    nome: texto.min(1),
    lema: texto.min(1),
    descricion: texto.min(1),
    edicionActual: ref,
    // Contactos e redes (pé, formulario…): tantos como se queira
    contactos: z.array(z.object({ tipo: z.enum(TIPOS_CONTACTO).default('web'), etiqueta: opc(texto), valor: texto.min(1) })).default([]),
    // Buscadores e redes sociais
    seo: z
      .object({
        titulo: opc(texto), // título da portada nos buscadores (por defecto: nome · lema)
        imaxe: opc(mediaId), // imaxe por defecto ao compartir
        indexar: z.boolean().default(true),
        googleVerificacion: opc(z.string().trim().regex(/^[A-Za-z0-9_-]{10,100}$/, 'Código de verificación non válido')),
        idioma: texto.default('gl'),
      })
      .default({}),
    favicon: opc(mediaId),
    // Tipos de recurso (xogo, podcast…): editables
    tiposRecurso: z.array(z.object({ id: ref, nome: texto.min(1) })).default([]),
  }),
};

/** Páxinas fixas da web: non se poden borrar nin ter outro enderezo */
export const PAXINAS_SISTEMA = ['inicio', 'feiralab', 'participa', 'actualidade', 'recursos', 'edicions'] as const;
/** Páxinas que non poden ter subpáxinas (as súas rutas teñen subpáxinas propias, p. ex. /recursos/ficha/) */
export const SEN_FILLAS = ['inicio', 'participa', 'actualidade', 'recursos'];

export type Coleccion = keyof typeof esquemas;
export type DatosEdicion = z.infer<typeof datosEdicion>;
export type Noticia = z.infer<(typeof esquemas)['noticias']> & { id: string };
export type Entidade = z.infer<(typeof esquemas)['entidades']> & { id: string; proporcion?: number };
export type Recurso = z.infer<(typeof esquemas)['recursos']> & { id: string };
export type PaxinaLibre = z.infer<(typeof esquemas)['paxinas_libres']> & { id: string };
export type Axustes = z.infer<(typeof esquemas)['axustes']>;
export type Menu = z.infer<(typeof esquemas)['menus']> & { id: string };
export type Estrutura = z.infer<(typeof esquemas)['estrutura']>;
/** Unha edición da Feira tal como a usan as tarxetas e listados (sae da súa páxina) */
export interface Edicion extends DatosEdicion {
  id: string;
  titulo: string;
  resumo: string;
  portada?: string;
  portadaAlt?: string;
}
export const colecciones = Object.keys(esquemas) as Coleccion[];
