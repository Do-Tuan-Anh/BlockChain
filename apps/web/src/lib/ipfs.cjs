// Kubo RPC stays server-side. Identical importer options make verification reproducible.
const CID = /^b[a-z2-7]{20,120}$/;
const IMPORT_OPTIONS = 'cid-version=1&raw-leaves=true&hash=sha2-256&chunker=size-262144&wrap-with-directory=false';
function endpoints() {
  return [{ url: process.env.IPFS_API_URL || 'http://127.0.0.1:5001', auth: process.env.IPFS_API_AUTHORIZATION },
    ...(process.env.IPFS_BACKUP_API_URL ? [{ url: process.env.IPFS_BACKUP_API_URL, auth: process.env.IPFS_BACKUP_API_AUTHORIZATION }] : [])];
}
async function rpc(endpoint, method, query = '', body) {
  const response = await fetch(`${endpoint.url.replace(/\/$/, '')}/api/v0/${method}?${query}`, { method: 'POST', body, headers: endpoint.auth ? { Authorization: endpoint.auth } : {}, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`IPFS_${method.replace(/\//g, '_').toUpperCase()}_FAILED`);
  return response;
}
async function bounded(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('IPFS_CONTENT_TOO_LARGE'); }
  if (!response.body) throw new Error('IPFS_EMPTY_RESPONSE');
  const reader = response.body.getReader(), parts = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('IPFS_CONTENT_TOO_LARGE'); }
      parts.push(value);
    }
    return Buffer.concat(parts);
  } finally { reader.releaseLock(); }
}
function cidFromUri(uri) {
  const cid = typeof uri === 'string' && uri.startsWith('ipfs://') ? uri.slice(7) : '';
  if (!CID.test(cid)) throw new Error('INVALID_IPFS_URI');
  return cid;
}
async function addAt(endpoint, bytes, onlyHash = false) {
  const form = new FormData(); form.append('file', new Blob([bytes]), 'content');
  const result = await (await rpc(endpoint, 'add', `${IMPORT_OPTIONS}&pin=${!onlyHash}&only-hash=${onlyHash}`, form)).json();
  if (!CID.test(result.Hash)) throw new Error('INVALID_CID');
  return result.Hash;
}
async function pinBytes(bytes) {
  let cid;
  for (const endpoint of endpoints()) {
    const next = await addAt(endpoint, bytes);
    if (cid && cid !== next) throw new Error('IPFS_REPLICA_CID_MISMATCH');
    cid = next;
  }
  return `ipfs://${cid}`;
}
async function readVerified(uri, limit = 65536) {
  const cid = cidFromUri(uri); let failure;
  for (const endpoint of endpoints()) {
    try {
      const bytes = await bounded(await rpc(endpoint, 'cat', `arg=${cid}`), limit);
      if (await addAt(endpoint, bytes, true) !== cid) throw new Error('IPFS_CONTENT_HASH_MISMATCH');
      return bytes;
    } catch (error) { failure = error; }
  }
  throw failure || new Error('IPFS_UNAVAILABLE');
}
module.exports = { CID, IMPORT_OPTIONS, endpoints, rpc, bounded, cidFromUri, pinBytes, readVerified };
