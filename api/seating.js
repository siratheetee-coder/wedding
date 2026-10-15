const { redis, KEYS } = require('../lib/redis');
const { readJsonBody } = require('../lib/auth');

// Seating plan — open without a secret by request; whole plan stored as one JSON document.
// Several devices edit it at once: GET ?v=1 is a cheap "has it changed?" check, and a
// PUT with ?base=<updatedAt it was built on> is refused (409, with the newer copy) when
// another device saved in between, so the client can merge instead of overwriting.
async function currentVersion() {
  const v = await redis.get(KEYS.seatingVersion);
  if (v) return v;
  const seating = await redis.get(KEYS.seating);
  return seating?.updatedAt || null;
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      if (url.searchParams.get('v')) {
        return res.status(200).json({ updatedAt: await currentVersion() });
      }
      const seating = (await redis.get(KEYS.seating)) || null;
      return res.status(200).json({ seating });
    }
    if (req.method === 'PUT') {
      const seating = await readJsonBody(req);
      if (!seating || !Array.isArray(seating.guests)) {
        return res.status(400).json({ error: 'invalid seating data' });
      }
      const base = url.searchParams.get('base');
      const current = await currentVersion();
      if (base && current && base !== current) {
        const latest = await redis.get(KEYS.seating);
        return res.status(409).json({ error: 'conflict', seating: latest });
      }
      seating.updatedAt = new Date().toISOString();
      await redis.set(KEYS.seating, seating);
      await redis.set(KEYS.seatingVersion, seating.updatedAt);
      return res.status(200).json({ success: true, updatedAt: seating.updatedAt });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('seating error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
