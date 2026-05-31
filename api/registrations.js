const { redis, KEYS } = require('../lib/redis');
const { isAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const registrations = (await redis.get(KEYS.registrations)) || [];
    const totalGuests = registrations.reduce(
      (sum, r) => sum + (parseInt(r.guests) || 0) + 1,
      0
    );
    return res.status(200).json({
      registrations,
      totalGuests,
      count: registrations.length,
    });
  } catch (err) {
    console.error('registrations error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
