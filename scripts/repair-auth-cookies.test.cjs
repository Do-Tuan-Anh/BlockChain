const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRecoveryServer, expiredAuthCookies } = require('./repair-auth-cookies.cjs');
test('expires only auth session/callback cookies including legacy chunks', () => {
  const values = expiredAuthCookies('next-auth.session-token.0=secret; next-auth.session-token.1=secret; theme=dark; another-app=private; next-auth.csrf-token=csrf');
  assert.equal(values.length, 4);
  assert.ok(values.every(v => v.includes('Max-Age=0')));
  assert.ok(values.every(v => !/secret|theme|another-app|csrf/.test(v)));
});
test('loopback recovery accepts an oversized cookie header, redirects safely and rejects other hosts', async () => {
  const server = createRecoveryServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const request = headers => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/', headers }, res => {
      res.resume(); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    }).on('error', reject);
  });
  try {
    const response = await request({ Cookie: Array.from({ length: 10 }, (_, i) => `next-auth.session-token.${i}=${'x'.repeat(3900)}`).join('; ') });
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, 'http://localhost:3000/vi/login');
    assert.equal(response.headers['set-cookie'].length, 12);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal((await request({ Host: 'evil.example' })).status, 404);
    assert.equal((await request({ 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'no-cors' })).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
