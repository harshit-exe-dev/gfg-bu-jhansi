// /api/media — gallery items backed by MongoDB; files live on Cloudinary.
// GET  -> { items: [{id, url, kind, caption, createdAt}] }   (public)
// POST (admin) {url, kind: 'image'|'video', caption} -> saves item
// DELETE (admin) ?id= -> removes item
const { ObjectId } = require('mongodb');
const { getDb } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

function clean(s, max) {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}
function isHttpUrl(u) {
  try { const x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:'; }
  catch { return false; }
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('media');

    if (req.method === 'GET') {
      const items = await col.find({}, { projection: { _id: 1, url: 1, kind: 1, caption: 1, createdAt: 1 } })
        .sort({ createdAt: -1 }).limit(200).toArray();
      return res.status(200).json({
        ok: true,
        items: items.map(i => ({ id: String(i._id), url: i.url, kind: i.kind, caption: i.caption || '', createdAt: i.createdAt })),
      });
    }

    if (!requireAdmin(req, res)) return;

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const url = clean(body.url, 500);
      const kind = body.kind === 'video' ? 'video' : 'image';
      const caption = clean(body.caption, 140);
      if (!isHttpUrl(url)) return res.status(400).json({ ok: false, error: 'Invalid media URL.' });
      const r = await col.insertOne({ url, kind, caption, createdAt: new Date() });
      return res.status(200).json({ ok: true, id: String(r.insertedId) });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || '';
      if (!ObjectId.isValid(id)) return res.status(400).json({ ok: false, error: 'Invalid id.' });
      await col.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    console.error('media error', e);
    return res.status(500).json({ ok: false, error: 'Something went wrong.' });
  }
};
