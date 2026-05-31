const ADMIN_SECRET = process.env.ADMIN_SECRET || 'wedding2025';

function isAdmin(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  return url.searchParams.get('secret') === ADMIN_SECRET;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = { ADMIN_SECRET, isAdmin, readJsonBody };
