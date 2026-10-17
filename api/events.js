// /api/events — first-party conversion tracking (no cookies, no third party).
// POST {event: 'page_view'|'join_success'} -> stores {event, at} (no PII)
// GET (admin only) -> { ok, counts: {page_view, join_success} }
const { getDb } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

const ALLOWED = new Set(['page_view', 'join_success']);

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('events');

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const event = typeof body.event === 'string' ? body.event.slice(0, 32) : '';
      if (!ALLOWED.has(event)) return res.status(400).json({ ok: false });
      await col.insertOne({ event, at: new Date() });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const counts = {};
      for (const e of ALLOWED) counts[e] = await col.countDocuments({ event: e });
      return res.status(200).json({ ok: true, counts });
    }

    return res.status(405).json({ ok: false });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
};
