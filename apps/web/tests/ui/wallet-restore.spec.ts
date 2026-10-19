import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { Wallet, JsonRpcProvider } from 'ethers';

test('restores only an authorized matching wallet without prompting or signing', async ({ page, context }) => {
  test.setTimeout(120000);
  const prisma = new PrismaClient(), provider = new JsonRpcProvider('http://127.0.0.1:8545');
  const wallet = Wallet.createRandom().address.toLowerCase(), other = Wallet.createRandom().address;
  const password = 'Restore-wallet-test-123', salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
  const user = await prisma.user.create({ data: { email: `restore-${randomUUID()}@example.test`, name: 'Restore test', emailVerified: new Date(), walletAddress: wallet, passwordHash: `scrypt:${salt}:${hash}` } });
  let accounts = [wallet], chainId = '0x7a69';
  const prompted: string[] = [];
  try {
    await context.exposeBinding('restoreRpc', async (_, request: { method: string; params?: any[] }) => {
      if (request.method === 'eth_accounts') return accounts;
      if (request.method === 'eth_chainId') return chainId;
      if (request.method === 'eth_getBlockByNumber') return provider.send(request.method, request.params || []);
      prompted.push(request.method); throw new Error('Unexpected interactive wallet request');
    });
    await context.addInitScript(() => { (window as any).ethereum = { request: (request: unknown) => (window as any).restoreRpc(request), on: () => {}, removeListener: () => {} }; });
    await page.goto('/en/login?next=/en/nfts');
    await page.getByLabel('Email or phone number', { exact: true }).fill(user.email!);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/nfts$/, { timeout: 30000 });
    const panel = page.getByRole('region', { name: 'Blockchain wallet', exact: true });
    await expect(panel.getByRole('button', { name: 'Reconnect wallet', exact: true })).toBeVisible();
    await page.reload();
    await expect(panel.getByRole('button', { name: 'Reconnect wallet', exact: true })).toBeVisible();
    accounts = [other]; await page.reload();
    await expect(panel.getByRole('button', { name: 'Connect wallet', exact: true })).toBeVisible();
    await expect(panel.getByTestId('wallet-link-status')).toHaveText('Wallet associated');
    accounts = [wallet]; chainId = '0x1'; await page.reload();
    await expect(panel.getByRole('button', { name: 'Connect wallet', exact: true })).toBeVisible();
    chainId = '0x7a69'; accounts = []; await page.reload();
    await expect(panel.getByRole('button', { name: 'Connect wallet', exact: true })).toBeVisible();
    accounts = [wallet]; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(panel.getByRole('button', { name: 'Reconnect wallet', exact: true })).toBeVisible();
    expect(prompted).toEqual([]);
  } finally { await prisma.user.delete({ where: { id: user.id } }); await prisma.$disconnect(); provider.destroy(); }
});
