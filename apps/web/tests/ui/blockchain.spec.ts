import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { Wallet, JsonRpcProvider, getBytes, parseEther } from 'ethers';
import sharp from 'sharp';
import fs from 'node:fs';

const recording = process.env.RECORD_BLOCKCHAIN_DEMO === '1';
test.use({ video: recording ? { mode: 'on', size: { width: 1280, height: 800 } } : 'off' });

// Only the wallet extension boundary is supplied by the fixture. RPC, signatures,
// IPFS, contracts, API and database are real; no API responses are mocked.
test('wallet → IPFS → NFT → listing → escrow → release in the real UI', async ({ page, context }, testInfo) => {
  test.setTimeout(recording ? 420000 : 240000);
  const provider = new JsonRpcProvider('http://127.0.0.1:8545', undefined, { cacheTimeout: -1 });
  expect(Number((await provider.getNetwork()).chainId)).toBe(31337);
  const prisma = new PrismaClient(), tag = randomUUID(), password = 'Browser-chain-password-123';
  const seller = Wallet.createRandom().connect(provider), buyer = Wallet.createRandom().connect(provider);
  let active = seller;
  const ids: string[] = [];
  const pageErrors: string[] = [];
  const txHashes: string[] = [], chapters: { title: string; text: string }[] = [];
  async function chapter(title: string, text: string) {
    if (!recording) return;
    chapters.push({ title, text });
    await page.evaluate(({ title, text }) => {
      let caption = document.getElementById('demo-caption');
      if (!caption) { caption = document.createElement('aside'); caption.id = 'demo-caption'; document.body.appendChild(caption); }
      caption.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:99999;pointer-events:none;max-width:650px;background:#090b12f2;color:white;border:1px solid #6478ff;border-radius:16px;padding:16px 20px;font:16px/1.6 sans-serif;box-shadow:0 8px 40px #0008';
      caption.replaceChildren();
      const heading = document.createElement('strong'); heading.textContent = title;
      const paragraph = document.createElement('div'); paragraph.textContent = text;
      caption.append(heading, paragraph);
    }, { title, text });
    await page.waitForTimeout(21000);
    await page.locator('#demo-caption').evaluate(el => el.remove());
  }
  page.on('pageerror', e => pageErrors.push(e.message));
  async function login(email: string, destination: string) {
    await page.goto(`/en/login?next=${encodeURIComponent(destination)}`);
    await page.getByLabel('Email or phone number', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(destination + '$'));
  }
  async function connect() {
    await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await expect(page.getByText('Wallet linked', { exact: true })).toBeVisible();
  }
  try {
    const funding = await provider.getSigner(0);
    for (const wallet of [seller, buyer]) await (await funding.sendTransaction({ to: wallet.address, value: parseEther('3') })).wait();
    const users = [];
    for (let i = 0; i < 2; i++) {
      const salt = randomBytes(16).toString('hex'), hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
      const user = await prisma.user.create({ data: { email: `browser-chain-${i}-${tag}@example.test`, emailVerified: new Date(), name: `Chain tester ${i}`, passwordHash: `scrypt:${salt}:${hash}` } });
      ids.push(user.id); users.push(user);
    }
    await context.exposeBinding('testWalletRpc', async (_, request: { method: string; params?: any[] }) => {
      const params = request.params || [];
      if (['eth_accounts', 'eth_requestAccounts'].includes(request.method)) return [active.address];
      if (request.method === 'wallet_switchEthereumChain') {
        if (params[0].chainId !== '0x7a69') throw new Error('Wrong test chain');
        return null;
      }
      if (request.method === 'personal_sign') return active.signMessage(getBytes(params[0]));
      if (request.method === 'eth_sendTransaction') {
        const tx = params[0];
        if (tx.from.toLowerCase() !== active.address.toLowerCase()) throw new Error('Wrong signer');
        const submitted = await active.sendTransaction({ to: tx.to, data: tx.data, value: tx.value, gasLimit: tx.gas, gasPrice: tx.gasPrice, maxFeePerGas: tx.maxFeePerGas, maxPriorityFeePerGas: tx.maxPriorityFeePerGas });
        txHashes.push(submitted.hash); return submitted.hash;
      }
      return provider.send(request.method, params);
    });
    await context.addInitScript(() => {
      (window as any).ethereum = { request: (args: unknown) => (window as any).testWalletRpc(args), on: () => {}, removeListener: () => {} };
    });
    await login(users[0].email!, '/en/create-listing');
    await chapter('1. TrustChain — demo local', 'Hardhat chain 31337. Ví test ký tự động qua adapter EIP-1193; đây không phải MetaMask extension hoặc testnet. Các giao dịch, IPFS và database bên dưới là thật.');
    await page.locator('#listing-title').fill(recording ? 'TrustChain — đồng hồ minh họa' : `UI chain ${tag}`);
    await page.locator('#listing-description').fill('Browser test product, real IPFS and local blockchain.');
    await page.locator('#listing-price').fill('0.15');
    await page.locator('#listing-image-file').setInputFiles({ name: 'product.png', mimeType: 'image/png', buffer: await sharp({ create: { width: 128, height: 128, channels: 3, background: '#55d6c2' } }).png().toBuffer() });
    await chapter('2. Sản phẩm công khai và IPFS', 'Thông tin sản phẩm và ảnh minh họa sẽ được lưu thành bản nháp. Server chuẩn hóa ảnh, bỏ EXIF/GPS rồi pin ảnh và metadata. Không tự đưa địa chỉ hay email tài khoản lên IPFS.');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByRole('heading', { name: /Draft saved/ })).toBeVisible();
    const draft = await prisma.product.findFirstOrThrow({ where: { sellerId: users[0].id } });
    await page.goto('/en/profile');
    await expect(page.getByRole('heading', { name: 'Your drafts · Resume publishing' })).toBeVisible();
    await page.locator(`main a[href="/en/product/${draft.id}"]`).click();
    await chapter('3. Bản nháp có thể tiếp tục', 'Bản nháp chỉ chủ tài khoản nhìn thấy. Liên kết ví cần chữ ký có nonce một lần. Tiếp theo ví sẽ ký riêng ba giao dịch: mint, approve và đăng bán.');
    await connect();
    await page.getByRole('button', { name: 'Mint NFT & list', exact: true }).click();
    await expect(page.getByText('Listed on blockchain', { exact: true })).toBeVisible({ timeout: 90000 });
    const product = await prisma.product.findFirstOrThrow({ where: { sellerId: users[0].id } });
    expect(product.status).toBe('LISTED'); expect(product.nftTokenId).toBeTruthy();
    expect(product.imageUrl).toMatch(/^ipfs:\/\//);
    await chapter('4. NFT và listing đã tồn tại trên chain', `NFT #${product.nftTokenId}, listing #${product.listingId}. Web chỉ đánh dấu LISTED sau khi đọc sự kiện thật. Metadata chứa CID ảnh thay vì phụ thuộc URL ảnh bên ngoài.`);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('real-listing.png'), fullPage: true });
    await context.clearCookies(); active = buyer;
    await login(users[1].email!, `/en/product/${product.id}`);
    await connect();
    await chapter('5. Đổi sang người mua', 'Đây là tài khoản web và ví khác người bán. Mua qua Escrow gửi 0,15 ETH thử nghiệm; contract kiểm tra giá và chuyển NFT vào nơi ký quỹ trong cùng transaction.');
    await page.getByRole('button', { name: /Buy with Escrow/ }).click();
    await expect(page).toHaveURL(/\/en\/orders\/\d+$/, { timeout: 60000 });
    await expect(page.getByText('HELD', { exact: true })).toBeVisible();
    await chapter('6. Đang ký quỹ — HELD', 'Tiền và NFT đang do Escrow giữ. Chưa xác nhận nhận hàng thì chưa trả tiền theo luồng bình thường. Có thể mở tranh chấp bằng hash bằng chứng; nhánh đó được kiểm chứng trong bộ test.');
    await page.getByRole('button', { name: 'Received item · Release payment', exact: true }).click();
    await expect(page.getByText('RELEASED', { exact: true })).toBeVisible({ timeout: 60000 });
    await chapter('7. Giải ngân — RELEASED', 'Người mua đã ký xác nhận. Contract trả tiền ròng cho người bán, phí cho treasury và chuyển NFT cho người mua. Gas của giao dịch là khoản riêng so với phí giao thức 2,5%.');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('real-escrow.png'), fullPage: true });
    await page.goto('/en/nfts');
    await expect(page.getByRole('heading', { name: `NFT #${product.nftTokenId}`, exact: true })).toBeVisible();
    await page.locator(`main a[href="/en/verify/${product.nftTokenId}"]`).click();
    await expect(page.getByText(buyer.address, { exact: true })).toBeVisible();
    await expect(page.getByText('CID_VERIFIED', { exact: true })).toBeVisible();
    await chapter('8. Đối chiếu trực tiếp', 'Trang này đọc ownerOf và tokenURI từ RPC tại một block, rồi tính lại CID metadata. NFT chứng minh bản ghi số và quyền sở hữu, không tự chứng minh hàng vật lý chính hãng.');
    if (recording) {
      const { config } = await (await page.request.get('/api/chain')).json();
      const receipts = [];
      for (const hash of txHashes) { const r = await provider.getTransactionReceipt(hash); receipts.push({ hash, blockNumber: r?.blockNumber, gasUsed: r?.gasUsed.toString(), status: r?.status }); }
      fs.writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify({ recordedAt: new Date().toISOString(), environment: 'Local Hardhat, automatic EIP-1193 test wallet; not MetaMask or public testnet', config, productId: product.id, tokenId: product.nftTokenId, listingId: product.listingId, metadataUri: product.metadataUri, imageUri: product.imageUrl, seller: seller.address, buyer: buyer.address, receipts, chapters }, null, 2));
    }
    expect(pageErrors).toEqual([]);
  } finally {
    await prisma.product.deleteMany({ where: { sellerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect(); provider.destroy();
  }
});
