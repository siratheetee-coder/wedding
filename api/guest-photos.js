const { list } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

function listStaticGuestUploads() {
  const dir = path.join(process.cwd(), 'uploads', 'guest');
  try {
    return fs.readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map((f) => ({
        url: `/uploads/guest/${f}`,
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
      const { blobs } = await list({ prefix: 'guest/' });
      blobItems = blobs.map((b) => ({
        url: b.url,
        uploadedAt: new Date(b.uploadedAt).getTime(),
      }));
    } catch (e) {
      console.warn('blob list failed', e?.message);
    }
    const all = [...blobItems, ...listStaticGuestUploads()]
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
      .map((x) => x.url);
    return res.status(200).json({ photos: all });
  } catch (err) {
    console.error('guest-photos list error', err);
    return res.status(200).json({ photos: [] });
  }
};
