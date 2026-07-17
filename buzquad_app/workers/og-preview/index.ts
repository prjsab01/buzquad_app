/**
 * OG Preview Worker — fetches Open Graph / meta tags for a URL.
 * Deploy: wrangler deploy (from workers/og-preview/)
 * Usage:  GET /?url=https://example.com
 */

const ALLOWED_ORIGIN = (globalThis as unknown as { ALLOWED_ORIGIN?: string }).ALLOWED_ORIGIN ?? '*';

function cors(origin: string) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN === '*' ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function extractMeta(html: string) {
  const get = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
    return m?.[1];
  };
  const title = get('og:title') ?? get('twitter:title')
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const description = get('og:description') ?? get('twitter:description') ?? get('description');
  const image = get('og:image') ?? get('twitter:image');
  const favicon = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)?.[1];
  return { title, description, image, favicon };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '*';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url param' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    }

    let targetUrl: URL;
    try { targetUrl = new URL(url); } catch {
      return new Response(JSON.stringify({ error: 'Invalid url' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    }

    try {
      const res = await fetch(targetUrl.toString(), {
        headers: { 'User-Agent': 'Buzquad-OGBot/1.0' },
        redirect: 'follow',
        cf: { cacheTtl: 3600, cacheEverything: true },
      } as RequestInit);

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        return new Response(JSON.stringify({ domain: targetUrl.hostname }), {
          headers: { 'Content-Type': 'application/json', ...cors(origin) },
        });
      }

      // Read only first 50 kB to stay fast
      const reader = res.body?.getReader();
      let html = '';
      if (reader) {
        let bytes = 0;
        while (bytes < 50_000) {
          const { done, value } = await reader.read();
          if (done) break;
          html += new TextDecoder().decode(value);
          bytes += value.length;
        }
        reader.cancel();
      }

      const meta = extractMeta(html);
      const domain = targetUrl.hostname.replace(/^www\./, '');

      return new Response(JSON.stringify({ ...meta, domain }), {
        headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    } catch {
      return new Response(JSON.stringify({ domain: targetUrl.hostname }), {
        headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    }
  },
};
