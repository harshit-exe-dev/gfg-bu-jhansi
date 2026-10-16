// POST /api/admin-login  {password} -> { token } (12h)
const crypto = require('crypto');
const { issueToken } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const expected = process.env.ADMIN_PASSWORD || '';
    const given = (req.body && req.body.password) || '';
    const ok =
      expected.length > 0 &&
      given.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) {
      // small delay to blunt brute force
      await new Promise(r => setTimeout(r, 600));
      return res.status(401).json({ ok: false, error: 'Wrong password.' });
    }
    return res.status(200).json({ ok: true, token: issueToken() });
  } catch (e) {
    console.error('admin-login error', e);
    return res.status(500).json({ ok: false, error: 'Something went wrong.' });
  }
};
