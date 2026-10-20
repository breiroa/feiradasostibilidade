// Formulario de Participa: un só formulario sinxelo, válido tanto para inscribirse como para preguntar.
// A mesma definición serve para pintalo, validalo no servidor e mostrar as mensaxes no panel.

export interface Campo {
  nome: string;
  etiqueta: string;
  tipo: 'texto' | 'email' | 'tel' | 'area' | 'opcion';
  obrigatorio?: boolean;
  opcions?: { valor: string; texto: string }[];
  max?: number;
  ancho?: boolean;
  axuda?: string;
}

/** Tipos de mensaxe (gárdanse como «tipo» da inscrición) */
export const tiposParticipa = [
  { valor: 'centro', texto: 'Son dun centro educativo' },
  { valor: 'entidade', texto: 'Son dunha entidade, colectivo, empresa ou administración' },
  { valor: 'prensa', texto: 'Son dun medio de comunicación' },
  { valor: 'contacto', texto: 'Só quero preguntar ou saber máis' },
];

export const campos: Campo[] = [
  { nome: 'tipo', etiqueta: 'Quen es?', tipo: 'opcion', obrigatorio: true, opcions: tiposParticipa, ancho: true },
  { nome: 'nome', etiqueta: 'Nome', tipo: 'texto', obrigatorio: true, max: 120 },
  { nome: 'email', etiqueta: 'Correo electrónico', tipo: 'email', obrigatorio: true, max: 160 },
  { nome: 'organizacion', etiqueta: 'Centro ou entidade', tipo: 'texto', max: 160, axuda: 'Opcional' },
  { nome: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', max: 30, axuda: 'Opcional' },
  { nome: 'mensaxe', etiqueta: 'Mensaxe', tipo: 'area', obrigatorio: true, max: 3000, ancho: true, axuda: 'Cóntanos que che gustaría facer na Feira ou pregúntanos o que queiras.' },
];

/** Valida os datos recibidos. Devolve os datos limpos ou a lista de erros. */
export function validarFormulario(entrada: Record<string, string>) {
  const datos: Record<string, string> = {};
  const erros: string[] = [];
  for (const c of campos) {
    const v = (entrada[c.nome] ?? '').toString().trim().slice(0, c.max ?? 500);
    if (!v) {
      if (c.obrigatorio) erros.push(`Falta «${c.etiqueta}».`);
      continue;
    }
    if (c.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) erros.push('O correo electrónico non parece válido.');
    if (c.tipo === 'opcion' && c.opcions && !c.opcions.some((o) => o.valor === v)) erros.push(`Opción non válida en «${c.etiqueta}».`);
    datos[c.nome] = v;
  }
  return { datos, erros };
}
