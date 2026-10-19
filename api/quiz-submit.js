// POST /api/quiz-submit  {name, branch, year, score, durationSec} -> saves a quiz attempt
// GET  /api/quiz-submit  -> { count } (attempts so far)
const { getDb } = require('../lib/db');

const BRANCHES = ['CSE', 'ECE', 'ME', 'EI', 'Biotech Eng.', 'Biomedical Eng.', 'Foodtech Eng.', 'Other'];
const YEARS = ['1', '2', '3', '4'];

// light per-IP throttle: max 10 submits / minute (retakes allowed, spam slowed)
const hits = new Map();
function throttled(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 10;
}

function clean(s, max) {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('quiz_scores');

    if (req.method === 'GET') {
      const count = await col.countDocuments();
      return res.status(200).json({ ok: true, count });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (throttled(ip)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts, try again in a minute.' });
    }

    const body = req.body || {};
    const name = clean(body.name, 40);
    const branch = clean(body.branch, 20);
    const year = clean(body.year, 2);
    const score = Number(body.score);
    const durationSec = Number(body.durationSec);

    if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
    if (!BRANCHES.includes(branch)) return res.status(400).json({ ok: false, error: 'Pick a valid branch.' });
    if (!YEARS.includes(year)) return res.status(400).json({ ok: false, error: 'Pick a valid year.' });
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      return res.status(400).json({ ok: false, error: 'Invalid score.' });
    }
    const dur = Number.isInteger(durationSec) && durationSec >= 0 && durationSec <= 3600 ? durationSec : 0;

    const doc = { name, branch, year, score, durationSec: dur, createdAt: new Date() };
    const r = await col.insertOne(doc);

    return res.status(200).json({ ok: true, id: r.insertedId.toString() });
  } catch (e) {
    console.error('quiz-submit failed:', e.message);
    return res.status(500).json({ ok: false, error: 'Something went wrong, try again.' });
  }
};
