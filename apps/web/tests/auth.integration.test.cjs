const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const mailBase = process.env.TEST_MAIL_URL || 'http://localhost:8025';

class Client {
  cookies = new Map();
  async request(path, options = {}) {
    const response = await fetch(`${base}${path}`, { ...options, redirect: 'manual', headers: {
      origin: new URL(base).origin, cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...options.headers,
    } });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0], index = pair.indexOf('=');
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return response;
  }
  post(path, body) { return this.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  async login(identifier, password) {
    const { csrfToken } = await (await this.request('/api/auth/csrf')).json();
    const response = await this.request('/api/auth/callback/credentials', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, identifier, password, callbackUrl: `${base}/profile`, json: 'true' }),
    });
    return response.json();
  }
}
async function mailLink(email, kind) {
  const response = await fetch(`${mailBase}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  assert.equal(response.status, 200);
  const { messages } = await response.json();
  for (const message of messages || []) {
    const data = await (await fetch(`${mailBase}/api/v1/message/${message.ID}`)).json();
    const match = data.Text?.match(new RegExp(`https?://[^\\s]+/${kind}\\?token=([a-f0-9]{64})`));
    if (match) return match[1];
  }
  assert.fail(`Expected ${kind} email`);
}

test('authentication, recovery and product ownership against PostgreSQL and Mailpit', { timeout: 120000 }, async () => {
  const prisma = new PrismaClient();
  const marker = randomUUID().replaceAll('-', '');
  const email = `auth-${marker}@example.test`, otherEmail = `other-${marker}@example.test`;
  const phone = `09${randomInt(10000000, 99999999)}`;
  const password = 'Original-password-123!', replacement = 'Replacement-password-456!';
  const client = new Client(), other = new Client(), guest = new Client();
  const payload = { name: 'Authentication Test', email, phone, password, role: 'ADMIN' };
  try {
    assert.equal((await guest.request('/api/me')).status, 401);
    assert.equal((await guest.post('/api/products', {})).status, 401);
    const redirect = await guest.request('/profile');
    assert.equal(redirect.status, 307); assert.ok(redirect.headers.get('location').includes('/login'));
    assert.equal((await guest.request('/api/auth/register', { method: 'POST', headers: { origin: 'https://foreign.example', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).status, 403);
    assert.equal((await client.post('/api/auth/register', { ...payload, password: 'short' })).status, 400);
    assert.equal((await client.post('/api/auth/register', payload)).status, 202);
    let user = await prisma.user.findUnique({ where: { email } });
    assert.equal(user.role, 'BUYER'); assert.equal(user.phone, `+84${phone.slice(1)}`);
    assert.notEqual(user.passwordHash, password); assert.ok(user.passwordHash.startsWith('scrypt:'));
    assert.equal((await client.post('/api/auth/register', payload)).status, 202);
    assert.equal(await prisma.user.count({ where: { email } }), 1);
    assert.match((await client.login(email, password)).url, /EMAIL_NOT_VERIFIED/);
    const verification = await mailLink(email, 'verify-email');
    assert.equal(await prisma.authToken.count({ where: { tokenHash: verification } }), 0);
    assert.equal((await client.post('/api/auth/resend-verification', { email })).status, 202);
    const resent = await mailLink(email, 'verify-email');
    assert.notEqual(verification, resent);
    assert.equal((await client.post('/api/auth/reset-password', { token: verification, password: replacement })).status, 400);
    const verified = await Promise.all([
      client.post('/api/auth/verify-email', { token: verification }),
      client.post('/api/auth/verify-email', { token: verification }),
    ]);
    assert.deepEqual(verified.map(response => response.status), [200, 200]);
    const verifiedAt = (await prisma.user.findUnique({ where: { email } })).emailVerified.getTime();
    assert.equal((await client.post('/api/auth/verify-email', { token: verification })).status, 200);
    assert.equal((await client.post('/api/auth/verify-email', { token: resent })).status, 200);
    assert.equal((await prisma.user.findUnique({ where: { email } })).emailVerified.getTime(), verifiedAt);
    assert.match((await client.login(email, 'wrong-password')).url, /CredentialsSignin/);
    assert.ok(!(await client.login(email.toUpperCase(), password)).url.includes('error='));
    const session = await (await client.request('/api/auth/session')).json();
    assert.equal(session.user.id, user.id);
    const me = await (await client.request('/api/me')).json();
    assert.equal(me.user.email, email); assert.ok(!JSON.stringify(me).includes('passwordHash'));
    assert.equal((await client.request('/admin')).status, 307);
    assert.equal((await client.request('/api/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Name', bio: '', role: 'ADMIN' }) })).status, 400);

    assert.equal((await other.post('/api/auth/register', { name: 'Other User', email: otherEmail, password })).status, 202);
    assert.equal((await other.post('/api/auth/verify-email', { token: await mailLink(otherEmail, 'verify-email') })).status, 200);
    await other.login(otherEmail, password);
    const otherUser = await prisma.user.findUnique({ where: { email: otherEmail } });
    const productResponse = await client.post('/api/products', { title: `Product ${marker}`, description: 'Private ownership test', category: 'Fashion', condition: 'Fair', price: '0.125', sellerId: otherUser.id });
    assert.equal(productResponse.status, 201);
    const { product } = await productResponse.json(); assert.equal(product.sellerId, user.id);
    const catalog = await (await guest.request('/api/products?category=Fashion&condition=Fair')).json();
    assert.ok(catalog.products.some(item => item.id === product.id));
    assert.equal((await (await guest.request(`/api/products/${product.id}`)).json()).product.title, `Product ${marker}`);
    assert.ok((await (await client.request('/api/me')).json()).user.products.some(item => item.id === product.id));
    assert.ok(!(await (await other.request('/api/me')).json()).user.products.some(item => item.id === product.id));
    assert.equal((await other.request(`/api/products/${product.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Hijacked' }) })).status, 403);
    await prisma.user.update({ where: { id: user.id }, data: { walletAddress: `test-${marker}` } });
    const publicProfile = JSON.stringify(await (await guest.request(`/api/users/test-${marker}`)).json());
    for (const privateField of ['passwordHash', email, phone, 'sessionVersion', 'accounts']) assert.ok(!publicProfile.includes(privateField));

    const known = await client.post('/api/auth/forgot-password', { email });
    const unknown = await client.post('/api/auth/forgot-password', { email: `missing-${marker}@example.test` });
    assert.equal(known.status, unknown.status); assert.deepEqual(await known.json(), await unknown.json());
    const reset = await mailLink(email, 'reset-password');
    assert.equal((await client.post('/api/auth/reset-password', { token: reset, password: replacement })).status, 200);
    assert.equal((await client.post('/api/auth/reset-password', { token: reset, password })).status, 400);
    assert.equal((await client.request('/api/me')).status, 401);
    assert.match((await client.login(email, password)).url, /CredentialsSignin/);
    assert.ok(!(await client.login(phone, replacement)).url.includes('error='));
    assert.equal((await client.request('/api/me')).status, 200);
    await client.post('/api/auth/forgot-password', { email });
    const expired = await mailLink(email, 'reset-password');
    await prisma.authToken.updateMany({ where: { userId: user.id, purpose: 'reset' }, data: { expiresAt: new Date(0) } });
    assert.equal((await client.post('/api/auth/reset-password', { token: expired, password })).status, 400);
    const { csrfToken } = await (await client.request('/api/auth/csrf')).json();
    await client.request('/api/auth/signout', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken, json: 'true' }) });
    assert.equal((await client.request('/api/me')).status, 401);
    for (let i = 0; i < 11; i++) await guest.login(`limit-${marker}@example.test`, 'wrong-password');
    assert.match((await guest.login(`limit-${marker}@example.test`, 'wrong-password')).url, /RATE_LIMITED/);
    for (const path of ['/en/login', '/en/register', '/en/forgot-password', '/en/verify-email', '/en/reset-password']) assert.equal((await guest.request(path)).status, 200);
  } finally {
    const ids = (await prisma.user.findMany({ where: { email: { in: [email, otherEmail] } }, select: { id: true } })).map(user => user.id);
    await prisma.product.deleteMany({ where: { sellerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
