const { redis, KEYS } = require('../lib/redis');
const { readJsonBody } = require('../lib/auth');

const MAX_PER_HOUR = 5;

async function handleGet(res) {
  const [registrations, wishes] = await Promise.all([
    redis.get(KEYS.registrations).catch(() => null),
    redis.lrange(KEYS.wishes, 0, 99).catch(() => []),
  ]);
  const fromRsvp = (registrations || [])
    .filter((r) => r.message && r.message.trim().length > 0)
    .map((r) => ({ name: r.name, message: r.message, createdAt: r.createdAt }));
  const messages = [...(wishes || []), ...fromRsvp]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ messages });
}

async function handlePost(req, res) {
  const { name, message } = await readJsonBody(req);
  const cleanName = String(name || '').trim().slice(0, 60);
  const cleanMessage = String(message || '').trim().slice(0, 300);
  if (!cleanName) return res.status(400).json({ error: 'กรุณากรอกชื่อ' });
  if (!cleanMessage) return res.status(400).json({ error: 'กรุณาเขียนคำอวยพร' });

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const rateKey = `wedding:wishrate:${ip}`;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, 3600);
  if (count > MAX_PER_HOUR) {
    return res.status(429).json({ error: 'ส่งคำอวยพรได้สูงสุด 5 ครั้งต่อชั่วโมง' });
  }

  await redis.lpush(KEYS.wishes, {
    name: cleanName,
    message: cleanMessage,
    createdAt: new Date().toISOString(),
  });
  await redis.ltrim(KEYS.wishes, 0, 499);
  return res.status(200).json({ success: true });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return await handleGet(res);
    if (req.method === 'POST') return await handlePost(req, res);
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('messages error', err);
    if (req.method === 'GET') return res.status(200).json({ messages: [] });
    return res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
};
