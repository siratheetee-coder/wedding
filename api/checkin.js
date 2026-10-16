const { redis, KEYS } = require('../lib/redis');
const { readJsonBody } = require('../lib/auth');

// Guest check-ins on the day, kept apart from the seating plan so guests can mark
// themselves seated without touching the plan. Stored as a Redis hash
// guestId -> ISO time, so each check-in is one atomic field write.
module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      const checkins = (await redis.hgetall(KEYS.checkins)) || {};
      return res.status(200).json({ checkins });
    }
    if (req.method === 'POST') {
      const { id, undo } = await readJsonBody(req);
      const seating = await redis.get(KEYS.seating);
      if (!id || typeof id !== 'string' || !seating?.guests?.some((g) => g.id === id)) {
        return res.status(400).json({ error: 'unknown guest' });
      }
      if (undo) {
        await redis.hdel(KEYS.checkins, id);
        return res.status(200).json({ success: true, at: null });
      }
      const at = new Date().toISOString();
      await redis.hset(KEYS.checkins, { [id]: at });
      return res.status(200).json({ success: true, at });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('checkin error', err);
    return res.status(500).json({ error: 'Internal error', detail: String(err?.message || err).slice(0, 300) });
  }
};
