const { randomUUID } = require('crypto');
const { redis, KEYS } = require('../lib/redis');
const { readJsonBody } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = await readJsonBody(req);
    const { name, phone, guests, guestName, message } = body;
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล' });
    }
    const registrations = (await redis.get(KEYS.registrations)) || [];
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
    if (cleanPhone.length >= 9) {
      const dup = registrations.find(
        (r) => String(r.phone || '').replace(/\D/g, '') === cleanPhone
      );
      if (dup) {
        return res.status(409).json({
          error: `เบอร์นี้ได้ลงทะเบียนแล้ว (${dup.name}) หากต้องการแก้ไข กรุณาติดต่อเจ้าบ่าวสาว`,
        });
      }
    }
    const entry = {
      id: randomUUID(),
      name: String(name).trim(),
      phone: String(phone || '').trim(),
      guests: parseInt(guests) || 0,
      guestName: String(guestName || '').trim(),
      message: String(message || '').trim(),
      createdAt: new Date().toISOString(),
    };
    registrations.push(entry);
    await redis.set(KEYS.registrations, registrations);
    return res.status(200).json({ success: true, id: entry.id });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
