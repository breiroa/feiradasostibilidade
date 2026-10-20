// Crea as páxinas legais (aviso legal, privacidade, cookies, accesibilidade) como páxinas libres editables.
// Non pisa páxinas que xa se editaran no panel (só crea as que faltan; o aviso legal só se substitúe se segue sendo o texto inicial).
// Uso: node scripts/parche-legais.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const P = (t) => `<strong>[PENDENTE: ${t}]</strong>`;
const responsable = `${P('nome da entidade responsable (IES Luís Seoane, CIDEL Galicia ou Universidade de Vigo)')}, con NIF ${P('NIF')} e enderezo en ${P('enderezo postal')}. Correo de contacto: ${P('correo electrónico')}.`;

const paxinas = {
  'aviso-legal': {
    titulo: 'Aviso legal', orde: 90,
    corpo: `<h2>Titularidade da web</h2><p>En cumprimento da Lei 34/2002, de servizos da sociedade da información e de comercio electrónico (LSSI-CE), infórmase de que o titular desta web é ${responsable}</p><p>A Feira da Sostibilidade organízaa o IES Luís Seoane (Pontevedra) e impúlsana CIDEL Galicia e a Universidade de Vigo.</p>
<h2>Obxecto</h2><p>Esta web divulga a Feira da Sostibilidade, as súas edicións e os proxectos educativos vinculados (como SENDA 2030), e permite que centros, entidades e medios propoñan a súa participación.</p>
<h2>Propiedade intelectual</h2><p>Salvo indicación contraria, os textos e recursos desta web publícanse baixo licenza <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.gl">Creative Commons Recoñecemento-CompartirIgual 4.0 (CC BY-SA 4.0)</a>: podes compartilos e adaptalos citando a fonte e mantendo a mesma licenza. Os logotipos pertencen ás súas respectivas entidades e non están incluídos nesta licenza.</p>
<h2>Imaxes de menores</h2><p>As imaxes nas que aparece alumnado publícanse coa autorización correspondente dos centros educativos. Se apareces nunha imaxe e queres que se retire, escríbenos e retirarémola.</p>
<h2>Responsabilidade</h2><p>Os contidos desta web teñen carácter informativo. A web pode conter ligazóns a sitios externos sobre os que non temos control e dos que non somos responsables.</p>
<h2>Lexislación aplicable</h2><p>Este aviso legal réxese pola lexislación española.</p>`,
  },
  privacidade: {
    titulo: 'Política de privacidade', orde: 91,
    corpo: `<h2>Responsable do tratamento</h2><p>${responsable}</p>
<h2>Que datos tratamos</h2><ul><li><strong>Formularios de Participa</strong>: nome da persoa de contacto, correo electrónico, teléfono (opcional), nome do centro ou entidade e a descrición da proposta ou consulta.</li><li><strong>Persoas que xestionan a web</strong>: nome, correo e datos de acceso ao panel de xestión.</li></ul><p>Non usamos ferramentas de analítica nin de publicidade e non elaboramos perfís.</p>
<h2>Para que os usamos</h2><p>Para organizar a participación na Feira da Sostibilidade e responder ás consultas recibidas.</p>
<h2>Base legal</h2><p>O teu consentimento, que dás ao enviar o formulario marcando a casa de aceptación (art. 6.1.a do Regulamento Xeral de Protección de Datos, RGPD). Podes retiralo en calquera momento.</p>
<h2>Canto tempo os gardamos</h2><p>Ata rematar a edición da Feira á que se refire a túa proposta e, como máximo, dous anos. Despois elimínanse.</p>
<h2>Con quen os compartimos</h2><p>Non cedemos os teus datos a terceiros. A web está aloxada en Cloudflare, que actúa como encargado do tratamento; a base de datos garda os datos en servidores de Europa occidental. Cloudflare está adherida ao Marco de Privacidade de Datos UE-EUA e aplica cláusulas contractuais tipo.</p>
<h2>Os teus dereitos</h2><p>Podes exercer os dereitos de acceso, rectificación, supresión, oposición, limitación do tratamento e portabilidade escribindo a ${P('correo electrónico')}. Se consideras que non atendemos correctamente a túa solicitude, podes presentar unha reclamación ante a <a href="https://www.aepd.es">Axencia Española de Protección de Datos</a>.</p>
<h2>Menores de idade</h2><p>As persoas menores de 14 anos non deben enviar os formularios sen a autorización das súas nais, pais ou titores. O habitual é que os centros participen a través do seu profesorado.</p>`,
  },
  cookies: {
    titulo: 'Política de cookies', orde: 92,
    corpo: `<h2>Usamos cookies?</h2><p>Esta web <strong>non usa cookies de analítica, de publicidade nin de redes sociais</strong>, polo que non che pedimos consentimento nin amosamos ningún aviso de cookies.</p>
<h2>A única cookie</h2><p>Só as persoas que xestionan a web usan unha cookie técnica, <code>feira_panel</code>, para manter a sesión aberta no panel de xestión. É imprescindible para ese servizo, caduca nun máximo de 12 horas e está exenta de consentimento (art. 22.2 da LSSI-CE).</p>
<h2>Contido doutros servizos</h2><p>As tipografías e as imaxes da web sérvense desde o noso propio servidor. Os vídeos de YouTube ou Vimeo <strong>non se cargan ata que premes «Ver vídeo»</strong>; nese momento o reprodutor dese servizo pode usar as súas propias cookies (YouTube cárgase no seu modo de privacidade mellorada).</p>
<h2>Como eliminar as cookies</h2><p>Podes borrar ou bloquear as cookies desde a configuración do teu navegador.</p>`,
  },
  accesibilidade: {
    titulo: 'Declaración de accesibilidade', orde: 93,
    corpo: `<p>${P('entidade titular')} comprométese a facer accesible esta web, de acordo co Real Decreto 1112/2018, sobre accesibilidade dos sitios web e aplicacións para dispositivos móbiles do sector público.</p>
<h2>Situación de cumprimento</h2><p>Esta web é <strong>parcialmente conforme</strong> coa norma UNE-EN 301549:2022 (WCAG 2.1, nivel AA). Coidamos o contraste das cores, a navegación co teclado, a estrutura de títulos, os textos alternativos das imaxes e a adaptación a calquera tamaño de pantalla.</p>
<h2>Contido non accesible</h2><ul><li>Algúns documentos PDF elaborados por terceiros poden non ser plenamente accesibles.</li><li>Algúns vídeos poden non dispoñer de subtítulos.</li></ul>
<h2>Comunicacións</h2><p>Se atopas algún problema de accesibilidade ou necesitas un contido nun formato alternativo, escríbenos a ${P('correo electrónico')}.</p>
<h2>Elaboración desta declaración</h2><p>Declaración elaborada en outubro de 2026 mediante unha autoavaliación.</p>`,
  },
};

const existentes = JSON.parse(wr('--json --command "SELECT id, datos FROM documentos WHERE coleccion=\'paxinas_libres\'"'))[0].results;
const sql = [];
for (const [id, p] of Object.entries(paxinas)) {
  const actual = existentes.find((e) => e.id === id);
  // O aviso legal inicial (migrado) contiña «Titularidade» sen datos; substitúese só se segue igual
  if (actual && !(id === 'aviso-legal' && !actual.datos.includes('LSSI'))) continue;
  const datos = { titulo: p.titulo, nai: '', borrador: false, seccions: [{ id: `${id}-texto`, tipo: 'texto', oculta: false, fondo: 'branco', corpo: p.corpo, estreito: true }] };
  sql.push(`INSERT INTO documentos (coleccion, id, datos, orde) VALUES ('paxinas_libres', ${q(id)}, ${q(JSON.stringify(datos))}, ${p.orde}) ON CONFLICT(coleccion, id) DO UPDATE SET datos = excluded.datos, actualizado = datetime('now');`);
}
if (!sql.length) {
  console.log('As páxinas legais xa existían: non se toca nada.');
  process.exit(0);
}
const f = path.join(RAIZ, 'semente', 'parche-legais.sql');
fs.writeFileSync(f, sql.join('\n') + '\n');
wr(`--file "${f}" -y`);
console.log(`Páxinas legais creadas/actualizadas: ${sql.length}.`);
