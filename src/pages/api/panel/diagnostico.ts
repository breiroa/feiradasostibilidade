// Diagnóstico da web para o panel: versións e actualizacións, contas e accesos, contido (documentos non válidos,
// ligazóns internas rotas, imaxes que faltan ou sen descrición), base de datos e formulario de contacto.
// GET  → informe   ·   POST {accion: 'limpar'} → borra sesións caducadas, intentos vellos e versións antigas
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { db } from '../../../lib/datos';
import { esquemas, seccion, type Coleccion } from '../../../lib/esquemas';
import { conAdmin, erro, json, lerJson } from '../../../lib/panel/api';
import versions from '../../../data/versions.json';

export const prerender = false;

type Fila = { coleccion: string; id: string; datos: string };
type Aviso = { nivel: 'ok' | 'aviso' | 'erro' | 'info'; titulo: string; detalle?: string; lista?: string[] };

const RUTAS_FIXAS: Record<string, string> = { inicio: '/', feiralab: '/feiralab/', participa: '/participa/', actualidade: '/actualidade/', recursos: '/recursos/', edicions: '/edicions/' };
const CLAVES_MEDIA = ['imaxe', 'portada', 'logo', 'favicon', 'ficheiro', 'fondoImaxe'];

/** Última versión publicada en npm (ou null se non responde) */
async function ultima(nome: string): Promise<string | null> {
  try {
    const r = await fetch(`https://registry.npmjs.org/${nome.replace('/', '%2F')}/latest`, { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    return ((await r.json()) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}
const maior = (v: string | null) => Number(v?.split('.')[0] ?? 0);
const comparar = (a: string, b: string) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

/** Percorre un documento e chama a fn con cada (clave, valor) */
function percorrer(v: unknown, fn: (clave: string, valor: unknown, pai: Record<string, unknown> | null) => void, clave = '', pai: Record<string, unknown> | null = null) {
  fn(clave, v, pai);
  if (Array.isArray(v)) v.forEach((x) => percorrer(x, fn, clave, pai));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) percorrer(x, fn, k, v as Record<string, unknown>);
}

export const GET: APIRoute = conAdmin(async () => {
  const informe: Record<string, Aviso[]> = { actualizacions: [], seguridade: [], contido: [], datos: [], formulario: [] };

  // ── Versións e actualizacións ──
  const paquetes = Object.entries(versions.paquetes as Record<string, string | null>).filter(([n]) => !n.startsWith('@fontsource'));
  const ultimas = await Promise.all(paquetes.map(async ([n, v]) => [n, v, await ultima(n)] as const));
  for (const [n, v, u] of ultimas) {
    if (!v) continue;
    if (!u) informe.actualizacions.push({ nivel: 'info', titulo: `${n} ${v}`, detalle: 'Non se puido consultar a última versión.' });
    else if (comparar(v, u) >= 0) informe.actualizacions.push({ nivel: 'ok', titulo: `${n} ${v}`, detalle: 'Ao día.' });
    else informe.actualizacions.push({ nivel: maior(u) > maior(v) ? 'info' : 'aviso', titulo: `${n} ${v} → ${u}`, detalle: maior(u) > maior(v) ? 'Hai unha versión maior nova: pódese actualizar con calma (pode ter cambios importantes).' : 'Hai unha actualización menor: convén aplicala (correccións e seguridade).' });
  }
  const dias = versions.compatibilidade ? Math.round((Date.now() - Date.parse(versions.compatibilidade)) / 86400000) : null;
  informe.actualizacions.push({ nivel: dias !== null && dias > 365 ? 'aviso' : 'ok', titulo: `Plataforma Cloudflare Workers (compatibilidade ${versions.compatibilidade})`, detalle: dias !== null && dias > 365 ? 'Data de compatibilidade de hai máis dun ano: convén actualizala.' : 'Actualizada.' });
  informe.actualizacions.push({ nivel: 'info', titulo: `Versión publicada: ${versions.commit ?? '—'}`, detalle: `Compilada o ${versions.compilado.slice(0, 16).replace('T', ' ')} (UTC).` });

  // ── Contas e accesos ──
  const admins = (await db().prepare('SELECT nome, rol, pass_hash IS NOT NULL AS activa, totp IS NOT NULL AS con2fa, convite_expira, ultimo_acceso FROM admins').all<{ nome: string; rol: string; activa: number; con2fa: number; convite_expira: string | null; ultimo_acceso: string | null }>()).results;
  const sen2fa = admins.filter((a) => a.activa && !a.con2fa);
  const supers = admins.filter((a) => a.activa && a.rol === 'superadmin');
  informe.seguridade.push({ nivel: sen2fa.length ? 'erro' : 'ok', titulo: sen2fa.length ? `${sen2fa.length} conta(s) sen verificación en dous pasos` : 'Todas as contas teñen verificación en dous pasos', lista: sen2fa.map((a) => a.nome) });
  informe.seguridade.push({ nivel: supers.length === 1 ? 'aviso' : 'ok', titulo: `${supers.length} persoa(s) con superadministración`, detalle: supers.length === 1 ? 'Recoméndase ter polo menos dúas, por se unha perde o acceso.' : undefined });
  const inactivas = admins.filter((a) => a.activa && a.ultimo_acceso && Date.now() - Date.parse(`${a.ultimo_acceso}Z`) > 180 * 86400000);
  if (inactivas.length) informe.seguridade.push({ nivel: 'aviso', titulo: `${inactivas.length} conta(s) sen entrar hai máis de 6 meses`, detalle: 'Se xa non se usan, convén quitarlles o acceso (Administración).', lista: inactivas.map((a) => a.nome) });
  const caducados = admins.filter((a) => !a.activa && a.convite_expira && Date.parse(a.convite_expira) < Date.now());
  if (caducados.length) informe.seguridade.push({ nivel: 'info', titulo: `${caducados.length} convite(s) caducado(s) sen usar`, lista: caducados.map((a) => a.nome) });
  const agora = Math.floor(Date.now() / 1000);
  const fallos = (await db().prepare("SELECT COUNT(*) AS n FROM intentos WHERE clave LIKE 'login:%' AND ts > ?").bind(agora - 86400).first<{ n: number }>())?.n ?? 0;
  informe.seguridade.push({ nivel: fallos > 30 ? 'aviso' : 'ok', titulo: `${fallos} intento(s) de acceso fallidos nas últimas 24 h`, detalle: fallos > 30 ? 'Moitos intentos: alguén pode estar probando contrasinais. O panel bloquea 15 minutos tras 10 fallos.' : 'O panel bloquea 15 minutos tras 10 fallos por enderezo.' });
  const sesions = (await db().prepare("SELECT COUNT(*) AS n, SUM(expira < strftime('%Y-%m-%dT%H:%M:%fZ','now')) AS vellas FROM sesions").first<{ n: number; vellas: number }>()) ?? { n: 0, vellas: 0 };
  informe.seguridade.push({ nivel: 'info', titulo: `${sesions.n - (sesions.vellas ?? 0)} sesión(s) aberta(s) no panel`, detalle: sesions.vellas ? `${sesions.vellas} caducadas pódense limpar.` : undefined });
  informe.seguridade.push({ nivel: 'ok', titulo: 'Protección do panel', detalle: 'Contrasinais cifrados (PBKDF2), verificación en dous pasos obrigatoria, cookies seguras (HttpOnly, SameSite=Strict), comprobación de orixe e token CSRF en cada cambio, e límite de intentos.' });
  informe.seguridade.push({ nivel: 'ok', titulo: 'Contido limpo ao gardar', detalle: 'Os textos e o HTML libre límpanse no servidor (sen scripts nin eventos) e as imaxes e PDF compróbanse antes de gardalos.' });

  // ── Contido ──
  const filas = (await db().prepare('SELECT coleccion, id, datos FROM documentos').all<Fila>()).results;
  const docs = filas.map((f) => ({ ...f, d: JSON.parse(f.datos) as Record<string, unknown> }));
  const media = (await db().prepare('SELECT id, tipo, alt, bytes FROM media').all<{ id: string; tipo: string; alt: string | null; bytes: number }>()).results;
  const mediaIds = new Set(media.map((m) => m.id));

  // Documentos ou seccións que non pasan a validación (non se ven ben na web)
  const malos: string[] = [];
  for (const x of docs) {
    const esq = esquemas[x.coleccion as Coleccion];
    if (!esq || x.coleccion === 'paxinas') continue;
    const datos = structuredClone(x.d);
    if (Array.isArray(datos.seccions)) {
      for (const s of datos.seccions as Record<string, unknown>[]) if (!seccion.safeParse(s).success) malos.push(`${x.coleccion}/${x.id}: sección «${s.tipo}» con datos incompletos (non se mostra)`);
      datos.seccions = [];
    }
    const r = esq.safeParse(datos);
    if (!r.success) malos.push(`${x.coleccion}/${x.id}: ${r.error.issues.slice(0, 2).map((i) => `${i.path.join('›')} ${i.message}`).join('; ')}`);
  }
  informe.contido.push({ nivel: malos.length ? 'erro' : 'ok', titulo: malos.length ? `${malos.length} contido(s) con datos incompletos` : 'Todos os contidos son válidos', lista: malos.slice(0, 30) });

  // Rutas que existen na web
  const rutas = new Set<string>(['/', '/actualidade/', '/recursos/', '/edicions/', '/participa/', '/feiralab/']);
  for (const x of docs) {
    if (x.coleccion === 'paxinas_libres' && !x.d.borrador) rutas.add(RUTAS_FIXAS[x.id] ?? (x.d.nai ? `/${x.d.nai}/${x.id}/` : `/${x.id}/`));
    if (x.coleccion === 'noticias' && !x.d.borrador) rutas.add(`/actualidade/${x.id}/`);
    if (x.coleccion === 'recursos' && !x.d.borrador) rutas.add(`/recursos/${x.id}/`);
  }
  const paxs = new Map(docs.filter((x) => x.coleccion === 'paxinas_libres').map((x) => [x.id, x.d]));
  const rotas: string[] = [];
  const faltan: string[] = [];
  const nome = (x: (typeof docs)[number]) => `${x.coleccion === 'paxinas_libres' ? 'Páxina' : x.coleccion} «${(x.d.titulo ?? x.d.nome ?? x.id) as string}»`;
  for (const x of docs) {
    percorrer(x.d, (clave, v, pai) => {
      if (typeof v !== 'string') return;
      // Ligazóns internas (botóns, tarxetas, menús)
      if (clave === 'url' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/media/') && !v.startsWith('/api/')) {
        const ruta = v.split(/[?#]/)[0].replace(/\/?$/, '/');
        if (!rutas.has(ruta)) rotas.push(`${nome(x)} → ${v}`);
      }
      // Páxinas nos menús
      if (clave === 'paxina' && pai?.tipo === 'paxina' && x.coleccion === 'menus') {
        const p = paxs.get(v);
        if (!p) rotas.push(`Menú «${x.d.nome as string}» → páxina «${v}» que non existe`);
        else if (p.borrador) rotas.push(`Menú «${x.d.nome as string}» → «${p.titulo as string}» está en borrador (non sae)`);
      }
      // Imaxes e ficheiros
      if (CLAVES_MEDIA.includes(clave) && /^[a-z0-9-]{3,80}$/.test(v) && !mediaIds.has(v)) faltan.push(`${nome(x)} → ${clave}: ${v}`);
    });
  }
  informe.contido.push({ nivel: rotas.length ? 'aviso' : 'ok', titulo: rotas.length ? `${rotas.length} ligazón(s) interna(s) rota(s)` : 'Sen ligazóns internas rotas', lista: rotas.slice(0, 30) });
  informe.contido.push({ nivel: faltan.length ? 'erro' : 'ok', titulo: faltan.length ? `${faltan.length} imaxe(s) ou ficheiro(s) que xa non existen` : 'Todas as imaxes e ficheiros usados existen', lista: faltan.slice(0, 30) });
  const senAlt = media.filter((m) => m.tipo.startsWith('image/') && !m.alt);
  informe.contido.push({ nivel: senAlt.length ? 'aviso' : 'ok', titulo: senAlt.length ? `${senAlt.length} imaxe(s) da biblioteca sen descrición` : 'Todas as imaxes teñen descrición', detalle: senAlt.length ? 'A descrición axuda ás persoas que usan lectores de pantalla e aos buscadores (Biblioteca › Editar).' : undefined });
  const senDesc = docs.filter((x) => x.coleccion === 'paxinas_libres' && !x.d.borrador && !x.d.descricion);
  informe.contido.push({ nivel: senDesc.length ? 'info' : 'ok', titulo: senDesc.length ? `${senDesc.length} páxina(s) sen descrición para buscadores` : 'Todas as páxinas teñen descrición', lista: senDesc.map((x) => x.d.titulo as string).slice(0, 30) });
  const borradores = docs.filter((x) => ['paxinas_libres', 'noticias', 'recursos'].includes(x.coleccion) && x.d.borrador);
  if (borradores.length) informe.contido.push({ nivel: 'info', titulo: `${borradores.length} borrador(es) sen publicar`, lista: borradores.map((x) => nome(x)).slice(0, 30) });

  // ── Base de datos ──
  const tam = await db().prepare('SELECT COUNT(*) AS n FROM versions').first<{ n: number }>();
  const meta = (await db().prepare('SELECT 1').run()).meta as { size_after?: number };
  const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
  const bytesMedia = media.reduce((s, m) => s + (m.bytes ?? 0), 0);
  informe.datos.push({ nivel: meta.size_after && meta.size_after > 4e9 ? 'aviso' : 'ok', titulo: `Base de datos: ${meta.size_after ? mb(meta.size_after) : '—'} de 5 GB (plan gratuíto)`, detalle: `${docs.length} documentos, ${media.length} imaxes e ficheiros (${mb(bytesMedia)}), ${tam?.n ?? 0} versións no historial.` });
  informe.datos.push({ nivel: 'ok', titulo: 'Copias de seguridade', detalle: 'Cloudflare garda copias automáticas da base de datos dos últimos 7 días (Time Travel). Ademais, en Axustes pódese descargar unha copia, e cada contido ten o seu historial de versións e a papeleira.' });

  // ── Formulario de contacto ──
  const correo = Boolean((env as unknown as { CORREO?: unknown; CORREO_DESTINO?: string }).CORREO && (env as unknown as { CORREO_DESTINO?: string }).CORREO_DESTINO);
  const ins = (await db().prepare("SELECT COUNT(*) AS n, SUM(estado = 'nova') AS novas FROM inscricions").first<{ n: number; novas: number }>()) ?? { n: 0, novas: 0 };
  informe.formulario.push({ nivel: correo ? 'ok' : 'aviso', titulo: correo ? 'As mensaxes do formulario envíanse por correo' : 'O envío por correo das mensaxes aínda non está activado', detalle: correo ? undefined : 'Mentres tanto, as mensaxes gárdanse aquí. Para recibilas por correo hai que activar «Email Routing» en Cloudflare (ver as instrucións).' });
  informe.formulario.push({ nivel: ins.novas ? 'aviso' : 'ok', titulo: `${ins.n} mensaxe(s) gardada(s)${ins.novas ? `, ${ins.novas} sen ler` : ''}` });

  return json({ ok: true, informe, xerado: new Date().toISOString() });
});

export const POST: APIRoute = conAdmin(async ({ request }) => {
  const b = await lerJson<{ accion?: string }>(request);
  if (b.accion !== 'limpar') return erro('Acción descoñecida.');
  const agora = Math.floor(Date.now() / 1000);
  const r = await db().batch([
    db().prepare("DELETE FROM sesions WHERE expira < strftime('%Y-%m-%dT%H:%M:%fZ','now')"),
    db().prepare('DELETE FROM intentos WHERE ts < ?').bind(agora - 7 * 86400),
  ]);
  return json({ ok: true, borrados: r.reduce((s, x) => s + (x.meta.changes ?? 0), 0) });
});
