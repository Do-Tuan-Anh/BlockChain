import { test, expect } from '@playwright/test';
const hash = '0x2459b876d5adfbda56f2d14269f97ffb615e4485e168bddb691ec08fab951475';

test('order transaction link opens the scoped internal detail page', async ({ page }) => {
  await page.goto('/en/orders/4');
  const link = page.locator('main').getByRole('link', { name: hash, exact: true });
  await expect(link).toHaveAttribute('href', new RegExp(`/en/transactions/${hash}\\?scope=`));
  await link.click();
  await expect(page.getByRole('heading', { name: 'Transaction details', exact: true })).toBeVisible();
  await expect(page.getByTestId('transaction-status')).toHaveText('Transaction successful');
});

test('public transaction detail: receipt, bilingual themes, mobile layout and offline recovery', async ({ page, request }, info) => {
  const response = await request.get(`/api/chain/transactions/${hash}`);
  expect(response.ok()).toBeTruthy();
  const data = await response.json(); expect(data.status).toBe('success');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const locale of ['vi', 'en']) {
    await page.addInitScript(theme => localStorage.setItem('trustchain-theme', theme), locale === 'vi' ? 'dark' : 'light');
    await page.goto(`/${locale}/transactions/${hash}?scope=${encodeURIComponent(data.chain.scope)}`);
    await expect(page.getByTestId('transaction-status')).toHaveText(locale === 'vi' ? 'Giao dịch thành công' : 'Transaction successful');
    await expect(page.getByTestId('transaction-gas-fee')).toContainText('ETH');
    await expect(page.getByText(locale === 'vi' ? 'Người bán thực nhận:' : 'Seller proceeds:', { exact: false })).toContainText('19.5 ETH');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    const copy = page.getByRole('button', { name: locale === 'vi' ? 'Sao chép mã giao dịch' : 'Copy transaction hash' });
    await copy.focus(); await expect(copy).toBeFocused();
    await page.screenshot({ path: info.outputPath(`transaction-${locale}.png`), fullPage: true });
  }
  await page.route('**/api/chain/transactions/**', route => route.fulfill({ status: 503, json: { error: 'CHAIN_RPC_UNAVAILABLE' } }));
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('RPC is unavailable');
  await expect(page.getByTestId('transaction-status')).toHaveCount(0);
  await page.unroute('**/api/chain/transactions/**');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByTestId('transaction-status')).toHaveText('Transaction successful');
  await page.goto('/en/transactions/bad');
  await expect(page.locator('main').getByRole('alert')).toContainText('Invalid transaction hash');
  await page.goto(`/en/transactions/${hash}?scope=old`);
  await expect(page.locator('main').getByRole('alert')).toContainText('different deployment');
  await page.goto(`/en/transactions/0x${'f'.repeat(64)}`);
  await expect(page.getByTestId('transaction-status')).toHaveText('Transaction not found');
  expect(errors).toEqual([]);
});

test('receipt states, unknown logs and explorer configuration render safely', async ({ page, request }) => {
  const response = await request.get(`/api/chain/transactions/${hash}`);
  const original = await response.json(); expect(original.status).toBe('success');
  for (const status of ['failed', 'pending', 'reorg']) {
    const data = { ...original, status, confirmations: 0, confirmationSatisfied: false, events: [], receipt: status === 'failed' ? { ...original.receipt, status: 0 } : null };
    await page.route('**/api/chain/transactions/**', route => route.fulfill({ json: data }));
    await page.goto(`/en/transactions/${hash}`);
    await expect(page.getByTestId('transaction-status')).toHaveText({ failed: 'Transaction failed', pending: 'Awaiting receipt', reorg: 'Chain changed · checking again' }[status]!);
    await expect(page.getByText('Seller proceeds:', { exact: false })).toHaveCount(0);
    if (status !== 'failed') await expect(page.getByTestId('transaction-gas-fee')).toHaveCount(0);
    await page.unroute('**/api/chain/transactions/**');
  }
  await page.route('**/api/chain/transactions/**', route => route.fulfill({ json: { ...original, membership: 'before_deployment', chain: { ...original.chain, explorer: 'https://sepolia.etherscan.io' }, events: [...original.events, { index: 99, address: original.transaction.from, contractName: null, decoded: null, topics: [hash], data: '0x1234' }] } }));
  await page.goto(`/en/transactions/${hash}`);
  await expect(page.getByText('Undecoded event', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Open order/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open in explorer' })).toHaveAttribute('href', `https://sepolia.etherscan.io/tx/${hash}`);
});
