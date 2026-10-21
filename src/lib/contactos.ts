// Contactos e redes (Axustes): ligazón e texto de cada un segundo o seu tipo.
import type { Axustes } from './esquemas';

type Contacto = Axustes['contactos'][number];

const REDES: Record<string, { nome: string; base?: string }> = {
  web: { nome: 'Web' }, correo: { nome: 'Correo' }, telefono: { nome: 'Teléfono' },
  instagram: { nome: 'Instagram', base: 'https://www.instagram.com/' }, facebook: { nome: 'Facebook', base: 'https://www.facebook.com/' },
  x: { nome: 'X', base: 'https://x.com/' }, bluesky: { nome: 'Bluesky', base: 'https://bsky.app/profile/' }, mastodon: { nome: 'Mastodon' },
  youtube: { nome: 'YouTube', base: 'https://www.youtube.com/@' }, tiktok: { nome: 'TikTok', base: 'https://www.tiktok.com/@' },
  linkedin: { nome: 'LinkedIn', base: 'https://www.linkedin.com/in/' }, whatsapp: { nome: 'WhatsApp', base: 'https://wa.me/' },
  telegram: { nome: 'Telegram', base: 'https://t.me/' }, spotify: { nome: 'Spotify' }, outro: { nome: 'Ligazón' },
};
export const nomeRede = (tipo: string) => REDES[tipo]?.nome ?? tipo;

/** {href, texto} dun contacto, ou null se o valor non serve */
export function ligazonContacto(c: Contacto): { href: string; texto: string; tipo: string } | null {
  const v = c.valor.trim();
  const r = REDES[c.tipo] ?? REDES.outro;
  let href: string;
  if (c.tipo === 'correo') href = `mailto:${v.replace(/^mailto:/i, '')}`;
  else if (c.tipo === 'telefono') href = `tel:${v.replace(/[^\d+]/g, '')}`;
  else if (/^https?:\/\//i.test(v)) href = v;
  else if (r.base) href = r.base + v.replace(/^@/, '').replace(/[^\w.@+-]/g, (x) => encodeURIComponent(x));
  else return null;
  const texto = c.etiqueta || (c.tipo === 'correo' || c.tipo === 'telefono' ? v.replace(/^mailto:/i, '') : c.tipo === 'web' || c.tipo === 'outro' ? v.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '') : r.nome);
  return { href, texto, tipo: c.tipo };
}
