/** Ruta interna respectando o `base` do sitio: url('edicions/') → /feiradasostibilidade/edicions/ */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

const meses = ['xaneiro', 'febreiro', 'marzo', 'abril', 'maio', 'xuño', 'xullo', 'agosto', 'setembro', 'outubro', 'novembro', 'decembro'];

/** 20 de outubro de 2026 */
export function dataLonga(d: Date): string {
  return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

const romanos = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

/** 5 → V */
export function romano(n: number): string {
  return romanos[n] ?? String(n);
}

/** Enderezo dunha imaxe/ficheiro da biblioteca: g = grande, m = miniatura, f = ficheiro */
export function mediaUrl(id: string, variante: 'g' | 'm' | 'f' = 'g'): string {
  return url(`media/${id}/${variante}`);
}

/** "2026-10-20" → "20 de outubro de 2026" */
export function dataTexto(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return dataLonga(new Date(Date.UTC(a, m - 1, d)));
}
