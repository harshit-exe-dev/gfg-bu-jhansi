// POST /api/join  {name, branch, year} -> saves a member, returns updated count
// GET  /api/join  -> { count }
const { getDb } = require('../lib/db');

const BRANCHES = ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'AI&DS', 'Other'];
const YEARS = ['1', '2', '3', '4'];

// best-effort per-IP throttle (serverless instances don't share memory,
// but this still slows down casual double-submits / naive spam)
const hits = new Map();
function throttled(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 5;
}

function clean(s, max) {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('members');

    if (req.method === 'GET') {
      const count = await col.countDocuments();
      return res.status(200).json({ ok: true, count });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (throttled(ip)) return res.status(429).json({ ok: false, error: 'Too many attempts, try again in a minute.' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const name = clean(body.name, 60);
    const branch = clean(body.branch, 12);
    const year = clean(body.year, 2);

    if (name.length < 2) return res.status(400).json({ ok: false, error: 'Please enter your full name.' });
    if (!BRANCHES.includes(branch)) return res.status(400).json({ ok: false, error: 'Please pick your branch.' });
    if (!YEARS.includes(year)) return res.status(400).json({ ok: false, error: 'Please pick your year.' });

    // one join per name+branch+year (case-insensitive) — stops accidental duplicates
    const exists = await col.findOne({
      nameLower: name.toLowerCase(), branch, year,
    });
    const count = await col.countDocuments();
    if (exists) return res.status(200).json({ ok: true, duplicate: true, count });

    await col.insertOne({ name, nameLower: name.toLowerCase(), branch, year, joinedAt: new Date() });
    return res.status(200).json({ ok: true, count: count + 1 });
  } catch (e) {
    console.error('join error', e);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
};
