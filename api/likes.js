const { redis, KEYS } = require('../lib/redis');
const { readJsonBody } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { filename, action } = await readJsonBody(req);
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'filename required' });
    }
    const key = filename.split('/').pop();
    if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(key)) {
      return res.status(400).json({ error: 'invalid filename' });
    }
    const likes = (await redis.get(KEYS.likes)) || {};
    const current = likes[key] || 0;
    likes[key] = action === 'unlike' ? Math.max(0, current - 1) : current + 1;
    await redis.set(KEYS.likes, likes);
    return res.status(200).json({ success: true, count: likes[key] });
  } catch (err) {
    console.error('likes error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
