// GET /api/quiz-leaderboard -> top 20 attempts, best score first, fastest wins ties
const { getDb } = require('../lib/db');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    const db = await getDb();
    const rows = await db.collection('quiz_scores')
      .find({}, { projection: { name: 1, branch: 1, year: 1, score: 1, durationSec: 1 } })
      .sort({ score: -1, durationSec: 1, _id: 1 })
      .limit(20)
      .toArray();

    const board = rows.map((r, i) => ({
      rank: i + 1,
      id: r._id.toString(),
      name: r.name,
      branch: r.branch,
      year: r.year,
      score: r.score,
      durationSec: r.durationSec || 0,
    }));
    return res.status(200).json({ ok: true, board });
  } catch (e) {
    console.error('quiz-leaderboard failed:', e.message);
    return res.status(500).json({ ok: false, error: 'Something went wrong, try again.' });
  }
};
