// Navegación fixa e etiquetas. Os demais datos xerais (nome, redes, pé…) están en D1 (axustes).

export const nav = [
  { href: '', texto: 'Inicio' },
  { href: 'feiralab/', texto: 'FeiraLab' },
  { href: 'edicions/', texto: 'Edicións', despregable: true },
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
