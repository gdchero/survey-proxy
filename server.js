const http = require('http');
const https = require('https');

const BLOBS = {
  ai2607: '019f6fac-3c68-7838-9cff-a20515d3cac5',
  ai2603: '019f6fac-80a6-7e7d-b9ed-4fbbd6b268b4',
};

const PORT = process.env.PORT || 3000;

function jsonblobFetch(blobId, method, body) {
  return new Promise((resolve, reject) => {
    const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const u = new URL(req.url, `http://${req.headers.host}`);
  const parts = u.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'api' || !parts[1] || parts[2] !== 'data') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const classId = parts[1], isAdd = parts[3] === 'add';
  const blobId = BLOBS[classId];
  if (!blobId) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Unknown class' })); return; }

  try {
    if (req.method === 'GET') {
      const result = await jsonblobFetch(blobId, 'GET');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(result.data);
      return;
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      if (req.method === 'POST' && !isAdd) {
        await jsonblobFetch(blobId, 'PUT', body);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(body);
      } else if (req.method === 'POST' && isAdd) {
        const existing = await jsonblobFetch(blobId, 'GET');
        const data = JSON.parse(existing.data);
        data.push(JSON.parse(body));
        await jsonblobFetch(blobId, 'PUT', JSON.stringify(data));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      }
    });
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`Ready on ${PORT}`));
