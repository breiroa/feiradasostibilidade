// Edición directa na vista previa do panel.
// Na vista previa (Astro.locals.editar) os textos e imaxes levan atributos data-e coa súa ruta dentro
// da sección (p. ex. «titulo», «items.2.texto»), e o script public/panel/vista-edicion.js fainos editables.
// Na web pública estas funcións non engaden nada.

export type TipoEditable = 'texto' | 'area' | 'rico' | 'imaxe' | 'ligazon';

export const editando = (locals: unknown) => Boolean((locals as { editar?: boolean } | undefined)?.editar);

/** Atributos para un elemento editable (texto, imaxe…). `ph` é o texto que se ve cando está baleiro. */
export function ed(locals: unknown, ruta: string, tipo: TipoEditable = 'texto', ph?: string): Record<string, string> {
  if (!editando(locals)) return {};
  const a: Record<string, string> = { 'data-e': ruta, 'data-et': tipo };
  if (ph) a['data-ph'] = ph;
  return a;
}

/** Atributos para un elemento dunha lista (tarxeta, fito, pregunta…), que se pode mover, duplicar ou quitar */
export const edItem = (locals: unknown, ruta: string): Record<string, string> => (editando(locals) ? { 'data-item': ruta } : {});

/** Tipos de sección que teñen texto introdutorio baixo o título */
export const CON_INTRO = new Set(['cifras', 'tarxetas', 'video', 'logos', 'programa', 'actividades', 'cronoloxia', 'recursos', 'chamada', 'edicions', 'subpaxinas', 'formulario', 'listado', 'columnas', 'acordeon']);
