// =====================================================================
// Cloudflare Worker — App Rank API (JavaScript)
// Aynı uçlar: /play/lookup ve /play/rank
// google-play-scraper (npm) ile 250'ye kadar tarar.
// =====================================================================

import gplay from 'google-play-scraper';
// Eğer "gplay.search is not a function" hatası alırsan üst satırı silip
// şunu dene:  import * as gplay from 'google-play-scraper';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // Sağlık kontrolü
    if (url.pathname === '/' || url.pathname === '') {
      return jsonResponse({ ok: true, service: 'app-rank-api' });
    }

    const lang = url.searchParams.get('lang') || 'tr';
    const country = url.searchParams.get('country') || 'tr';

    // --- Uygulama doğrulama (isim + ikon) ---
    if (url.pathname === '/play/lookup') {
      const pkg = url.searchParams.get('pkg');
      if (!pkg) return jsonResponse({ detail: 'pkg gerekli' }, 400);
      try {
        const info = await gplay.app({ appId: pkg, lang, country });
        return jsonResponse({ id: pkg, name: info.title, icon: info.icon });
      } catch (e) {
        return jsonResponse({ detail: `App not found: ${e}` }, 404);
      }
    }

    // --- Sıralama bul ---
    if (url.pathname === '/play/rank') {
      const pkg = url.searchParams.get('pkg');
      const kw = url.searchParams.get('kw');
      const n = parseInt(url.searchParams.get('n') || '250', 10);
      if (!pkg || !kw) return jsonResponse({ detail: 'pkg ve kw gerekli' }, 400);

      try {
        const results = await gplay.search({
          term: kw,
          num: n,
          lang,
          country,
        });

        for (let i = 0; i < results.length; i++) {
          if (results[i].appId === pkg) {
            return jsonResponse({
              rank: i + 1,
              total: results.length,
              name: results[i].title,
              icon: results[i].icon,
            });
          }
        }
        return jsonResponse({ rank: -1, total: results.length, name: null });
      } catch (e) {
        return jsonResponse({ detail: String(e) }, 500);
      }
    }

    return jsonResponse({ detail: 'not found' }, 404);
  },
};
