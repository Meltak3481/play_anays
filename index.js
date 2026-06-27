// =====================================================================
// ASO Rank Backend (hardened + boot logs)
// GET /rank?keyword=...&id=com.paket.adi&country=tr&lang=tr&num=250
// =====================================================================

console.log('[boot] basliyor... PORT env =', process.env.PORT);

process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));

const express = require('express');
const cors = require('cors');

// google-play-scraper'i savunmaci sekilde yukle (hata olursa logla, surec olmesin)
let gplay = null;
try {
  gplay = require('google-play-scraper');
  if (gplay && gplay.default) gplay = gplay.default; // ESM default ihtimali
  console.log('[boot] google-play-scraper yuklendi. search tipi =', typeof gplay.search);
} catch (e) {
  console.error('[boot] google-play-scraper YUKLENEMEDI:', e);
}

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('ASO Rank Backend calisiyor -> /rank?keyword=...&id=...');
});

app.get('/rank', async (req, res) => {
  try {
    if (!gplay || typeof gplay.search !== 'function') {
      return res.status(500).json({ error: 'google-play-scraper yuklenemedi (loglara bak)' });
    }

    const keyword = (req.query.keyword || '').trim();
    const id = (req.query.id || '').trim();
    const country = (req.query.country || 'tr').toLowerCase();
    const lang = (req.query.lang || 'tr').toLowerCase();
    let num = parseInt(req.query.num || '250', 10);
    if (isNaN(num) || num <= 0) num = 250;
    if (num > 250) num = 250;

    if (!keyword || !id) {
      return res.status(400).json({ error: 'keyword ve id zorunlu' });
    }

    const list = await gplay.search({ term: keyword, num, country, lang });
    const idx = list.findIndex((a) => (a.appId || '').toLowerCase() === id.toLowerCase());

    return res.json({
      keyword,
      id,
      country,
      rank: idx >= 0 ? idx + 1 : -1,
      total: list.length,
    });
  } catch (e) {
    console.error('[/rank hata]', e);
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('[boot] listening on ' + PORT));
