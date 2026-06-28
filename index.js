// =====================================================================
// ASO Rank Backend (SearchApi.io - Google Play Store)
// GET /rank?keyword=...&id=com.paket.adi&country=tr&lang=tr&pages=8
// API anahtarı koda GÖMÜLMEZ; Railway "Variables" -> SEARCHAPI_KEY
// =====================================================================

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const API_KEY = process.env.SEARCHAPI_KEY;

app.get('/', (req, res) => {
  res.send('ASO Rank Backend (SearchApi) calisiyor -> /rank?keyword=...&id=...');
});

app.get('/rank', async (req, res) => {
  try {
    if (!API_KEY) {
      return res
          .status(500)
          .json({ error: 'SEARCHAPI_KEY tanimli degil (Railway > Variables)' });
    }

    const keyword = (req.query.keyword || '').trim();
    const id = (req.query.id || '').trim();
    const gl = (req.query.country || 'tr').toLowerCase();
    const hl = (req.query.lang || 'tr').toLowerCase();
    let maxPages = parseInt(req.query.pages || '8', 10);
    if (isNaN(maxPages) || maxPages <= 0) maxPages = 8;
    if (maxPages > 15) maxPages = 15; // kredi koruması

    if (!keyword || !id) {
      return res.status(400).json({ error: 'keyword ve id zorunlu' });
    }

    const ordered = [];
    const seen = new Set();
    const lowerId = id.toLowerCase();
    let token = null;
    let pages = 0;
    let rank = -1;

    while (pages < maxPages) {
      pages++;
      const params = new URLSearchParams({
        engine: 'google_play_store',
        store: 'apps',
        q: keyword,
        gl,
        hl,
        api_key: API_KEY,
      });
      if (token) params.set('next_page_token', token);

      const r = await fetch('https://www.searchapi.io/api/v1/search?' + params.toString());
      if (!r.ok) {
        const t = await r.text();
        return res.status(502).json({
          error: 'SearchApi hata',
          status: r.status,
          detail: t.slice(0, 200),
        });
      }
      const data = await r.json();

      const sections = Array.isArray(data.organic_results) ? data.organic_results : [];
      for (const sec of sections) {
        const items = Array.isArray(sec.items) ? sec.items : [];
        for (const it of items) {
          const pid = it.product_id;
          if (pid && !seen.has(pid)) {
            seen.add(pid);
            ordered.push(pid);
          }
        }
      }

      const idx = ordered.findIndex((e) => e.toLowerCase() === lowerId);
      if (idx >= 0) {
        rank = idx + 1;
        break; // bulundu -> dur (kredi tasarrufu)
      }

      token = data.pagination && data.pagination.next_page_token;
      if (!token) break; // son sayfa
    }

    return res.json({
      keyword,
      id,
      country: gl,
      rank, // bulunamazsa -1
      total: ordered.length, // taranan sonuç sayısı
      pages,
    });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('ASO Rank Backend (SearchApi) listening on ' + PORT));
