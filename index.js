// =====================================================================
// ASO Rank Backend
// Play Store anahtar kelime sıralama kontrolü (google-play-scraper)
// GET /rank?keyword=...&id=com.paket.adi&country=tr&lang=tr&num=250
// =====================================================================

const express = require('express');
const cors = require('cors');
const gplay = require('google-play-scraper');

const app = express();
app.use(cors());

// Sağlık kontrolü (Railway URL'ini tarayıcıda açınca bunu görürsün)
app.get('/', (req, res) => {
  res.send('ASO Rank Backend calisiyor ✅  ->  /rank?keyword=...&id=...');
});

// Asıl sıralama endpoint'i
app.get('/rank', async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    const id = (req.query.id || '').trim();
    const country = (req.query.country || 'tr').toLowerCase();
    const lang = (req.query.lang || 'tr').toLowerCase();
    let num = parseInt(req.query.num || '250', 10);
    if (isNaN(num) || num <= 0) num = 250;
    if (num > 250) num = 250; // Google pratikte ~250 derinlik veriyor

    if (!keyword || !id) {
      return res.status(400).json({ error: 'keyword ve id parametreleri zorunlu' });
    }

    const list = await gplay.search({ term: keyword, num, country, lang });

    const idx = list.findIndex(
      (a) => (a.appId || '').toLowerCase() === id.toLowerCase()
    );

    return res.json({
      keyword,
      id,
      country,
      rank: idx >= 0 ? idx + 1 : -1, // bulunamazsa -1
      total: list.length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('ASO Rank Backend listening on ' + PORT));
