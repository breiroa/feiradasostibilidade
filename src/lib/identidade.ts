// Identidade visual: converte as cores e a tipografía escollidas no panel en variables CSS.
// Só se sobrescriben as que cambiaron, así a web de serie queda exactamente igual.
import type { Identidade } from './esquemas';
import { mediaUrl, url } from './url';

/** Cores de serie (as de src/styles/global.css), para o panel e para comparar */
export const CORES_SERIE = { principal: '#3c783c', secundaria: '#64508c', escura: '#1a1428', realce: '#8fb88f', crema: '#f7f4ee', fondo: '#f5f4f7' };

const TITULOS = {
  playfair: "'Playfair Display', Georgia, serif",
  dmsans: "'DM Sans Variable', 'DM Sans', system-ui, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
};

const mestura = (a: string, pc: number, b: string) => `color-mix(in srgb, ${a} ${pc}%, ${b})`;

/** Bloque `:root { … }` coas variables que cambian (ou '' se todo é de serie) */
export function cssIdentidade(i: Identidade): string {
  const c = i.cores ?? {};
  const v: Record<string, string> = {};
  const cambia = (k: keyof typeof CORES_SERIE) => c[k] && c[k]!.toLowerCase() !== CORES_SERIE[k];
  if (cambia('principal')) {
    const x = c.principal!;
    Object.assign(v, { '--verde': x, '--verde-escuro': mestura(x, 78, '#000'), '--verde-suave': mestura(x, 22, '#fff'), '--verde-pale': mestura(x, 9, '#fff') });
    if (!cambia('realce')) v['--verde-medio'] = mestura(x, 55, '#fff');
  }
  if (cambia('realce')) v['--verde-medio'] = c.realce!;
  if (cambia('secundaria')) {
    const x = c.secundaria!;
    Object.assign(v, { '--morado': x, '--morado-medio': mestura(x, 60, '#fff'), '--morado-suave': mestura(x, 25, '#fff'), '--morado-pale': mestura(x, 9, '#fff'), '--morado-claro': mestura(x, 38, '#fff') });
  }
  if (cambia('escura')) {
    const x = c.escura!;
    Object.assign(v, { '--negro': x, '--negro-2': mestura(x, 92, '#fff'), '--texto': x, '--texto-medio': mestura(x, 80, '#fff'), '--texto-suave': mestura(x, 66, '#fff'), '--linha': mestura(x, 12, '#fff') });
  }
  // Fondos escuros con matiz (portadas): dependen da cor escura e das outras dúas
  if (cambia('escura') || cambia('principal')) v['--negro-verde'] = mestura('var(--negro)', 82, 'var(--verde)');
  if (cambia('escura') || cambia('secundaria')) v['--negro-morado'] = mestura('var(--negro)', 90, 'var(--morado)');
  if (cambia('crema')) v['--crema'] = c.crema!;
  if (cambia('fondo')) v['--gris-pale'] = c.fondo!;
  if (i.titulos && i.titulos !== 'playfair') v['--serif'] = TITULOS[i.titulos];
  const corpo = Object.entries(v).map(([k, x]) => `${k}:${x}`).join(';');
  // :root:root gaña á folla de estilos xeral aínda que esta se cargue despois
  return corpo ? `:root:root{${corpo}}` : '';
}

/** Logo e nome para a cabeceira e o pé */
export function marca(i: Identidade) {
  return {
    logo: i.logo ? mediaUrl(i.logo, 'm') : url('logo-feira.png'),
    antes: i.nomeAntes ?? 'Feira da',
    destacado: i.nomeDestacado ?? 'Sostibilidade',
  };
}
export type Marca = ReturnType<typeof marca>;

export const corEscura = (i: Identidade) => i.cores?.escura ?? CORES_SERIE.escura;
