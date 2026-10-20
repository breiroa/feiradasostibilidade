// Seguridade do panel: contrasinais, 2FA (TOTP), sesións, límites de intentos.
// Todo con WebCrypto, dispoñible en Cloudflare Workers sen dependencias.
import type { AstroCookies } from 'astro';
import { db } from '../datos';

const enc = new TextEncoder();

// ── Utilidades ──
export const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const desdeB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
export const aleatorio = (n = 32) => crypto.getRandomValues(new Uint8Array(n));
export const token = (n = 32) => b64url(aleatorio(n));
export async function sha256(txt: string) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(txt)));
}
/** Comparación en tempo constante */
export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ── Contrasinais (PBKDF2-SHA256) ──
// Iteracións moderadas para caber no tempo de CPU do plan gratuíto de Cloudflare;
// a protección principal é o 2FA obrigatorio e o límite de intentos.
const ITERACIONS = 10_000;
export const MIN_CONTRASINAL = 12;

async function pbkdf2(contrasinal: string, sal: Uint8Array, iter: number) {
  const chave = await crypto.subtle.importKey('raw', enc.encode(contrasinal), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iter }, chave, 256);
}
export async function hashContrasinal(contrasinal: string) {
  const sal = aleatorio(16);
  return `pbkdf2$${ITERACIONS}$${b64url(sal)}$${b64url(await pbkdf2(contrasinal, sal, ITERACIONS))}`;
}
export async function verificarContrasinal(contrasinal: string, gardado: string | null) {
  if (!gardado) return false;
  const [tipo, iter, sal, hash] = gardado.split('$');
  if (tipo !== 'pbkdf2') return false;
  const calc = b64url(await pbkdf2(contrasinal, desdeB64url(sal), Number(iter)));
  return iguais(calc, hash);
}

// ── TOTP (RFC 6238: 6 díxitos, 30 s, HMAC-SHA1) ──
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Uint8Array) {
  let bits = 0, valor = 0, saida = '';
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += B32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += B32[(valor << (5 - bits)) & 31];
  return saida;
}
function desdeBase32(s: string) {
  const limpo = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, valor = 0;
  const saida: number[] = [];
  for (const c of limpo) {
    valor = (valor << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      saida.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(saida);
}
export const novoSegredoTotp = () => base32(aleatorio(20));

export async function codigoTotp(segredo: string, paso: number) {
  const msx = new ArrayBuffer(8);
  new DataView(msx).setBigUint64(0, BigInt(paso));
  const chave = await crypto.subtle.importKey('raw', desdeBase32(segredo), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', chave, msx));
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

/** Comproba o código (±1 paso de 30 s). Devolve o paso usado, ou null. Rexeita pasos xa usados. */
export async function verificarTotp(segredo: string, codigo: string, ultimoPaso = 0) {
  const c = codigo.replace(/\D/g, '');
  if (c.length !== 6) return null;
  const agora = Math.floor(Date.now() / 1000 / 30);
  for (const d of [0, -1, 1]) {
    const paso = agora + d;
    if (paso <= ultimoPaso) continue;
    if (iguais(await codigoTotp(segredo, paso), c)) return paso;
  }
  return null;
}
export const otpauth = (segredo: string, email: string) =>
  `otpauth://totp/${encodeURIComponent('Feira da Sostibilidade')}:${encodeURIComponent(email)}?secret=${segredo}&issuer=${encodeURIComponent('Feira da Sostibilidade')}&digits=6&period=30`;

// ── Límite de intentos ──
export async function demasiadosIntentos(clave: string, max: number, ventaSeg: number) {
  const desde = Math.floor(Date.now() / 1000) - ventaSeg;
  const r = await db().prepare('SELECT COUNT(*) AS n FROM intentos WHERE clave = ? AND ts > ?').bind(clave, desde).first<{ n: number }>();
  return (r?.n ?? 0) >= max;
}
export async function rexistrarIntento(clave: string) {
  const agora = Math.floor(Date.now() / 1000);
  await db().batch([
    db().prepare('INSERT INTO intentos (clave, ts) VALUES (?, ?)').bind(clave, agora),
    db().prepare('DELETE FROM intentos WHERE ts < ?').bind(agora - 86400),
  ]);
}

// ── Sesións ──
export const COOKIE = 'feira_panel';
const DURACION_H = 12;

export interface Admin {
  id: number;
  nome: string;
  email: string;
  rol: 'superadmin' | 'admin';
  pass_hash: string | null;
  totp: string | null;
  totp_paso: number;
  ultimo_acceso: string | null;
}
export interface Sesion {
  id_hash: string;
  admin_id: number;
  pendente_2fa: number;
  totp_novo: string | null;
  csrf: string;
}

export async function crearSesion(cookies: AstroCookies, adminId: number, segura: boolean) {
  const t = token(32);
  const csrf = token(24);
  const expira = new Date(Date.now() + DURACION_H * 3600_000).toISOString();
  await db().prepare('INSERT INTO sesions (id_hash, admin_id, pendente_2fa, csrf, expira) VALUES (?, ?, 1, ?, ?)').bind(await sha256(t), adminId, csrf, expira).run();
  cookies.set(COOKIE, t, { httpOnly: true, secure: segura, sameSite: 'strict', path: '/', maxAge: DURACION_H * 3600 });
  return { csrf };
}

export async function lerSesion(cookies: AstroCookies): Promise<{ sesion: Sesion; admin: Admin } | null> {
  const t = cookies.get(COOKIE)?.value;
  if (!t) return null;
  const idHash = await sha256(t);
  const sesion = await db().prepare("SELECT * FROM sesions WHERE id_hash = ? AND expira > strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(idHash).first<Sesion>();
  if (!sesion) return null;
  const admin = await db().prepare('SELECT * FROM admins WHERE id = ?').bind(sesion.admin_id).first<Admin>();
  if (!admin) return null;
  return { sesion, admin };
}

export async function pecharSesion(cookies: AstroCookies) {
  const t = cookies.get(COOKIE)?.value;
  if (t) await db().prepare('DELETE FROM sesions WHERE id_hash = ?').bind(await sha256(t)).run();
  cookies.delete(COOKIE, { path: '/' });
  await db().prepare("DELETE FROM sesions WHERE expira < strftime('%Y-%m-%dT%H:%M:%fZ','now')").run();
}

/** Datos públicos dun admin (nunca o hash nin o segredo) */
export const adminPublico = (a: Admin) => ({ id: a.id, nome: a.nome, email: a.email, rol: a.rol, ultimoAcceso: a.ultimo_acceso, con2fa: Boolean(a.totp) });
