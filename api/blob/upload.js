const { handleUpload } = require('@vercel/blob/client');
const { readJsonBody, ADMIN_SECRET } = require('../../lib/auth');

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = await readJsonBody(req);
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let secret = null;
        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload);
            secret = parsed.secret || null;
          } catch {}
        }
        const isGallery = pathname.startsWith('gallery/');
        const isGuest = pathname.startsWith('guest/');
        if (!isGallery && !isGuest) {
          throw new Error('Invalid pathname prefix');
        }
        if (isGallery && secret !== ADMIN_SECRET) {
          throw new Error('Unauthorized');
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ kind: isGallery ? 'gallery' : 'guest' }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: photos discovered by listing the bucket.
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('blob upload error', err);
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
};
