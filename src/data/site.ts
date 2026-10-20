// Datos xerais do sitio: navegación, redes e contacto.
export const site = {
  nome: 'Feira da Sostibilidade',
  lema: 'Pensa, consume e actúa',
  descricion:
    'A Feira da Sostibilidade do IES Luís Seoane (Pontevedra): un movemento educativo de alumnado, profesorado, universidade e entidades sociais arredor dos retos ecosociais e da cidadanía global.',
  instagram: 'https://www.instagram.com/feiradasostibilidade',
  instagramUsuario: '@feiradasostibilidade',
  webIes: 'https://iesluisseoane.org/',
  // Pendente: correo de contacto da Feira
  correo: '',
  edicionActual: '2027',
};

export const nav = [
  { href: 'a-feira/', texto: 'A Feira' },
  { href: 'edicions/', texto: 'Edicións' },
  { href: 'actualidade/', texto: 'Actualidade' },
  { href: 'recursos/', texto: 'Recursos' },
  { href: 'participa/', texto: 'Participa' },
];

export const tiposRecurso = {
  xogo: 'Xogo educativo',
  podcast: 'Podcast',
  estudo: 'Estudo e investigación',
  guia: 'Guía',
  audiovisual: 'Audiovisual',
  obradoiro: 'Obradoiro',
  outro: 'Outro',
} as const;
