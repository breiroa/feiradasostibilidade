// Opcións de deseño comúns das seccións (espazado, aliñamento, ancho e foto de fondo)
import type { Seccion } from './esquemas';
import { mediaUrl } from './url';

/** Clases que engade o deseño dunha sección */
export function clasesDeseno(s: Seccion) {
  const d = s.deseno;
  return [
    d?.espazo && d.espazo !== 'normal' && `espazo-${d.espazo}`,
    d?.alinear === 'centro' && 'cab-centro',
    d?.fondoImaxe && 'con-fondo-imaxe',
  ].filter(Boolean) as string[];
}

/** Fondo da sección: cor da marca ou, se ten foto de fondo, escuro (para que o texto se lea en branco) */
export const fondoDe = (s: Seccion) => (s.deseno?.fondoImaxe ? 'escuro' : s.fondo);

/** Estilo en liña para a foto de fondo (cun veo escuro por riba) */
export const estiloDeseno = (s: Seccion) =>
  s.deseno?.fondoImaxe ? `--fondo-imaxe: url('${mediaUrl(s.deseno.fondoImaxe, 'g')}')` : undefined;

/** Escuro para as compoñentes que cambian de cor sobre fondo escuro */
export const escuroDe = (s: Seccion) => ['escuro', 'morado'].includes(fondoDe(s));
