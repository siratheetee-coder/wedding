const { redis, KEYS } = require('../lib/redis');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const registrations = (await redis.get(KEYS.registrations)) || [];
    const messages = registrations
      .filter((r) => r.message && r.message.trim().length > 0)
      .map((r) => ({
        name: r.name,
        message: r.message,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({ messages });
  } catch (err) {
    console.error('messages error', err);
    return res.status(200).json({ messages: [] });
  }
};
