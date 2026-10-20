// Axudas comúns da API do panel: respostas JSON e control de acceso.
import type { APIContext } from 'astro';
import { lerSesion, iguais, type Admin, type Sesion } from './seguridade';

export const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

export const erro = (mensaxe: string | string[], status = 400) =>
  json({ ok: false, erros: Array.isArray(mensaxe) ? mensaxe : [mensaxe] }, status);

export async function lerJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

/** As peticións que modifican datos deben vir desta mesma web */
export function mesmaOrixe(ctx: APIContext) {
  const orixe = ctx.request.headers.get('Origin');
  return !orixe || orixe === ctx.url.origin;
}

export const conexionSegura = (ctx: APIContext) => ctx.url.protocol === 'https:';

type Contexto = { admin: Admin; sesion: Sesion };

/**
 * Envolve un manexador da API que require sesión completa (contrasinal + 2FA).
 * En peticións que modifican datos comproba tamén a orixe e o token CSRF.
 */
export function conAdmin(fn: (ctx: APIContext, s: Contexto) => Promise<Response>, opcions: { superadmin?: boolean } = {}) {
  return async (ctx: APIContext) => {
    const s = await lerSesion(ctx.cookies);
    if (!s || s.sesion.pendente_2fa) return erro('Sesión caducada. Volve entrar.', 401);
    if (ctx.request.method !== 'GET') {
      if (!mesmaOrixe(ctx)) return erro('Orixe non permitida.', 403);
      const csrf = ctx.request.headers.get('X-CSRF') ?? '';
      if (!iguais(csrf, s.sesion.csrf)) return erro('Token de seguridade non válido. Recarga a páxina.', 403);
    }
    if (opcions.superadmin && s.admin.rol !== 'superadmin') return erro('Só as persoas superadministradoras poden facer isto.', 403);
    return fn(ctx, s);
  };
}

/** Converte un texto en identificador para URLs: "Ola Mundo!" → "ola-mundo" */
export const slug = (t: string) =>
  t
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'elemento';
