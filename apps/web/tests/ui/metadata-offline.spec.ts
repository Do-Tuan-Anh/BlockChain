import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { Wallet } from 'ethers';

test('metadata API reports bounded RPC outage and preserves the draft', async ({ request, baseURL }) => {
  test.skip(process.env.TEST_METADATA_OFFLINE !== '1', 'Run against a test server configured with an unreachable CHAIN_RPC_URL.');
  const db = new PrismaClient(), wallet = Wallet.createRandom();
  const user = await db.user.create({ data: { walletAddress: wallet.address.toLowerCase(), profileSetupAt: new Date() } });
  const product = await db.product.create({ data: { sellerId: user.id, title: 'Metadata outage test', description: 'Disposable fixture', price: '0.1', condition: 'New', category: 'Other' } });
  try {
    const post = (url: string, data?: object) => request.post(url, { headers: { Origin: baseURL! }, data });
    const challenge = await (await post('/api/auth/wallet-challenge', { address: wallet.address })).json();
    const csrf = await (await request.get('/api/auth/csrf')).json();
    await request.post('/api/auth/callback/wallet', { headers: { Origin: baseURL! }, form: { csrfToken: csrf.csrfToken, address: wallet.address, message: challenge.message, signature: await wallet.signMessage(challenge.message), json: 'true' } });
    expect((await post('/api/products/not-owned/metadata', {})).status()).toBe(404);
    const start = Date.now();
    const response = await post(`/api/products/${product.id}/metadata`, {});
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: 'CHAIN_RPC_UNAVAILABLE' });
    expect(Date.now() - start).toBeLessThan(10000);
    expect(await db.product.findUnique({ where: { id: product.id } })).toEqual(product);
  } finally {
    await db.product.delete({ where: { id: product.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.verificationToken.deleteMany({ where: { identifier: `wallet-login:${wallet.address.toLowerCase()}` } });
    await db.$disconnect();
  }
});
