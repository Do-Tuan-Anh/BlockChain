import { test, expect } from '@playwright/test';
import { createRecoveryServer } from '../../../../scripts/repair-auth-cookies.cjs';

test('recover HTTP 431 from legacy cookie chunks without clearing unrelated browser data', async ({ page, context }) => {
  const server = createRecoveryServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Recovery server has no TCP address');
  const port = address.port;
  try {
    await context.addCookies([
      ...Array.from({ length: 12 }, (_, i) => ({ name: `next-auth.session-token.${i}`, value: 'x'.repeat(3900), domain: 'localhost', path: '/', httpOnly: true })),
      { name: 'other-local-app', value: 'keep-me', domain: 'localhost', path: '/' },
    ]);
    expect((await context.request.get('http://localhost:3000/vi')).status()).toBe(431);
    const response = await page.goto(`http://localhost:${port}/`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Đăng nhập bằng MetaMask', exact: true })).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.filter(cookie => cookie.name.startsWith('next-auth.session-token'))).toHaveLength(0);
    expect(cookies.find(cookie => cookie.name === 'other-local-app')?.value).toBe('keep-me');
    expect((await context.request.get('http://localhost:3000/vi')).status()).toBe(200);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
