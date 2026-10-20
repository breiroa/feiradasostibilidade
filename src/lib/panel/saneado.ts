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

/** Limpa recursivamente os campos de texto enriquecido (os que se chaman corpo ou rematan en Corpo) */
export async function limparHtml(v: unknown, clave = ''): Promise<unknown> {
  if (typeof v === 'string') return clave === 'corpo' || clave.endsWith('Corpo') ? sanearHtml(v) : v;
  if (Array.isArray(v)) return Promise.all(v.map((x) => limparHtml(x)));
  if (v && typeof v === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) saida[k] = await limparHtml(x, k);
    return saida;
  }
  return v;
}
