// Tiny HMAC token auth for the /admin panel. No sessions, no cookies.
const crypto = require('crypto');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function issueToken() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET is not configured');
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const sig = crypto.createHmac('sha256', secret).update(exp).digest();
  return `${b64url(exp)}.${b64url(sig)}`;
}

function verifyToken(token) {
  try {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || typeof token !== 'string') return false;
    const [expB64, sigB64] = token.split('.');
    if (!expB64 || !sigB64) return false;
    const exp = Buffer.from(expB64, 'base64url').toString();
    if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
    const expected = crypto.createHmac('sha256', secret).update(exp).digest();
    const got = Buffer.from(sigB64, 'base64url');
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  } catch {
    return false;
  }
}

function readToken(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/.exec(h);
  return m ? m[1] : null;
}

function requireAdmin(req, res) {
  if (!verifyToken(readToken(req))) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

module.exports = { issueToken, verifyToken, requireAdmin };
