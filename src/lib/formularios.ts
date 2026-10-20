// Formularios de Participa. A mesma definición serve para pintar o formulario,
// validar o envío no servidor e mostrar as inscricións no panel.

export interface Campo {
  nome: string;
  etiqueta: string;
  tipo: 'texto' | 'email' | 'tel' | 'numero' | 'area' | 'opcion';
  obrigatorio?: boolean;
  opcions?: string[];
  axuda?: string;
  max?: number;
  ancho?: boolean; // ocupa as dúas columnas
}

export interface Formulario {
  id: 'centro' | 'entidade' | 'prensa' | 'contacto';
  titulo: string;
  campos: Campo[];
}

const contacto: Campo[] = [
  { nome: 'persoa', etiqueta: 'Persoa de contacto', tipo: 'texto', obrigatorio: true, max: 120 },
  { nome: 'email', etiqueta: 'Correo electrónico', tipo: 'email', obrigatorio: true, max: 160 },
  { nome: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', max: 30 },
];

export const formularios: Formulario[] = [
  {
    id: 'centro',
    titulo: 'Centro educativo',
    campos: [
      { nome: 'centro', etiqueta: 'Nome do centro', tipo: 'texto', obrigatorio: true, max: 160 },
      { nome: 'localidade', etiqueta: 'Concello', tipo: 'texto', obrigatorio: true, max: 120 },
      ...contacto,
      { nome: 'etapa', etiqueta: 'Etapa', tipo: 'opcion', opcions: ['Infantil', 'Primaria', 'ESO', 'Bacharelato', 'FP', 'Varias'] },
      { nome: 'alumnado', etiqueta: 'Alumnado aproximado', tipo: 'numero', max: 6 },
      {
        nome: 'proposta',
        etiqueta: 'Que vos gustaría facer?',
        tipo: 'opcion',
        obrigatorio: true,
        opcions: ['Stand ou microproxecto do alumnado', 'Obradoiro, xogo ou demostración', 'Participar no Foro de Desenvolvemento Local', 'Visitar a Feira cun grupo', 'Aínda non o sabemos'],
      },
      { nome: 'descricion', etiqueta: 'Cóntanos brevemente a vosa proposta', tipo: 'area', max: 2000, ancho: true },
    ],
  },
  {
    id: 'entidade',
    titulo: 'Entidade, colectivo, empresa ou administración',
    campos: [
      { nome: 'entidade', etiqueta: 'Nome da entidade', tipo: 'texto', obrigatorio: true, max: 160 },
      { nome: 'tipoEntidade', etiqueta: 'Tipo', tipo: 'opcion', obrigatorio: true, opcions: ['Asociación ou colectivo', 'ONGD', 'Cooperativa ou empresa', 'Administración pública', 'Universidade ou centro de investigación', 'Outra'] },
      ...contacto,
      { nome: 'web', etiqueta: 'Web ou redes', tipo: 'texto', max: 200 },
      { nome: 'proposta', etiqueta: 'Proposta', tipo: 'opcion', obrigatorio: true, opcions: ['Stand', 'Obradoiro', 'Charla-foro', 'Mesa do Foro de Desenvolvemento Local', 'Apoio con recursos ou materiais', 'Outra'] },
      { nome: 'descricion', etiqueta: 'Descrición da proposta', tipo: 'area', obrigatorio: true, max: 2000, ancho: true },
      { nome: 'necesidades', etiqueta: 'Necesidades (mesa, electricidade, espazo…)', tipo: 'area', max: 600, ancho: true },
    ],
  },
  {
    id: 'prensa',
    titulo: 'Prensa e medios',
    campos: [
      { nome: 'medio', etiqueta: 'Medio', tipo: 'texto', obrigatorio: true, max: 160 },
      ...contacto,
      { nome: 'mensaxe', etiqueta: 'Que necesitas?', tipo: 'area', obrigatorio: true, max: 2000, ancho: true },
    ],
  },
  {
    id: 'contacto',
    titulo: 'Outra consulta',
    campos: [
      { nome: 'persoa', etiqueta: 'Nome', tipo: 'texto', obrigatorio: true, max: 120 },
      { nome: 'email', etiqueta: 'Correo electrónico', tipo: 'email', obrigatorio: true, max: 160 },
      { nome: 'mensaxe', etiqueta: 'Mensaxe', tipo: 'area', obrigatorio: true, max: 2000, ancho: true },
    ],
  },
];

export const formulario = (id: string) => formularios.find((f) => f.id === id);

/** Valida os datos recibidos. Devolve os datos limpos ou a lista de erros. */
export function validarFormulario(f: Formulario, entrada: Record<string, string>) {
  const datos: Record<string, string> = {};
  const erros: string[] = [];
  for (const c of f.campos) {
    const v = (entrada[c.nome] ?? '').toString().trim().slice(0, c.max ?? 500);
    if (!v) {
      if (c.obrigatorio) erros.push(`Falta «${c.etiqueta}».`);
      continue;
    }
    if (c.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) erros.push('O correo electrónico non parece válido.');
    if (c.tipo === 'opcion' && c.opcions && !c.opcions.includes(v)) erros.push(`Opción non válida en «${c.etiqueta}».`);
    if (c.tipo === 'numero' && !/^\d+$/.test(v)) erros.push(`«${c.etiqueta}» debe ser un número.`);
    datos[c.nome] = v;
  }
  return { datos, erros };
}
