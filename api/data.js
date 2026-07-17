const https = require('https');

const BLOBS = {
  ai2607: '019f6fac-3c68-7838-9cff-a20515d3cac5',
  ai2603: '019f6fac-80a6-7e7d-b9ed-4fbbd6b268b4',
};

function jsonblobFetch(blobId, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(`https://jsonblob.com/api/jsonBlob/${blobId}`);
    const opts = { hostname: u.hostname, path: u.pathname, method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, data: d })); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const classId = req.query.class;
  const isAdd = req.query.add === '1';
  const blobId = BLOBS[classId];
  if (!blobId) return res.status(404).json({ error: 'Unknown class' });

  try {
    if (req.method === 'GET') {
      const r = await jsonblobFetch(blobId, 'GET');
      res.status(200).send(r.data);
    } else if (req.method === 'POST' && !isAdd) {
      await jsonblobFetch(blobId, 'PUT', req.body);
      res.status(200).json({ ok: true });
    } else if (req.method === 'POST' && isAdd) {
      const existing = await jsonblobFetch(blobId, 'GET');
      const data = JSON.parse(existing.data);
      data.push(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
      await jsonblobFetch(blobId, 'PUT', JSON.stringify(data));
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
