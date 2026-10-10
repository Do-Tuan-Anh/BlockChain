import { test, expect } from '@playwright/test';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

test('dark marketplace keeps listing, discovery, navigation and escrow interactions', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const prisma = new PrismaClient();
  const tag = randomUUID();
  const password = 'Redesign-test-password-123';
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
  const user = await prisma.user.create({ data: { email: `design-${tag}@example.test`, name: 'Design Test Seller', emailVerified: new Date(), passwordHash: `scrypt:${salt}:${hash}`, role: 'ADMIN' } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  async function checkLayout(name: string) {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  }
  try {
    await page.goto('/en/login?next=/en/create-listing');
    await page.getByLabel('Email or phone number', { exact: true }).fill(user.email!);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/create-listing$/);
    // The sign-in redirects the whole document. Wait for the session UI to hydrate.
    await expect(page.getByRole('button', { name: 'Account menu: Design Test Seller', exact: true })).toBeVisible();
    const title = `Design watch ${tag}`;
    await page.locator('#listing-title').fill(title);
    await page.locator('#listing-description').fill('A product created through the existing listing form during the redesign regression test.');
    await page.locator('#listing-category').selectOption('Watches');
    await page.locator('#listing-condition').selectOption('Like New');
    await page.locator('#listing-price').fill('0.25');
    await expect(page.locator('aside').getByText(title, { exact: true })).toBeVisible();
    await checkLayout('listing-form');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('main a[href*="/product/"]')).toBeVisible();
    const stored = await prisma.product.findFirstOrThrow({ where: { sellerId: user.id, title } });
    expect(stored.price).toBe('0.25');
    await page.locator('main a[href*="/product/"]').click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await checkLayout('product-detail');
    await page.getByRole('link', { name: user.name!, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/en/seller/${user.id}$`));
    await checkLayout('seller');

    await page.goto(`/en/explore?q=${encodeURIComponent(tag)}`);
    await expect(page.locator('.product-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.getByRole('button', { name: 'Electronics', exact: true }).click();
    await expect(page.locator('.product-card')).toHaveCount(0);
    await page.getByRole('button', { name: 'Watches', exact: true }).click();
    await expect(page.locator('.product-card')).toHaveCount(1);
    await page.locator('#product-condition').selectOption('Pristine');
    await expect(page.locator('.product-card')).toHaveCount(0);
    await page.locator('#product-condition').selectOption('All');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await checkLayout('explore');
    await page.locator('main input[type="search"]').fill('no-match-' + tag);
    await page.locator('main form[role="search"] button').click();
    await expect(page).toHaveURL(/q=no-match-/);
    await expect(page.locator('.product-card')).toHaveCount(0);

    await page.goto('/vi');
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.product-card').first()).toBeVisible();
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(9, 11, 18)');
    await checkLayout('home');
    if (testInfo.project.name === 'desktop') {
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: 768, height: 1024 });
      await checkLayout('home-tablet');
      await page.setViewportSize({ width: 360, height: 800 });
      await checkLayout('home-small-mobile');
      await page.setViewportSize(viewport);
    }
    // Preferences live in the account dropdown and survive a full page reload.
    await page.getByRole('button', { name: /^Menu tài khoản:/ }).click();
    await page.getByRole('menuitemradio', { name: 'Sáng', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('menuitemradio', { name: 'Sáng', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await checkLayout('home-light');
    await page.reload();
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(246, 247, 251)');
    await page.goto('/vi?view=marketplace');
    await page.getByRole('button', { name: /^Menu tài khoản:/ }).click();
    await checkLayout('preferences-light');
    await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
    await expect(page).toHaveURL(/\/en\?view=marketplace$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: /^Account menu:/ }).click();
    await expect(page.getByRole('menuitemradio', { name: 'English', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('menuitemradio', { name: 'Tiếng Việt', exact: true }).click();
    await expect(page).toHaveURL(/\/vi\?view=marketplace$/);
    for (const route of ['nfts', 'verify/1', 'settings', 'help', 'profile/edit', 'admin']) {
      await page.goto(`/en/${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      await checkLayout(route.replace('/', '-'));
    }
    await page.goto('/en/orders/1');
    await expect(page.locator('.escrow-step[aria-current="step"]')).toHaveText(/Shipped/i);
    await checkLayout('escrow-order');
    await page.getByRole('button', { name: /Confirm Delivery/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.escrow-step[aria-current="step"]')).toHaveText(/Completed|Released|Settled/i);
    await page.getByRole('button', { name: /: 4\/5$/ }).click();
    await expect(page.getByRole('button', { name: /: 4\/5$/ })).toHaveAttribute('aria-pressed', 'true');
    await checkLayout('review-dialog');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /Leave.*Review/i }).click();
    await page.locator('#review-comment').fill('Regression check of the existing review interaction.');
    await page.getByRole('button', { name: /Submit.*Review/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /^Account menu:/ }).click();
    // Arrow navigation includes the new theme and language options; End still reaches logout.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitemradio', { name: 'Light', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await checkLayout('preferences-dark');
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Sign out', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  } finally {
    await prisma.product.deleteMany({ where: { sellerId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
});
