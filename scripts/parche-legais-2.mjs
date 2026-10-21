// Completa as páxinas legais antes de difundir a web (2026-10-21):
//  - Privacidade: delegado/a de protección de datos (Xunta), datos técnicos (IP 24 h), correos (Brevo), conservación…
//  - Cookies: contidos incrustados que só se cargan ao premer; almacenamento local do panel.
//  - Aviso legal: sen o marcador [PENDENTE: NIF] visible.
// Uso: node scripts/parche-legais-2.mjs --local | --remote
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const modo = process.argv.includes('--remote') ? '--remote' : '--local';
const RAIZ = path.resolve(import.meta.dirname, '..');
const wr = (args) => execSync(`npx wrangler d1 execute feira ${modo} ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const filas = JSON.parse(wr(`--json --command "SELECT id, datos FROM documentos WHERE coleccion='paxinas_libres' AND id IN ('aviso-legal','privacidade','cookies')"`))[0].results;
const doc = (id) => JSON.parse(filas.find((f) => f.id === id).datos);
const IES = '<strong>IES Luís Seoane</strong>, centro público da Consellería de Educación, Ciencia, Universidades e Formación Profesional da Xunta de Galicia, con enderezo na Rúa Luxemburgo, 1, 36162 Monte Porreiro (Pontevedra), teléfono 986 857 700 e correo <a href="mailto:ies.luis.seoane@edu.xunta.gal">ies.luis.seoane@edu.xunta.gal</a>';
const texto = (id, corpo) => ({ id, tipo: 'texto', oculta: false, fondo: 'branco', corpo, estreito: true });

const privacidade = `
<h2>Responsable do tratamento</h2>
<p>${IES}.</p>
<h2>Delegado/a de protección de datos</h2>
<p>O centro depende do delegado ou delegada de protección de datos da Consellería de Educación, Ciencia, Universidades e Formación Profesional da Xunta de Galicia, a quen podes escribir a través do formulario oficial: <a href="https://www.xunta.gal/delegados-de-proteccion-de-datos">xunta.gal/delegados-de-proteccion-de-datos</a>.</p>
<h2>Que datos tratamos e para que</h2>
<ul>
<li><strong>Formulario de contacto e participación</strong>: tipo de contacto, nome, correo electrónico, centro ou entidade (opcional), teléfono (opcional) e a mensaxe. Usámolos só para responderche e organizar a participación na Feira da Sostibilidade.</li>
<li><strong>Datos técnicos</strong>: para evitar envíos automáticos e abusos, gardamos durante 24 horas o enderezo IP desde o que se envía o formulario ou se tenta entrar no panel. Non se usa para nada máis.</li>
<li><strong>Persoas que xestionan a web</strong>: nome, correo e datos de acceso ao panel (contrasinal cifrado e verificación en dous pasos), e o rexistro de que contidos modifica cada persoa.</li>
</ul>
<p>Non usamos ferramentas de analítica nin de publicidade, non elaboramos perfís e non tomamos decisións automatizadas.</p>
<h2>Base legal</h2>
<p>O teu consentimento, que dás ao enviar o formulario marcando a casa de aceptación (art. 6.1.a do Regulamento Xeral de Protección de Datos, RGPD). Podes retiralo en calquera momento. Os datos técnicos de seguridade baséanse no interese lexítimo de protexer a web (art. 6.1.f RGPD), e os das persoas que xestionan a web, na súa participación nesa tarefa.</p>
<h2>Canto tempo os gardamos</h2>
<p>As mensaxes do formulario, ata rematar a edición da Feira á que se refiren e como máximo dous anos; despois elimínanse. Os enderezos IP, 24 horas. Os datos das persoas que xestionan a web, mentres teñan acceso ao panel.</p>
<h2>Con quen os compartimos</h2>
<p>Non cedemos os teus datos a terceiros, salvo obriga legal. Para funcionar, a web usa estes provedores, que actúan como encargados do tratamento con garantías do RGPD:</p>
<ul>
<li><strong>Cloudflare, Inc.</strong>: aloxamento da web e da base de datos (servidores en Europa occidental). Está adherida ao Marco de Privacidade de Datos UE–EUA e aplica cláusulas contractuais tipo.</li>
<li><strong>Brevo (Sendinblue SAS, Francia)</strong>: só para enviar os correos da web (avisos de mensaxes e convites ao panel), cando está activado.</li>
</ul>
<h2>Os teus dereitos</h2>
<p>Podes exercer os dereitos de acceso, rectificación, supresión, oposición, limitación do tratamento e portabilidade escribindo a <a href="mailto:ies.luis.seoane@edu.xunta.gal">ies.luis.seoane@edu.xunta.gal</a> ou a través da sede electrónica da Xunta: <a href="https://www.xunta.gal/exercicio-de-dereitos">xunta.gal/exercicio-de-dereitos</a>. Se consideras que non atendemos correctamente a túa solicitude, podes reclamar ante a <a href="https://www.aepd.es">Axencia Española de Protección de Datos</a>.</p>
<h2>Menores de idade</h2>
<p>As persoas menores de 14 anos non deben enviar o formulario sen a autorización das súas nais, pais ou titores. O habitual é que os centros participen a través do seu profesorado.</p>
<h2>Imaxes</h2>
<p>As imaxes nas que aparece alumnado publícanse coa autorización correspondente dos centros educativos. Se apareces nunha imaxe e queres que se retire, escríbenos e retirarémola.</p>
<p><em>Última actualización: outubro de 2026.</em></p>`;

const cookies = `
<h2>Usamos cookies?</h2>
<p>Esta web <strong>non usa cookies de analítica, de publicidade nin de redes sociais</strong>, e non garda nada no teu navegador para seguirte. Por iso non che pedimos consentimento nin amosamos un aviso de cookies.</p>
<h2>A única cookie</h2>
<p>Só as persoas que xestionan a web usan unha cookie técnica, <code>feira_panel</code>, para manter a sesión aberta no panel de xestión. É imprescindible para ese servizo, caduca nun máximo de 12 horas e está exenta de consentimento (art. 22.2 da LSSI-CE). O panel tamén garda no navegador desas persoas unha preferencia (se xa viron a axuda do editor).</p>
<h2>Contido doutros servizos</h2>
<p>As tipografías e as imaxes da web sérvense desde o noso propio servidor.</p>
<p>Os vídeos (YouTube, Vimeo) e outros contidos incrustados (mapas, formularios, presentacións…) <strong>non se cargan ata que premes o botón para velos</strong>. Nese momento o servizo correspondente pode usar as súas propias cookies, segundo a súa política: <a href="https://policies.google.com/privacy">Google/YouTube</a>, <a href="https://vimeo.com/privacy">Vimeo</a>. YouTube cárgase no seu modo de privacidade mellorada.</p>
<h2>Como eliminar as cookies</h2>
<p>Podes borrar ou bloquear as cookies desde a configuración do teu navegador.</p>
<p><em>Última actualización: outubro de 2026.</em></p>`;

const sql = [];
const gardar = (id, d) => sql.push(`UPDATE documentos SET datos = ${q(JSON.stringify(d))}, actualizado = datetime('now'), editado_por = 'Revisión legal' WHERE coleccion = 'paxinas_libres' AND id = ${q(id)};`);

const p = doc('privacidade');
p.seccions = [texto(p.seccions[0]?.id ?? 'privacidade', privacidade.trim())];
p.descricion = 'Como tratamos os datos persoais na web da Feira da Sostibilidade: responsable, delegado/a de protección de datos, finalidades, conservación e dereitos.';
gardar('privacidade', p);

const ck = doc('cookies');
ck.seccions = [texto(ck.seccions[0]?.id ?? 'cookies', cookies.trim())];
ck.descricion = 'Esta web non usa cookies de analítica nin de publicidade: só unha cookie técnica para o panel de xestión.';
gardar('cookies', ck);

const al = doc('aviso-legal');
al.seccions = al.seccions.map((s) => (s.corpo ? { ...s, corpo: s.corpo.replace(/\s*NIF:\s*(<[^>]+>)*\s*\[PENDENTE: NIF\]\s*(<\/[^>]+>)*\s*\.?/g, '').replace('centro público da Consellería de Educación da Xunta de Galicia', 'centro público da Consellería de Educación, Ciencia, Universidades e Formación Profesional da Xunta de Galicia') } : s));
gardar('aviso-legal', al);

const fsql = path.join(RAIZ, 'semente', `parche-legais-2-${modo.slice(2)}.sql`);
fs.writeFileSync(fsql, sql.join('\n') + '\n');
wr(`--file "${fsql}" -y`);
console.log('Páxinas legais actualizadas.', al.seccions.some((s) => s.corpo?.includes('PENDENTE')) ? '(OLLO: aínda queda algún PENDENTE no aviso legal)' : '');
