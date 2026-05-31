const { list, del } = require('@vercel/blob');
const { isAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const filename = req.query?.filename ||
      decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'x'}`).pathname.split('/').pop());
    if (!filename) return res.status(400).json({ error: 'filename required' });
    const { blobs } = await list({ prefix: 'guest/' });
    const match = blobs.find((b) => b.pathname === `guest/${filename}`);
    if (match) await del(match.url);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('delete guest-photo error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
