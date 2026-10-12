const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { pinBytes, readVerified } = require('../src/lib/ipfs.cjs');
async function server(handler) {
  const instance = http.createServer(handler);
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${instance.address().port}`, close: () => new Promise(resolve => { instance.closeAllConnections(); instance.close(resolve); }) };
}
test('reject invalid IPFS paths without fetching arbitrary URLs', async () => {
  await assert.rejects(() => readVerified('http://127.0.0.1/private'), /INVALID_IPFS_URI/);
  await assert.rejects(() => readVerified('ipfs://../../private'), /INVALID_IPFS_URI/);
});
test('detect a tampered gateway response by computing its CID with the real importer', async () => {
  const primary = process.env.IPFS_API_URL || 'http://127.0.0.1:5001';
  const backup = process.env.IPFS_BACKUP_API_URL; delete process.env.IPFS_BACKUP_API_URL;
  const uri = await pinBytes(Buffer.from('{"value":"original"}'));
  const proxy = await server(async (req, res) => {
    if (req.url.startsWith('/api/v0/cat')) { res.end('{"value":"tampered"}'); return; }
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const upstream = await fetch(primary + req.url, { method: 'POST', body: Buffer.concat(chunks), headers: { 'content-type': req.headers['content-type'] } });
      res.writeHead(upstream.status); res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.writeHead(500); res.end(); }
  });
  try { process.env.IPFS_API_URL = proxy.url; await assert.rejects(() => readVerified(uri), /IPFS_CONTENT_HASH_MISMATCH/); }
  finally { process.env.IPFS_API_URL = primary; if (backup) process.env.IPFS_BACKUP_API_URL = backup; await proxy.close(); }
});
test('configured replica failures do not report pin success', async () => {
  const backup = process.env.IPFS_BACKUP_API_URL;
  const unavailable = await server((_req, res) => { res.writeHead(503); res.end(); });
  try { process.env.IPFS_BACKUP_API_URL = unavailable.url; await assert.rejects(() => pinBytes(Buffer.from('replica failure test')), /IPFS_ADD_FAILED/); }
  finally { if (backup) process.env.IPFS_BACKUP_API_URL = backup; else delete process.env.IPFS_BACKUP_API_URL; await unavailable.close(); }
});
