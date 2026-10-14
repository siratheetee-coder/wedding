const { redis, KEYS } = require('../lib/redis');
const { isAdmin, readJsonBody } = require('../lib/auth');

// Seating plan (admin only) — whole plan stored as one JSON document
module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (req.method === 'GET') {
      const seating = (await redis.get(KEYS.seating)) || null;
      return res.status(200).json({ seating });
    }
    if (req.method === 'PUT') {
      const seating = await readJsonBody(req);
      if (!seating || !Array.isArray(seating.guests)) {
        return res.status(400).json({ error: 'invalid seating data' });
      }
      seating.updatedAt = new Date().toISOString();
      await redis.set(KEYS.seating, seating);
      return res.status(200).json({ success: true, updatedAt: seating.updatedAt });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('seating error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
