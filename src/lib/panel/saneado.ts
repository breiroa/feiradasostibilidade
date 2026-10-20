// Limpa o HTML dos textos enriquecidos (noticias, presentacións…) antes de gardalo.
// Só se permiten etiquetas e atributos de formato básico; o resto elimínase.

const PERMITIDAS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'img', 'figure', 'figcaption', 'hr']);
// Estas elimínanse co seu contido (non só a etiqueta)
const PERIGOSAS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'head', 'title', 'meta', 'link', 'base']);

const hrefSegura = (v: string) => /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(v.trim());
const srcSegura = (v: string) => /^\/media\/[a-z0-9-]{3,80}\/[gm]$/.test(v.trim());

export async function sanearHtml(html: string): Promise<string> {
  if (!html || !html.trim()) return '';
  const res = new HTMLRewriter()
    .on('*', {
      element(el) {
        const tag = el.tagName.toLowerCase();
        if (PERIGOSAS.has(tag)) return el.remove();
        if (!PERMITIDAS.has(tag)) return el.removeAndKeepContent();
        const attrs = [...el.attributes].map(([n, v]) => [n.toLowerCase(), v] as const);
        for (const [n] of attrs) el.removeAttribute(n);
        if (tag === 'a') {
          const href = attrs.find(([n]) => n === 'href')?.[1] ?? '';
          if (!hrefSegura(href)) return el.removeAndKeepContent();
          el.setAttribute('href', href.trim());
          if (/^https?:/i.test(href.trim())) el.setAttribute('rel', 'noopener');
        }
        if (tag === 'img') {
          const src = attrs.find(([n]) => n === 'src')?.[1] ?? '';
          if (!srcSegura(src)) return el.remove();
          el.setAttribute('src', src.trim());
          el.setAttribute('alt', attrs.find(([n]) => n === 'alt')?.[1] ?? '');
          el.setAttribute('loading', 'lazy');
        }
      },
      comments(c) {
        c.remove();
      },
    })
    .transform(new Response(`<div>${html}</div>`, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
  const saida = await res.text();
  // Quitar o <div> envolvente e parágrafos baleiros
  return saida
    .replace(/^<div>|<\/div>$/g, '')
    .replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, '')
    .trim();
}

// ── HTML libre (sección «HTML»): máis etiquetas e estilos, pero nunca scripts nin eventos ──
const LIBRES = new Set([...PERMITIDAS, 'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'h1', 'h5', 'h6', 'small', 'mark', 'sub', 'sup', 's', 'del', 'ins', 'code', 'pre', 'kbd', 'abbr', 'cite', 'q', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col', 'details', 'summary', 'picture', 'source', 'video', 'audio', 'track', 'iframe', 'time', 'address']);
const PERIGOSAS_LIBRES = new Set([...PERIGOSAS].filter((t) => t !== 'iframe' && t !== 'svg' && t !== 'style'));
const ATRIBUTOS_LIBRES = new Set(['class', 'id', 'style', 'href', 'src', 'srcset', 'alt', 'title', 'width', 'height', 'target', 'rel', 'colspan', 'rowspan', 'scope', 'loading', 'allow', 'allowfullscreen', 'frameborder', 'controls', 'poster', 'type', 'lang', 'dir', 'datetime', 'open', 'start', 'reversed', 'role', 'aria-label', 'aria-hidden', 'viewbox', 'fill', 'stroke', 'd', 'cx', 'cy', 'r', 'x', 'y', 'points', 'stroke-width', 'xmlns']);
const IFRAMES = /^https:\/\/(www\.)?(youtube(-nocookie)?\.com|player\.vimeo\.com|(www\.)?google\.com\/maps|maps\.google\.com|docs\.google\.com|calendar\.google\.com|forms\.office\.com|open\.spotify\.com|w\.soundcloud\.com|www\.openstreetmap\.org|umap\.openstreetmap\.fr|genial\.ly|view\.genial\.ly|padlet\.com|www\.canva\.com)\//i;
const urlSegura = (v: string) => /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(v.trim());
const estiloSeguro = (v: string) => !/(expression|javascript:|url\s*\(\s*['"]?\s*(?!https?:|\/))/i.test(v) && !/@import|behavior|-moz-binding/i.test(v);
const SVG = new Set(['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'ellipse']);

export async function sanearHtmlLibre(html: string): Promise<string> {
  if (!html || !html.trim()) return '';
  const res = new HTMLRewriter()
    .on('*', {
      element(el) {
        const tag = el.tagName.toLowerCase();
        if (PERIGOSAS_LIBRES.has(tag)) return el.remove();
        if (!LIBRES.has(tag) && !SVG.has(tag) && tag !== 'style') return el.removeAndKeepContent();
        const attrs = [...el.attributes].map(([n, v]) => [n.toLowerCase(), v] as const);
        for (const [n] of attrs) el.removeAttribute(n);
        for (const [n, v] of attrs) {
          if (!ATRIBUTOS_LIBRES.has(n)) continue; // fóra on*, data-*, formaction…
          if ((n === 'href' || n === 'src' || n === 'poster') && !urlSegura(v)) continue;
          if (n === 'srcset' && /javascript:/i.test(v)) continue;
          if (n === 'style' && !estiloSeguro(v)) continue;
          el.setAttribute(n, v);
        }
        if (tag === 'iframe') {
          const src = attrs.find(([n]) => n === 'src')?.[1] ?? '';
          if (!IFRAMES.test(src.trim())) return el.remove();
          el.setAttribute('loading', 'lazy');
          el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        }
        if (tag === 'a' && /^https?:/i.test(attrs.find(([n]) => n === 'href')?.[1] ?? '')) el.setAttribute('rel', 'noopener');
      },
      comments(c) {
        c.remove();
      },
    })
    // Os bloques <style> só poden ter CSS sen imports, scripts nin URLs doutros tipos
    .on('style', {
      text(t) {
        if (/@import|expression\s*\(|javascript:|behavior|-moz-binding|url\s*\(\s*['"]?\s*(?!https?:|\/)/i.test(t.text)) t.remove();
      },
    })
    .transform(new Response(`<div>${html}</div>`, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
  return (await res.text()).replace(/^<div>|<\/div>$/g, '').trim();
}

/** Limpa recursivamente os campos de texto enriquecido (os que se chaman corpo ou rematan en Corpo) e o HTML libre (html) */
export async function limparHtml(v: unknown, clave = ''): Promise<unknown> {
  if (typeof v === 'string') return clave === 'corpo' || clave.endsWith('Corpo') ? sanearHtml(v) : clave === 'html' ? sanearHtmlLibre(v) : v;
  if (Array.isArray(v)) return Promise.all(v.map((x) => limparHtml(x)));
  if (v && typeof v === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) saida[k] = await limparHtml(x, k);
    return saida;
  }
  return v;
}
