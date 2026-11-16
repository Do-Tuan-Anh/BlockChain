import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { Wallet } from 'ethers';
import { randomUUID } from 'node:crypto';
import { readVerified } from '../../src/lib/ipfs.cjs';

test('Other categories: conditional input, validation, persistence, display and NFT metadata', async ({ page, context, baseURL }, info) => {
  test.setTimeout(120000);
  const db = new PrismaClient(), wallet = Wallet.createRandom(), tag = randomUUID();
  const user = await db.user.create({ data: { walletAddress: wallet.address.toLowerCase(), name: 'Category tester', profileSetupAt: new Date() } });
  try {
    const headers = { Origin: baseURL! };
    const challenge = await (await context.request.post('/api/auth/wallet-challenge', { headers, data: { address: wallet.address } })).json();
    const csrf = await (await context.request.get('/api/auth/csrf')).json();
    await context.request.post('/api/auth/callback/wallet', { headers, form: { csrfToken: csrf.csrfToken, address: wallet.address, message: challenge.message, signature: await wallet.signMessage(challenge.message), json: 'true' } });

    const fillProduct = async (title: string) => {
      await page.locator('#listing-title').fill(title);
      await page.locator('#listing-description').fill('Custom category integration test product.');
      await page.locator('#listing-price').fill('0.15');
    };
    const submit = () => page.locator('form button[type="submit"]').click();
    const create = async () => {
      const response = page.waitForResponse(r => r.url().endsWith('/api/products') && r.request().method() === 'POST');
      await submit();
      const result = await response;
      expect(result.status()).toBe(201);
      return (await result.json()).product;
    };
    for (const locale of ['vi', 'en']) {
      await page.goto(`/${locale}/create-listing`);
      const category = page.locator('#listing-category'), custom = page.locator('#listing-custom-category');
      await expect(category).toBeEnabled();
      await expect(category.locator('option').last()).toHaveText(locale === 'vi' ? 'Khác' : 'Other');
      await category.selectOption('Other');
      await expect(custom).toBeVisible(); await expect(custom).toHaveAttribute('required', '');
      await expect(custom).toHaveAttribute('maxlength', '80');
      await fillProduct(`Category ${locale} ${tag}`);
      await submit();
      expect(await custom.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
      await custom.fill('   ');
      await submit();
      await expect(page.locator('main').getByRole('alert')).toContainText(locale === 'vi' ? 'danh mục hợp lệ' : 'valid category');
      await expect(custom).toBeFocused();
      await expect(page.getByRole('heading', { name: /Draft saved|Bản nháp đã lưu/ })).toHaveCount(0);
      const name = locale === 'vi' ? 'Nhạc cụ & Sách' : 'Homeware / Handmade';
      await custom.fill(`  ${name}  `);
      await expect(page.locator('.listing-aside')).toContainText(name);
      await category.selectOption('Electronics'); await expect(custom).toHaveCount(0);
      await category.selectOption('Other'); await expect(custom).toHaveValue(`  ${name}  `);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`category-${locale}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      if (locale === 'en') await page.getByRole('checkbox').uncheck();
      const product = await create();
      expect(product.category).toBe(name);
      expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).category).toBe(name);
      await page.goto(`/${locale}/product/${product.id}`);
      await expect(page.getByText(name, { exact: true })).toBeVisible();
      await expect(page.getByText(`categories.${name}`, { exact: true })).toHaveCount(0);
      if (locale === 'vi') {
        const metadata = await context.request.post(`/api/products/${product.id}/metadata`, { headers, data: {} });
        expect(metadata.status()).toBe(200);
        const pinned = (await metadata.json()).product;
        expect(pinned.metadataJson.attributes.find((a: any) => a.trait_type === 'Category').value).toBe(name);
        const actual = JSON.parse((await readVerified(pinned.metadataUri)).toString('utf8'));
        expect(actual.attributes.find((a: any) => a.trait_type === 'Category').value).toBe(name);
        expect((await context.request.put(`/api/products/${product.id}`, { headers, data: { title: 'Change after snapshot' } })).status()).toBe(409);
      } else {
        await page.goto(`/en/explore?q=${encodeURIComponent(product.title)}`);
        await expect(page.getByText(name, { exact: true })).toBeVisible();
      }
    }

    // A hidden custom value must never override a selected built-in category.
    await page.goto('/en/create-listing');
    await page.locator('#listing-category').selectOption('Other');
    await page.locator('#listing-custom-category').fill('Ignore this hidden name');
    await page.locator('#listing-category').selectOption('Watches');
    await expect(page.locator('#listing-custom-category')).toHaveCount(0);
    await fillProduct(`Preset ${tag}`);
    const preset = await create(); expect(preset.category).toBe('Watches');
    await page.getByRole('button', { name: 'List Another Item', exact: true }).click();
    await page.locator('#listing-category').selectOption('Other');
    await expect(page.locator('#listing-custom-category')).toHaveValue('');

    // Server validation still applies when browser validation is bypassed.
    const data = { title: 'Invalid category', description: 'Validation fixture', condition: 'New in Box', price: '0.1', onchain: true };
    const before = await db.product.count({ where: { sellerId: user.id } });
    for (const category of ['', '   ', 'x'.repeat(81), 'Books\nOther', null]) {
      const response = await context.request.post('/api/products', { headers, data: { ...data, category } });
      expect(response.status()).toBe(400); expect(await response.json()).toEqual({ error: 'INVALID_CATEGORY' });
    }
    expect(await db.product.count({ where: { sellerId: user.id } })).toBe(before);
    const limit = await context.request.post('/api/products', { headers, data: { ...data, category: 'x'.repeat(80) } });
    expect(limit.status()).toBe(201);
    const longProduct = (await limit.json()).product;
    await page.goto(`/en/product/${longProduct.id}`);
    await expect(page.getByText('x'.repeat(80), { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  } finally {
    await db.product.deleteMany({ where: { sellerId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.verificationToken.deleteMany({ where: { identifier: `wallet-login:${wallet.address.toLowerCase()}` } });
    await db.$disconnect();
  }
});
