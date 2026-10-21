// Persoas administradoras (só superadministración): listar, convidar, restablecer 2FA, quitar.
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { conAdmin, erro, json, lerJson } from '../../../lib/panel/api';
import { sha256, token, type Admin } from '../../../lib/panel/seguridade';
import { enviarAcceso, enviarConvite, mensaxeAcceso, mensaxeBenvida, mensaxeConvite } from '../../../lib/correo';

export const prerender = false;

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function novoConvite(id: number, orixe: string) {
  const t = token(32);
  await db().prepare("UPDATE admins SET convite_hash = ?, convite_expira = datetime('now', '+7 days') WHERE id = ?").bind(await sha256(t), id).run();
  return `${orixe}/panel/?convite=${t}`;
}

export const GET: APIRoute = conAdmin(
  async () => {
    const { results } = await db().prepare('SELECT * FROM admins ORDER BY creado').all<Admin & { convite_expira: string | null; creado: string }>();
    return json({
      ok: true,
      items: results.map((a) => ({
        id: a.id, nome: a.nome, email: a.email, rol: a.rol, ultimoAcceso: a.ultimo_acceso, creado: a.creado,
        estado: !a.pass_hash ? 'convidada' : !a.totp ? 'sen-2fa' : 'activa',
        conviteCaduca: a.convite_expira,
      })),
    });
  },
  { superadmin: true },
);

export const POST: APIRoute = conAdmin(
  async ({ request, url }, { admin }) => {
    const b = await lerJson<Record<string, string>>(request);
    switch (b.accion) {
      case 'convidar': {
        const nome = (b.nome ?? '').trim(), email = (b.email ?? '').trim().toLowerCase();
        const rol = b.rol === 'superadmin' ? 'superadmin' : 'admin';
        if (!nome || !emailValido(email)) return erro('Indica nome e un correo válido.');
        if (await db().prepare('SELECT 1 FROM admins WHERE email = ?').bind(email).first()) return erro('Xa hai unha persoa con ese correo.', 409);
        const r = await db().prepare('INSERT INTO admins (nome, email, rol) VALUES (?, ?, ?)').bind(nome, email, rol).run();
        const ligazon = await novoConvite(Number(r.meta.last_row_id), url.origin);
        const enviado = await enviarConvite(email, nome, ligazon, rol === 'superadmin').catch(() => false);
        // A mensaxe vai tamén na resposta, para enviala desde o propio correo se o envío automático non está activado
        return json({ ok: true, ligazon, enviado, email, nome, correo: mensaxeConvite(nome, ligazon, rol === 'superadmin') });
      }
      case 'novo-convite': {
        const a = await db().prepare('SELECT id, nome, email, rol, pass_hash FROM admins WHERE id = ?').bind(Number(b.id)).first<{ id: number; nome: string; email: string; rol: string; pass_hash: string | null }>();
        if (!a) return erro('Non existe.', 404);
        // Tamén serve para que alguén que esqueceu o contrasinal defina un novo
        const ligazon = await novoConvite(a.id, url.origin);
        // Convite pendente: o convite de sempre; conta xa activa: ligazón para un contrasinal novo
        const pendente = !a.pass_hash;
        const correo = pendente ? mensaxeConvite(a.nome, ligazon, a.rol === 'superadmin') : mensaxeAcceso(a.nome, ligazon);
        const enviado = await (pendente ? enviarConvite(a.email, a.nome, ligazon, a.rol === 'superadmin') : enviarAcceso(a.email, a.nome, ligazon)).catch(() => false);
        return json({ ok: true, ligazon, enviado, email: a.email, nome: a.nome, correo });
      }
      case 'benvida': {
        const a = await db().prepare('SELECT nome, email, rol FROM admins WHERE id = ?').bind(Number(b.id)).first<{ nome: string; email: string; rol: string }>();
        if (!a) return erro('Non existe.', 404);
        return json({ ok: true, email: a.email, nome: a.nome, correo: mensaxeBenvida(a.nome, a.rol === 'superadmin') });
      }
      case 'restablecer-2fa': {
        await db().batch([
          db().prepare('UPDATE admins SET totp = NULL, totp_paso = 0 WHERE id = ?').bind(Number(b.id)),
          db().prepare('DELETE FROM sesions WHERE admin_id = ?').bind(Number(b.id)),
        ]);
        return json({ ok: true });
      }
      case 'rol': {
        if (Number(b.id) === admin.id) return erro('Non podes cambiar o teu propio rol.');
        await db().prepare('UPDATE admins SET rol = ? WHERE id = ?').bind(b.rol === 'superadmin' ? 'superadmin' : 'admin', Number(b.id)).run();
        return json({ ok: true });
      }
      default:
        return erro('Acción descoñecida.');
    }
  },
  { superadmin: true },
);

export const DELETE: APIRoute = conAdmin(
  async ({ request }, { admin }) => {
    const b = await lerJson<{ id?: number }>(request);
    const id = Number(b.id);
    if (id === admin.id) return erro('Non te podes quitar a ti mesma/o.');
    const sup = await db().prepare("SELECT COUNT(*) AS n FROM admins WHERE rol = 'superadmin' AND id != ? AND pass_hash IS NOT NULL").bind(id).first<{ n: number }>();
    if (!sup?.n) return erro('Debe quedar polo menos unha persoa superadministradora.');
    await db().batch([db().prepare('DELETE FROM sesions WHERE admin_id = ?').bind(id), db().prepare('DELETE FROM admins WHERE id = ?').bind(id)]);
    return json({ ok: true });
  },
  { superadmin: true },
);
