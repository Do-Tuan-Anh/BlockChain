import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

test('missing and expired email links explain recovery and resend verifies the existing account', async ({ page, request }) => {
  const prisma = new PrismaClient();
  const email = `verify-recovery-${randomUUID()}@example.test`;
  const password = 'Recovery-test-password-123';
  const linkFor = async () => {
    const { messages } = await (await request.get(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    for (const entry of messages) {
      const mail = await (await request.get(`http://localhost:8025/api/v1/message/${entry.ID}`)).json();
      const link = mail.Text.match(/https?:\/\/[^\s]+\/verify-email\?token=[a-f0-9]{64}/)?.[0];
      if (link) return link as string;
    }
    throw new Error('Verification email not found');
  };
  try {
    await page.goto('/vi/verify-email');
    await expect(page.locator('main').getByRole('alert')).toContainText('Liên kết thiếu mã xác thực');
    await expect(page.getByRole('button', { name: 'Gửi lại email xác thực', exact: true })).toBeEnabled();
    const origin = new URL(page.url()).origin;
    expect((await request.post('/api/auth/register', { headers: { origin }, data: { name: 'Verification Recovery', email, password } })).status()).toBe(202);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const expiredLink = await linkFor();
    await prisma.authToken.updateMany({ where: { userId: user.id, purpose: 'verify' }, data: { expiresAt: new Date(0) } });
    await page.goto(expiredLink);
    await expect(page.locator('main').getByRole('alert')).toContainText('Liên kết không hợp lệ');
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBeNull();
    await page.getByRole('button', { name: 'Gửi lại email xác thực', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Gửi lại email xác thực', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kiểm tra hộp thư của bạn', exact: true })).toBeVisible();
    const newLink = await linkFor();
    expect(newLink).not.toBe(expiredLink);
    await page.goto(newLink);
    await expect(page.getByRole('heading', { name: 'Email đã được xác thực', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Email đã được xác thực', exact: true })).toBeVisible();
    await page.locator('main').getByRole('link', { name: 'Đăng nhập', exact: true }).click();
    await page.getByLabel('Email hoặc số điện thoại', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/vi/seller/${user.id}$`));
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
});
