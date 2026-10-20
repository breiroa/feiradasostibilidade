// Acceso ao panel: primeira configuración, entrar, código 2FA, activar 2FA, convites e saír.
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { conexionSegura, erro, json, lerJson, mesmaOrixe } from '../../../lib/panel/api';
import {
  adminPublico, crearSesion, demasiadosIntentos, hashContrasinal, lerSesion, MIN_CONTRASINAL, novoSegredoTotp, otpauth,
  pecharSesion, rexistrarIntento, sha256, verificarContrasinal, verificarTotp, type Admin,
} from '../../../lib/panel/seguridade';

export const prerender = false;

const ip = (r: Request) => r.headers.get('CF-Connecting-IP') ?? 'local';
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function hayAdmins() {
  const r = await db().prepare('SELECT COUNT(*) AS n FROM admins WHERE pass_hash IS NOT NULL').first<{ n: number }>();
  return (r?.n ?? 0) > 0;
}

/** Estado actual: que pantalla ten que mostrar o panel */
export const GET: APIRoute = async ({ cookies }) => {
  const s = await lerSesion(cookies);
  if (s && !s.sesion.pendente_2fa) return json({ estado: 'dentro', csrf: s.sesion.csrf, admin: adminPublico(s.admin) });
  if (s) return json({ estado: s.admin.totp ? 'codigo' : 'activar-2fa', email: s.admin.email });
  return json({ estado: (await hayAdmins()) ? 'entrar' : 'configuracion' });
};

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrixe(ctx)) return erro('Orixe non permitida.', 403);
  const { request, cookies } = ctx;
  const b = await lerJson<Record<string, string>>(request);
  const accion = b.accion;
  const segura = conexionSegura(ctx);
  const claveIp = `login:${ip(request)}`;

  // Límite xeral para todas as accións de acceso: 10 fallos cada 15 minutos por IP
  if (accion !== 'sair' && (await demasiadosIntentos(claveIp, 10, 900))) {
    return erro('Demasiados intentos. Agarda uns minutos e proba de novo.', 429);
  }
  const fallo = async (msx: string, status = 400) => {
    await rexistrarIntento(claveIp);
    await new Promise((r) => setTimeout(r, 300));
    return erro(msx, status);
  };

  switch (accion) {
    case 'crear-primeiro': {
      if (await hayAdmins()) return erro('O panel xa está configurado.', 409);
      const nome = (b.nome ?? '').trim(), email = (b.email ?? '').trim().toLowerCase(), pw = b.contrasinal ?? '';
      if (!nome || !emailValido(email)) return erro('Indica nome e un correo válido.');
      if (pw.length < MIN_CONTRASINAL) return erro(`O contrasinal debe ter polo menos ${MIN_CONTRASINAL} caracteres.`);
      await db().prepare('DELETE FROM admins WHERE pass_hash IS NULL AND email = ?').bind(email).run();
      const r = await db().prepare("INSERT INTO admins (nome, email, rol, pass_hash) VALUES (?, ?, 'superadmin', ?)").bind(nome, email, await hashContrasinal(pw)).run();
      await crearSesion(cookies, Number(r.meta.last_row_id), segura);
      return json({ estado: 'activar-2fa', email });
    }

    case 'entrar': {
      const email = (b.email ?? '').trim().toLowerCase();
      const a = await db().prepare('SELECT * FROM admins WHERE email = ?').bind(email).first<Admin>();
      if (!a || !(await verificarContrasinal(b.contrasinal ?? '', a.pass_hash))) return fallo('Correo ou contrasinal incorrectos.', 401);
      await crearSesion(cookies, a.id, segura);
      return json({ estado: a.totp ? 'codigo' : 'activar-2fa', email: a.email });
    }

    case 'codigo': {
      const s = await lerSesion(cookies);
      if (!s || !s.admin.totp) return erro('Sesión caducada. Volve entrar.', 401);
      const paso = await verificarTotp(s.admin.totp, b.codigo ?? '', s.admin.totp_paso);
      if (!paso) return fallo('Código incorrecto ou caducado.', 401);
      await db().batch([
        db().prepare("UPDATE admins SET totp_paso = ?, ultimo_acceso = datetime('now') WHERE id = ?").bind(paso, s.admin.id),
        db().prepare('UPDATE sesions SET pendente_2fa = 0 WHERE id_hash = ?').bind(s.sesion.id_hash),
      ]);
      return json({ estado: 'dentro' });
    }

    case 'iniciar-2fa': {
      const s = await lerSesion(cookies);
      if (!s || s.admin.totp) return erro('Sesión caducada. Volve entrar.', 401);
      const segredo = novoSegredoTotp();
      await db().prepare('UPDATE sesions SET totp_novo = ? WHERE id_hash = ?').bind(segredo, s.sesion.id_hash).run();
      return json({ segredo, otpauth: otpauth(segredo, s.admin.email) });
    }

    case 'activar-2fa': {
      const s = await lerSesion(cookies);
      if (!s || s.admin.totp || !s.sesion.totp_novo) return erro('Sesión caducada. Volve entrar.', 401);
      const paso = await verificarTotp(s.sesion.totp_novo, b.codigo ?? '');
      if (!paso) return fallo('O código non coincide. Comproba a hora do teléfono e proba co seguinte.', 401);
      await db().batch([
        db().prepare("UPDATE admins SET totp = ?, totp_paso = ?, ultimo_acceso = datetime('now') WHERE id = ?").bind(s.sesion.totp_novo, paso, s.admin.id),
        db().prepare('UPDATE sesions SET pendente_2fa = 0, totp_novo = NULL WHERE id_hash = ?').bind(s.sesion.id_hash),
      ]);
      return json({ estado: 'dentro' });
    }

    case 'ver-convite': {
      const a = await db().prepare("SELECT nome, email FROM admins WHERE convite_hash = ? AND convite_expira > datetime('now')").bind(await sha256(b.token ?? '')).first<{ nome: string; email: string }>();
      if (!a) return fallo('O convite non é válido ou caducou. Pide un novo.', 404);
      return json({ nome: a.nome, email: a.email });
    }

    case 'aceptar-convite': {
      const pw = b.contrasinal ?? '';
      if (pw.length < MIN_CONTRASINAL) return erro(`O contrasinal debe ter polo menos ${MIN_CONTRASINAL} caracteres.`);
      const a = await db().prepare("SELECT * FROM admins WHERE convite_hash = ? AND convite_expira > datetime('now')").bind(await sha256(b.token ?? '')).first<Admin>();
      if (!a) return fallo('O convite non é válido ou caducou. Pide un novo.', 404);
      await db().prepare('UPDATE admins SET pass_hash = ?, totp = NULL, convite_hash = NULL, convite_expira = NULL WHERE id = ?').bind(await hashContrasinal(pw), a.id).run();
      await db().prepare('DELETE FROM sesions WHERE admin_id = ?').bind(a.id).run();
      await crearSesion(cookies, a.id, segura);
      return json({ estado: 'activar-2fa', email: a.email });
    }

    case 'sair':
      await pecharSesion(cookies);
      return json({ estado: (await hayAdmins()) ? 'entrar' : 'configuracion' });

    default:
      return erro('Acción descoñecida.');
  }
};
