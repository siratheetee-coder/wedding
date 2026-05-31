const { list } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const { redis, KEYS } = require('../lib/redis');

function listStaticUploads() {
  const dir = path.join(process.cwd(), 'uploads');
  try {
    return fs.readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map((f) => ({
        url: `/uploads/${f}`,
        uploadedAt: fs.statSync(path.join(dir, f)).mtimeMs,
      }));
  } catch {
    return [];
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    let blobItems = [];
    try {
      const { blobs } = await list({ prefix: 'gallery/' });
      blobItems = blobs.map((b) => ({
        url: b.url,
        uploadedAt: new Date(b.uploadedAt).getTime(),
      }));
    } catch (e) {
      console.warn('blob list failed', e?.message);
    }
    const all = [...blobItems, ...listStaticUploads()]
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
      .map((x) => x.url);
    const likes = (await redis.get(KEYS.likes).catch(() => ({}))) || {};
    return res.status(200).json({ photos: all, likes });
  } catch (err) {
    console.error('photos list error', err);
    return res.status(200).json({ photos: [], likes: {} });
  }
};
