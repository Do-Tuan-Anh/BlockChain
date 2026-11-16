import { test, expect } from '@playwright/test';
import { Wallet, getBytes } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import sharp from 'sharp';

test('wallet-only authentication: signature security, existing profile, edit, account switch and logout', async ({ page, context, baseURL }) => {
  test.setTimeout(120000);
  const db = new PrismaClient(), first = Wallet.createRandom(), second = Wallet.createRandom();
  const origin = baseURL!;
  // A realistic stored avatar used to be copied into the encrypted JWT, causing HTTP 431.
  const photo = await sharp(randomBytes(256 * 256 * 3), { raw: { width: 256, height: 256, channels: 3 } }).webp({ quality: 82 }).toBuffer();
  const avatarUrl = `data:image/webp;base64,${photo.toString('base64')}`;
  expect(Buffer.byteLength(avatarUrl)).toBeGreaterThan(16384);
  const old = await db.user.create({ data: { walletAddress: first.address, name: `Existing ${randomUUID()}`, email: `wallet-${randomUUID()}@example.test`, bio: 'Preserved bio', avatarUrl, profileSetupAt: new Date() } });
  try {
    const post = (url: string, data: object) => context.request.post(url, { headers: { Origin: origin }, data });
    const challenge = async () => (await (await post('/api/auth/wallet-challenge', { address: first.address })).json()).message as string;
    const submit = async (message: string, signature: string) => {
      const csrf = await (await context.request.get('/api/auth/csrf')).json();
      await context.request.post('/api/auth/callback/wallet', { headers: { Origin: origin }, form: { csrfToken: csrf.csrfToken, address: first.address, message, signature, json: 'true' } });
      return (await (await context.request.get('/api/auth/session')).json()).user?.id;
    };
    const message = await challenge();
    expect(await submit(message, await second.signMessage(message))).toBeFalsy();
    expect(await submit(message, await first.signMessage(message))).toBe(old.id);
    const sessionCookies = (await context.cookies()).filter(cookie => cookie.name.startsWith('next-auth.session-token'));
    expect(sessionCookies).toHaveLength(1);
    expect(sessionCookies[0].name).toBe('next-auth.session-token');
    expect(Buffer.byteLength(sessionCookies[0].value)).toBeLessThan(2048);
    expect((await (await context.request.get('/api/auth/session')).json()).user.image).toBe(avatarUrl);
    // Sign out, then replay the consumed challenge: cannot create a new session.
    const csrf = await (await context.request.get('/api/auth/csrf')).json();
    await context.request.post('/api/auth/signout', { form: { csrfToken: csrf.csrfToken, json: 'true' } });
    expect(await submit(message, await first.signMessage(message))).toBeFalsy();
    const expired = await challenge();
    await db.verificationToken.updateMany({ where: { identifier: `wallet-login:${first.address.toLowerCase()}` }, data: { expires: new Date(0) } });
    expect(await submit(expired, await first.signMessage(expired))).toBeFalsy();
    expect((await context.request.post('/api/auth/wallet-challenge', { headers: { Origin: 'https://untrusted.example' }, data: { address: first.address } })).status()).toBe(403);
    expect((await post('/api/auth/register', {})).status()).toBe(410);
    expect(Object.keys(await (await context.request.get('/api/auth/providers')).json())).toEqual(['wallet']);
    await context.clearCookies();
    await page.exposeFunction('walletRequest', async ({ method, params }: { method: string; params?: string[] }) => {
      if (method === 'personal_sign') {
        const wallet = params?.[1]?.toLowerCase() === first.address.toLowerCase() ? first : second;
        return wallet.signMessage(getBytes(params![0]));
      }
      if (method === 'eth_chainId') return '0x7a69';
      throw new Error(method);
    });
    await context.addInitScript(({ first, second }) => {
      const handlers: Record<string, (() => void)[]> = {};
      const w = window as any;
      w.changeWallet = () => { sessionStorage.setItem('test-wallet', second); (handlers.accountsChanged || []).forEach(fn => fn()); };
      w.ethereum = {
        request: (args: any) => ['eth_accounts', 'eth_requestAccounts'].includes(args.method) ? Promise.resolve([sessionStorage.getItem('test-wallet') || first]) : w.walletRequest(args),
        on: (event: string, fn: () => void) => (handlers[event] ||= []).push(fn),
        removeListener: (event: string, fn: () => void) => { handlers[event] = (handlers[event] || []).filter(f => f !== fn); },
      };
    }, { first: first.address, second: second.address });
    await page.goto('/en/login?next=/en/profile/edit');
    await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign in with MetaMask', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Edit profile', exact: true })).toBeVisible();
    expect((await (await page.request.get('/api/me')).json()).user.id).toBe(old.id);
    const name = page.getByLabel('Display name', { exact: true });
    await name.fill('Wallet profile edited');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect.poll(async () => (await db.user.findUnique({ where: { id: old.id } }))?.name).toBe('Wallet profile edited');
    await page.evaluate(() => (window as any).changeWallet());
    await expect.poll(async () => (await (await page.request.get('/api/auth/session')).json()).user?.walletAddress).toBe(second.address.toLowerCase());
    await expect(page.getByRole('heading', { name: 'Set up your profile', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Do this later', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Edit profile', exact: true })).toBeVisible();
    const newProfile = (await (await page.request.get('/api/me')).json()).user;
    expect(newProfile.id).not.toBe(old.id); expect(newProfile.bio).toBeNull();
    expect((await db.user.findUnique({ where: { id: old.id } }))?.bio).toBe('Preserved bio');
    await page.reload(); await expect(page.getByRole('heading', { name: 'Edit profile', exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('wallet-profile.png'), fullPage: true });
    await page.getByRole('button', { name: /^Account menu:/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await expect.poll(async () => (await (await page.request.get('/api/auth/session')).json()).user?.id).toBeFalsy();
    expect((await page.request.get('/api/me')).status()).toBe(401);
  } finally {
    await db.verificationToken.deleteMany({ where: { identifier: { in: [`wallet-login:${first.address.toLowerCase()}`, `wallet-login:${second.address.toLowerCase()}`] } } });
    await db.user.deleteMany({ where: { OR: [{ id: old.id }, { walletAddress: second.address.toLowerCase() }] } });
    await db.$disconnect();
  }
});

test('wallet login supports VI/EN, legacy URLs, missing extension and cancelled signature', async ({ page }) => {
  for (const locale of ['vi', 'en']) {
    await page.goto(`/${locale}/register`);
    await expect(page.getByRole('heading', { name: locale === 'vi' ? 'Đăng nhập bằng MetaMask' : 'Sign in with MetaMask' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Sign in with MetaMask', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Install MetaMask');
  await page.screenshot({ path: test.info().outputPath('wallet-login.png'), fullPage: true });
  await page.evaluate(() => { (window as any).ethereum = { request: async () => { throw { code: 4001 }; } }; });
  await page.getByRole('button', { name: 'Sign in with MetaMask', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('cancelled');
  expect((await page.request.get('/api/me')).status()).toBe(401);
});
