import { test, expect } from '@playwright/test';
import { Wallet, getBytes } from 'ethers';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('first-wallet profile setup: save, skip, returning users, permissions and durable state', async ({ page, context, baseURL }, info) => {
  test.setTimeout(120000);
  const db = new PrismaClient(), first = Wallet.createRandom(), second = Wallet.createRandom(), victim = Wallet.createRandom();
  let active = first;
  const unrelated = await db.user.create({ data: { walletAddress: victim.address.toLowerCase(), name: 'Unrelated existing profile', profileSetupAt: new Date() } });
  const wallets = [first, second, victim].map(wallet => wallet.address.toLowerCase());
  try {
    const post = (url: string) => page.request.post(url, { headers: { Origin: baseURL! } });
    expect((await post('/api/me/onboarding')).status()).toBe(401);
    await page.goto('/en/welcome');
    await expect(page.getByRole('heading', { name: 'Sign in with MetaMask', exact: true })).toBeVisible();
    await context.exposeBinding('onboardingWallet', async (_, { method, params = [] }: { method: string; params?: string[] }) => {
      if (['eth_requestAccounts', 'eth_accounts'].includes(method)) return [active.address];
      if (method === 'eth_chainId') return '0x7a69';
      if (method === 'personal_sign') return active.signMessage(getBytes(params[0]));
      throw new Error(method);
    });
    await context.addInitScript(() => {
      (window as any).ethereum = { request: (args: unknown) => (window as any).onboardingWallet(args), on: () => {}, removeListener: () => {} };
    });
    const login = async (locale = 'en', next?: string) => {
      await page.goto(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
      await page.getByRole('button', { name: locale === 'vi' ? 'Đăng nhập bằng MetaMask' : 'Sign in with MetaMask', exact: true }).click();
    };
    await login('en', '/en/explore');
    await expect(page.getByRole('heading', { name: 'Set up your profile', exact: true })).toBeVisible();
    await expect(page.getByTestId('profile-wallet-address')).toHaveText(first.address.toLowerCase());
    const profile = await db.user.findUniqueOrThrow({ where: { walletAddress: wallets[0] } });
    expect(profile.profileSetupAt).toBeNull();
    // Reapplying the upgrade must not silently dismiss setup for pending new users.
    await db.$executeRawUnsafe(readFileSync(path.resolve('prisma/onboarding-upgrade.sql'), 'utf8'));
    expect((await db.user.findUniqueOrThrow({ where: { id: profile.id } })).profileSetupAt).toBeNull();
    const invalid = await page.request.put('/api/me', { headers: { Origin: baseURL! }, data: { name: 'x', bio: '', completeOnboarding: true } });
    expect(invalid.status()).toBe(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: profile.id } })).profileSetupAt).toBeNull();
    const tampered = await page.request.put('/api/me', { headers: { Origin: baseURL! }, data: { name: 'Taken over', bio: '', completeOnboarding: true, userId: unrelated.id } });
    expect(tampered.status()).toBe(400);
    expect((await page.request.post('/api/me/onboarding', { headers: { Origin: 'https://untrusted.example' } })).status()).toBe(403);
    await page.getByLabel('Display name', { exact: true }).fill('Onboarding buyer');
    await page.locator('#profile-bio').fill('My first wallet profile');
    const photo = await sharp({ create: { width: 300, height: 180, channels: 3, background: '#6478ff' } }).png().toBuffer();
    await page.getByLabel('Choose profile photo', { exact: true }).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: photo });
    await expect(page.getByRole('button', { name: 'Save and get started', exact: true })).toBeEnabled();
    await page.screenshot({ path: info.outputPath('onboarding-en-dark.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.getByRole('button', { name: 'Save and get started', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/explore$/);
    const saved = await db.user.findUniqueOrThrow({ where: { id: profile.id } });
    expect(saved.name).toBe('Onboarding buyer'); expect(saved.bio).toBe('My first wallet profile');
    expect(saved.avatarUrl).toMatch(/^data:image\/webp;base64,/); expect(saved.profileSetupAt).not.toBeNull();
    expect((await (await page.request.get('/api/auth/session')).json()).user.needsProfileSetup).toBe(false);
    expect((await context.cookies()).filter(c => c.name.startsWith('next-auth.session-token'))).toHaveLength(1);
    // Clear browser cookies to prove the onboarding choice lives in DB, not browser storage.
    await context.clearCookies(); await login();
    await expect(page).toHaveURL(`${baseURL}/en`);
    await expect(page.getByRole('button', { name: 'Account menu: Onboarding buyer', exact: true })).toBeVisible();
    await page.goto('/en/welcome?next=%2F%2Fevil.example');
    await expect(page).toHaveURL(`${baseURL}/en`);
    await context.clearCookies(); active = second;
    await login('vi', '//evil.example');
    await expect(page.getByRole('heading', { name: 'Thiết lập trang cá nhân', exact: true })).toBeVisible();
    await expect(page.getByTestId('profile-wallet-address')).toHaveText(wallets[1]);
    await page.evaluate(() => { localStorage.setItem('trustchain-theme', 'light'); document.documentElement.dataset.theme = 'light'; });
    await page.screenshot({ path: info.outputPath('onboarding-vi-light.png'), fullPage: true });
    const defaultProfile = await db.user.findUniqueOrThrow({ where: { walletAddress: wallets[1] } });
    await page.route('**/api/me/onboarding', route => route.fulfill({ status: 503, json: { error: 'UNAVAILABLE' } }));
    await page.getByRole('button', { name: 'Để sau', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { id: defaultProfile.id } })).profileSetupAt).toBeNull();
    await page.unroute('**/api/me/onboarding');
    await page.getByRole('button', { name: 'Để sau', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/vi`);
    const skipped = await db.user.findUniqueOrThrow({ where: { id: defaultProfile.id } });
    expect(skipped.name).toBe(defaultProfile.name); expect(skipped.avatarUrl).toBeNull(); expect(skipped.profileSetupAt).not.toBeNull();
    await post('/api/me/onboarding');
    expect((await db.user.findUniqueOrThrow({ where: { id: skipped.id } })).profileSetupAt).toEqual(skipped.profileSetupAt);
    await context.clearCookies(); await login('vi'); await expect(page).toHaveURL(`${baseURL}/vi`);
    expect((await db.user.findUniqueOrThrow({ where: { id: unrelated.id } })).name).toBe('Unrelated existing profile');
  } finally {
    await db.verificationToken.deleteMany({ where: { identifier: { in: wallets.map(wallet => `wallet-login:${wallet}`) } } });
    await db.user.deleteMany({ where: { walletAddress: { in: wallets } } });
    await db.$disconnect();
  }
});
