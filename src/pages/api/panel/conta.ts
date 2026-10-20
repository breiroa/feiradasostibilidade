// A miña conta: cambiar contrasinal e restablecer o propio 2FA.
import type { APIRoute } from 'astro';
import { db } from '../../../lib/datos';
import { conAdmin, erro, json, lerJson } from '../../../lib/panel/api';
import { hashContrasinal, MIN_CONTRASINAL, verificarContrasinal } from '../../../lib/panel/seguridade';

export const prerender = false;

export const POST: APIRoute = conAdmin(async ({ request }, { admin, sesion }) => {
  const b = await lerJson<Record<string, string>>(request);
  if (b.accion === 'cambiar-contrasinal') {
    if (!(await verificarContrasinal(b.actual ?? '', admin.pass_hash))) return erro('O contrasinal actual non é correcto.', 401);
    if ((b.nova ?? '').length < MIN_CONTRASINAL) return erro(`O novo contrasinal debe ter polo menos ${MIN_CONTRASINAL} caracteres.`);
    await db().batch([
      db().prepare('UPDATE admins SET pass_hash = ? WHERE id = ?').bind(await hashContrasinal(b.nova), admin.id),
      // Pecha as outras sesións abertas desta persoa
      db().prepare('DELETE FROM sesions WHERE admin_id = ? AND id_hash != ?').bind(admin.id, sesion.id_hash),
    ]);
    return json({ ok: true });
  }
  if (b.accion === 'restablecer-2fa') {
    if (!(await verificarContrasinal(b.actual ?? '', admin.pass_hash))) return erro('O contrasinal non é correcto.', 401);
    await db().batch([
      db().prepare('UPDATE admins SET totp = NULL, totp_paso = 0 WHERE id = ?').bind(admin.id),
      db().prepare('DELETE FROM sesions WHERE admin_id = ? AND id_hash != ?').bind(admin.id, sesion.id_hash),
      db().prepare('UPDATE sesions SET pendente_2fa = 1 WHERE id_hash = ?').bind(sesion.id_hash),
    ]);
    return json({ ok: true, estado: 'activar-2fa' });
  }
  return erro('Acción descoñecida.');
});
