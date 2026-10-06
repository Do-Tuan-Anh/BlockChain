import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

test('register, verify, sign in and recover password on responsive pages', async ({ page, request }, testInfo) => {
  const email = `ui-${randomUUID()}@example.test`;
  const password = 'UI-original-password-123';
  const prisma = new PrismaClient();
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  const linkFor = async (kind: string) => {
    const messages = await (await request.get(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    for (const entry of messages.messages) {
      const mail = await (await request.get(`http://localhost:8025/api/v1/message/${entry.ID}`)).json();
      const match = mail.Text.match(new RegExp(`https?://[^\\s]+/${kind}\\?token=[a-f0-9]{64}`));
      if (match) return match[0];
    }
    throw new Error('Expected email not found');
  };
  try {
    await page.goto('/en/register');
    await page.getByRole('heading', { name: 'Create your account', exact: true }).waitFor();
    await expect(page.getByRole('button', { name: 'Google', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Facebook', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('register.png'), fullPage: true });
    await page.getByLabel('Display name', { exact: true }).fill('UI Test Account');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByLabel('Confirm password', { exact: true }).fill('not-matching-password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Your passwords do not match.' })).toBeVisible();
    await page.getByLabel('Confirm password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox', exact: true })).toBeVisible();
    const emailedLink = await linkFor('verify-email');
    const token = new URL(emailedLink).searchParams.get('token')!;
    await page.goto(emailedLink);
    await expect(page.getByRole('heading', { name: 'Email đã được xác thực', exact: true })).toBeVisible();
    expect((await prisma.user.findUnique({ where: { email } }))?.emailVerified).not.toBeNull();
    await page.getByRole('contentinfo').getByRole('link', { name: 'English', exact: true }).click();
    expect(new URL(page.url()).searchParams.get('token')).toBe(token);
    await expect(page.getByRole('heading', { name: 'Email verified', exact: true })).toBeVisible();
    // Old email URLs must still preserve the token through the locale redirect.
    await page.goto(`/verify-email?token=${token}&next=/en/profile`);
    await expect(page.getByRole('heading', { name: 'Email đã được xác thực', exact: true })).toBeVisible();
    await page.getByRole('contentinfo').getByRole('link', { name: 'English', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Email verified', exact: true })).toBeVisible();
    await page.locator('main').getByRole('link', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fprofile$/);
    await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
    await page.getByLabel('Email or phone number', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/seller\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'UI Test Account', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('profile.png'), fullPage: true });
    await page.getByRole('button', { name: /^Account menu:/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto('/en/forgot-password');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Send reset link', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox', exact: true })).toBeVisible();
    const resetLink = await linkFor('reset-password');
    await page.goto(`/reset-password?token=${new URL(resetLink).searchParams.get('token')}`);
    await page.getByRole('contentinfo').getByRole('link', { name: 'English', exact: true }).click();
    expect(new URL(page.url()).searchParams.get('token')).toBe(new URL(resetLink).searchParams.get('token'));
    await page.getByLabel('Password', { exact: true }).fill('New-password-for-UI-456');
    await page.getByLabel('Confirm password', { exact: true }).fill('New-password-for-UI-456');
    await page.getByRole('button', { name: 'Save new password', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Password updated', exact: true })).toBeVisible();
    expect(failures).toEqual([]);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
});
