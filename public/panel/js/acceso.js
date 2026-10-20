// Pantallas de acceso: primeira configuración, entrar, código 2FA, activar 2FA e convite.
import { api, el } from './nucleo.js';

const app = () => document.getElementById('app');
const MIN = 12;

function tarxeta(titulo, intro, corpo, { ancha = false } = {}) {
  app().replaceChildren(
    el('div', { class: 'acceso' },
      el('div', { class: `acceso-card${ancha ? ' ancha' : ''}` },
        el('div', { class: 'acceso-marca' }, el('img', { src: '/logo-feira.png', alt: '' }), 'Feira da Sostibilidade · Panel'),
        el('h1', {}, titulo),
        intro ? el('p', { class: 'muted' }, intro) : null,
        corpo)),
  );
}

/** Formulario de acceso xenérico: campos [{nome, etiqueta, tipo, autocomplete}] */
function formulario(campos, boton, enviar) {
  const erro = el('p', { class: 'form-err', role: 'alert', hidden: true });
  const btn = el('button', { class: 'btn', type: 'submit' }, boton);
  const f = el('form', {
    novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      erro.hidden = true;
      btn.disabled = true;
      const datos = Object.fromEntries(new FormData(f).entries());
      try {
        await enviar(datos);
      } catch (ex) {
        erro.textContent = ex.erros ? ex.erros.join(' ') : ex.message;
        erro.hidden = false;
        btn.disabled = false;
      }
    },
  },
  campos.map((c) => [
    el('label', { for: `a-${c.nome}` }, c.etiqueta),
    el('input', { id: `a-${c.nome}`, name: c.nome, type: c.tipo ?? 'text', autocomplete: c.autocomplete, required: true, inputmode: c.inputmode, maxlength: c.max, class: c.clase, value: c.valor ?? '' }),
  ]),
  erro, btn);
  setTimeout(() => f.querySelector('input')?.focus(), 50);
  return f;
}

const postAuth = (datos) => api('auth', { metodo: 'POST', datos });

export function pantallaConfiguracion(seguinte) {
  tarxeta('Benvida/o ao panel', 'Aínda non hai ningunha conta. Crea a túa: serás a persoa superadministradora e poderás convidar a outras.',
    formulario([
      { nome: 'nome', etiqueta: 'O teu nome', autocomplete: 'name' },
      { nome: 'email', etiqueta: 'Correo electrónico', tipo: 'email', autocomplete: 'email' },
      { nome: 'contrasinal', etiqueta: `Contrasinal (mínimo ${MIN} caracteres)`, tipo: 'password', autocomplete: 'new-password' },
    ], 'Crear a conta', async (d) => seguinte(await postAuth({ accion: 'crear-primeiro', ...d }))));
}

export function pantallaEntrar(seguinte) {
  tarxeta('Entrar', 'Acceso para as persoas que xestionan a web.',
    el('div', {},
      formulario([
        { nome: 'email', etiqueta: 'Correo electrónico', tipo: 'email', autocomplete: 'username' },
        { nome: 'contrasinal', etiqueta: 'Contrasinal', tipo: 'password', autocomplete: 'current-password' },
      ], 'Entrar', async (d) => seguinte(await postAuth({ accion: 'entrar', ...d }))),
      el('p', { class: 'muted', style: { marginTop: '16px', fontSize: '.85rem' } }, 'Esqueciches o contrasinal? Pídelle a unha persoa superadministradora unha nova ligazón de acceso.')));
}

export function pantallaCodigo(seguinte, email) {
  tarxeta('Código de verificación', `Abre a app de autenticación do teu teléfono e escribe o código de 6 díxitos para ${email ?? 'a túa conta'}.`,
    formulario([{ nome: 'codigo', etiqueta: 'Código', inputmode: 'numeric', autocomplete: 'one-time-code', max: 6, clase: 'codigo-input' }], 'Verificar',
      async (d) => seguinte(await postAuth({ accion: 'codigo', ...d }))));
}

export async function pantallaActivar2fa(seguinte) {
  const { segredo, otpauth } = await postAuth({ accion: 'iniciar-2fa' });
  const qr = el('div', { class: 'qr' });
  try {
    const q = window.qrcode(0, 'M');
    q.addData(otpauth);
    q.make();
    qr.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  } catch {
    qr.append(el('p', { class: 'muted' }, 'Non se puido debuxar o QR: usa a chave manual.'));
  }
  tarxeta('Activa a verificación en dous pasos', 'É obrigatoria para protexer a web. Só tes que facelo unha vez.',
    el('div', {},
      el('ol', { class: 'pasos' },
        el('li', {}, 'Instala no teléfono unha app de autenticación (Google Authenticator, Microsoft Authenticator, Aegis…).'),
        el('li', {}, 'Escanea este código QR coa app.'),
        el('li', {}, 'Escribe abaixo o código de 6 díxitos que aparece.')),
      qr,
      el('p', { class: 'chave' }, 'Se non podes escanear, introduce esta chave á man:', el('code', {}, segredo.replace(/(.{4})/g, '$1 ').trim())),
      formulario([{ nome: 'codigo', etiqueta: 'Código da app', inputmode: 'numeric', autocomplete: 'one-time-code', max: 6, clase: 'codigo-input' }], 'Activar e entrar',
        async (d) => seguinte(await postAuth({ accion: 'activar-2fa', ...d })))),
    { ancha: true });
}

export async function pantallaConvite(token, seguinte) {
  let info;
  try {
    info = await postAuth({ accion: 'ver-convite', token });
  } catch (e) {
    tarxeta('Convite non válido', e.erros?.join(' ') ?? 'Este convite xa non é válido.', el('a', { class: 'btn', href: '/panel/' }, 'Ir ao panel'));
    return;
  }
  tarxeta(`Ola, ${info.nome}`, `Define o teu contrasinal para entrar no panel con ${info.email}. Despois activarás a verificación en dous pasos.`,
    formulario([
      { nome: 'contrasinal', etiqueta: `Novo contrasinal (mínimo ${MIN} caracteres)`, tipo: 'password', autocomplete: 'new-password' },
    ], 'Gardar contrasinal', async (d) => {
      const r = await postAuth({ accion: 'aceptar-convite', token, ...d });
      history.replaceState(null, '', '/panel/');
      seguinte(r);
    }));
}
