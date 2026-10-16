// GET /api/admin-members  (admin only) -> { count, members: [{id, name, branch, year, joinedAt}] }
// DELETE /api/admin-members?id=  (admin only) -> removes one member
const { ObjectId } = require('mongodb');
const { getDb } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const col = db.collection('members');

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || '';
      if (!ObjectId.isValid(id)) return res.status(400).json({ ok: false, error: 'Invalid id.' });
      await col.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, DELETE');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    const members = await col.find({})
      .sort({ joinedAt: -1 })
      .limit(2000)
      .toArray();
    return res.status(200).json({
      ok: true,
      count: members.length,
      members: members.map(m => ({
        id: String(m._id), name: m.name, branch: m.branch, year: m.year, joinedAt: m.joinedAt,
      })),
    });
  } catch (e) {
    console.error('admin-members error', e);
    return res.status(500).json({ ok: false, error: 'Something went wrong.' });
  }
};
