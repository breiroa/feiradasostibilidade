// «Diagnóstico»: estado e seguridade da web. Comproba actualizacións, cabeceiras de seguridade, contas,
// contidos (datos incompletos, ligazóns rotas, imaxes), base de datos e o formulario de contacto.
import { api, aviso, el, gardar } from './nucleo.js';

const cab = (titulo, intro, ...extra) => el('div', { class: 'cab' }, el('div', {}, el('h1', {}, titulo), intro ? el('p', { class: 'muted' }, intro) : null), ...extra);
const ICONAS = { ok: '✓', aviso: '!', erro: '✕', info: 'i' };
const TITULOS = { seguridade: 'Seguridade e accesos', actualizacions: 'Actualizacións', contido: 'Contido', datos: 'Datos e copias', formulario: 'Formulario de contacto' };

/** Cabeceiras de seguridade da web pública (compróbanse desde o navegador) */
async function cabeceiras() {
  const avisos = [];
  try {
    const r = await fetch(`/?diagnostico=${Date.now()}`, { cache: 'no-store' });
    const h = r.headers;
    const req = [
      ['Content-Security-Policy', 'Política de seguridade de contido (CSP): impide cargar scripts alleos'],
      ['Strict-Transport-Security', 'HTTPS obrigatorio (HSTS)'],
      ['X-Content-Type-Options', 'Sen adiviñar tipos de ficheiro (nosniff)'],
      ['Referrer-Policy', 'Política de referencias'],
      ['Permissions-Policy', 'Sen acceso a cámara, micrófono nin localización'],
    ];
    const faltan = req.filter(([n]) => !h.get(n));
    avisos.push({ nivel: faltan.length ? 'erro' : 'ok', titulo: faltan.length ? `Faltan ${faltan.length} cabeceira(s) de seguridade na web` : 'Cabeceiras de seguridade da web correctas', lista: (faltan.length ? faltan : req).map(([n, t]) => `${n}: ${t}`) });
    const csp = h.get('Content-Security-Policy') ?? '';
    if (csp && /script-src[^;]*'unsafe-inline'/.test(csp)) avisos.push({ nivel: 'aviso', titulo: 'A CSP permite scripts en liña', detalle: 'Sería mellor permitir só os scripts propios.' });
    if (csp && /frame-ancestors 'self'/.test(csp)) avisos.push({ nivel: 'ok', titulo: 'A web non se pode incrustar noutras webs (protección contra clickjacking)' });
    avisos.push({ nivel: location.protocol === 'https:' ? 'ok' : 'info', titulo: location.protocol === 'https:' ? 'Conexión cifrada (HTTPS)' : 'Proba local sen HTTPS' });
  } catch {
    avisos.push({ nivel: 'aviso', titulo: 'Non se puideron comprobar as cabeceiras da web' });
  }
  return avisos;
}

function bloque(titulo, avisos) {
  const orde = { erro: 0, aviso: 1, info: 2, ok: 3 };
  return el('section', { class: 'diag-bloque' },
    el('h2', {}, titulo),
    el('ul', { class: 'diag-lista' }, [...avisos].sort((a, b) => orde[a.nivel] - orde[b.nivel]).map((a) => el('li', { class: `diag-${a.nivel}` },
      el('span', { class: 'diag-icona', 'aria-hidden': 'true' }, ICONAS[a.nivel]),
      el('div', {},
        el('b', {}, a.titulo),
        a.detalle ? el('p', { class: 'muted' }, a.detalle) : null,
        a.lista?.length ? el('details', {}, el('summary', {}, `Ver ${a.lista.length}`), el('ul', {}, a.lista.map((x) => el('li', {}, x)))) : null)))));
}

export async function diagnostico(main) {
  main.replaceChildren(cab('Diagnóstico', 'Comprobando a web…'), el('p', { class: 'muted' }, 'Isto leva uns segundos (consúltanse as últimas versións publicadas).'));
  const [{ informe, xerado }, cabs] = await Promise.all([api('diagnostico'), cabeceiras()]);
  informe.seguridade = [...cabs, ...informe.seguridade];
  const todos = Object.values(informe).flat();
  const erros = todos.filter((a) => a.nivel === 'erro').length;
  const avisos = todos.filter((a) => a.nivel === 'aviso').length;
  const resumo = el('div', { class: `diag-resumo ${erros ? 'erro' : avisos ? 'aviso' : 'ok'}` },
    el('b', {}, erros ? `${erros} problema(s) que convén arranxar` : avisos ? `Todo funciona, con ${avisos} aviso(s)` : 'Todo en orde'),
    el('span', {}, `Comprobado o ${new Date(xerado).toLocaleString('gl')}`));
  main.replaceChildren(
    cab('Diagnóstico', 'Estado e seguridade da web: actualizacións, accesos, contidos e datos.',
      el('div', { style: { display: 'flex', gap: '8px' } },
        el('button', { type: 'button', class: 'btn-ghost', onclick: async () => { const r = await gardar(() => api('diagnostico', { metodo: 'POST', datos: { accion: 'limpar' } }), { mensaxe: null }); aviso(`Limpeza feita (${r.borrados} rexistros vellos)`); diagnostico(main); } }, 'Limpar sesións e rexistros vellos'),
        el('button', { type: 'button', class: 'btn', onclick: () => diagnostico(main) }, 'Comprobar de novo'))),
    resumo,
    ...['seguridade', 'actualizacions', 'contido', 'datos', 'formulario'].map((k) => bloque(TITULOS[k], informe[k] ?? [])),
    el('div', { class: 'caixa' },
      el('h2', {}, 'Mensaxes do formulario'),
      el('p', { class: 'muted' }, 'Copia de todo o que chega desde o formulario de contacto.'),
      el('a', { class: 'btn-ghost', href: '#/mensaxes' }, 'Ver as mensaxes')),
    el('details', { class: 'caixa' },
      el('summary', {}, el('b', {}, 'Como activar o envío de correos (gratis, con Brevo)')),
      el('ol', { class: 'pasos' },
        el('li', {}, 'Crea unha conta gratuíta en brevo.com (300 correos ao día).'),
        el('li', {}, 'En Brevo › Senders, Domains & Dedicated IPs › Domains, engade feiradasostibilidade.com e copia as entradas DNS que che indica en Cloudflare (DNS). Así os correos non van ao spam.'),
        el('li', {}, 'En Brevo › SMTP & API › API keys, crea unha clave.'),
        el('li', {}, 'En Cloudflare › Workers › feiradasostibilidade › Settings › Variables and Secrets, engade dous valores de tipo «Secret»: BREVO_API_KEY (a clave) e CORREO_REMITENTE (o enderezo que envía, do dominio verificado: p. ex. ola@feiradasostibilidade.com).'),
        el('li', {}, 'En Axustes › Contactos e redes, escribe o correo que recibirá as mensaxes do formulario.'))),
    el('details', { class: 'caixa' },
      el('summary', {}, el('b', {}, 'Como se actualiza a web')),
      el('p', {}, 'A web non usa WordPress nin complementos: é código propio que se compila e se publica en Cloudflare. As actualizacións aplícanse actualizando os paquetes, comprobando a web e volvendo publicar. Este diagnóstico avisa cando hai versións novas.')),
  );
}
