import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { Wallet, JsonRpcProvider, parseEther } from 'ethers';

test('shared linked-wallet balance, offline recovery and account isolation', async ({ page, context }, testInfo) => {
  test.setTimeout(120000);
  const db = new PrismaClient(), rpc = new JsonRpcProvider('http://127.0.0.1:8545');
  const ids: string[] = [], password = 'Balance-demo-test-123';
  try {
    expect(Number((await rpc.getNetwork()).chainId)).toBe(31337);
    const users = [];
    for (let i = 0; i < 2; i++) {
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
      const user = await db.user.create({ data: { name: `Balance tester ${i}`, email: `balance-${randomUUID()}@example.test`, emailVerified: new Date(), walletAddress: Wallet.createRandom().address.toLowerCase(), passwordHash: `scrypt:${salt}:${hash}` } });
      ids.push(user.id); users.push(user);
    }
    await (await (await rpc.getSigner(0)).sendTransaction({ to: users[0].walletAddress!, value: parseEther('1.123456789') })).wait();
    const login = async (email: string, path: string) => {
      await page.goto(`/en/login?next=${encodeURIComponent(path)}`);
      await page.getByLabel('Email or phone number', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path + '$'), { timeout: 30000 });
    };
    await login(users[0].email!, '/en/nfts');
    const mainBalance = page.locator('main').getByTestId('wallet-balance');
    await expect(mainBalance).toHaveText('1.123456 test ETH', { timeout: 30000 });
    await expect(mainBalance).toHaveAttribute('title', '1.123456789 test ETH');
    await page.getByRole('button', { name: /^Account menu:/ }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByTestId('wallet-balance')).toHaveText('1.123456 test ETH');
    await page.route('**/api/chain/balance', route => route.fulfill({ status: 503, json: { error: 'CHAIN_BALANCE_UNAVAILABLE' } }));
    await menu.getByRole('menuitem', { name: 'Refresh wallet balance' }).click();
    await expect(menu.getByTestId('wallet-balance')).toHaveText('Balance unavailable');
    await expect(mainBalance).toHaveText('Balance unavailable');
    await page.unroute('**/api/chain/balance');
    await menu.getByRole('menuitem', { name: 'Refresh wallet balance' }).click();
    await expect(mainBalance).toHaveText('1.123456 test ETH');
    await expect(menu.getByTestId('wallet-balance')).toHaveText('1.123456 test ETH');
    await page.screenshot({ path: testInfo.outputPath('balance-menu.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.goto('/vi/transactions');
    await expect(mainBalance).toHaveText('1,123456 ETH thử nghiệm');
    await expect(page.getByTestId('history-outgoing')).toHaveText('−0 ETH');
    await expect(page.getByTestId('history-incoming')).toHaveText('+0 ETH');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('balance-history.png'), fullPage: true });
    await context.clearCookies();
    await login(users[1].email!, '/en/nfts');
    await expect(mainBalance).toHaveText('0 test ETH');
    await page.getByRole('button', { name: /^Account menu:/ }).click();
    await expect(menu.getByTestId('wallet-balance')).toHaveText('0 test ETH');
  } finally { await db.user.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect(); rpc.destroy(); }
});
