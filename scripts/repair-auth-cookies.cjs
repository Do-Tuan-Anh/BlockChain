// Temporary, loopback-only recovery for oversized legacy NextAuth cookies (HTTP 431).
// Next.js cannot clear these itself because Node rejects the request before routing it.
const http = require('node:http');
const authCookie = /^(?:__Secure-)?next-auth\.(?:session-token|callback-url)(?:\.\d{1,3})?$/;
function expiredAuthCookies(header = '') {
  const names = new Set(['next-auth.session-token', 'next-auth.callback-url']);
  for (const item of header.split(';')) {
    const name = item.trim().split('=', 1)[0];
    if (authCookie.test(name)) names.add(name);
  }
  return [...names].map(name => `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${name.startsWith('__Secure-') ? '; Secure' : ''}`);
}
function createRecoveryServer() {
  return http.createServer({ maxHeaderSize: 1024 * 1024, requestTimeout: 10000, headersTimeout: 10000 }, (req, res) => {
    const port = res.socket.localPort;
    if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host) || req.url !== '/' || req.method !== 'GET') {
      res.writeHead(404); res.end(); return;
    }
    if (req.headers['sec-fetch-site'] === 'cross-site' && req.headers['sec-fetch-mode'] !== 'navigate') {
      res.writeHead(403); res.end(); return;
    }
    res.writeHead(302, {
      'Set-Cookie': expiredAuthCookies(req.headers.cookie),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      Location: 'http://localhost:3000/vi/login',
    });
    res.end();
  });
}
if (require.main === module) {
  const server = createRecoveryServer();
  server.on('error', error => { console.error(`Cookie recovery could not start: ${error.code || 'ERROR'}`); process.exitCode = 1; });
  server.listen(3002, '127.0.0.1', () => {
    console.log('Open http://localhost:3002/ in the browser showing HTTP 431, then sign in again.');
    console.log('Only TrustChain/NextAuth login cookies are expired. Profiles, products and wallet keys are unchanged.');
    console.log('This temporary local service closes after 10 minutes.');
    setTimeout(() => server.close(), 10 * 60 * 1000).unref();
  });
}
module.exports = { createRecoveryServer, expiredAuthCookies };
