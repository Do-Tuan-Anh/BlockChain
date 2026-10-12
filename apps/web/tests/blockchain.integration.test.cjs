const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, scryptSync } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const sharp = require('sharp');
const { PrismaClient } = require('@prisma/client');
const { Wallet, Contract, Interface, parseEther, keccak256, toUtf8Bytes } = require('ethers');
const { config, providerFor, abis } = require('../src/lib/chain/runtime.cjs');
const { syncChain } = require('../src/lib/chain/indexer.cjs');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
class Client {
  cookies = new Map();
  async request(path, options = {}) {
    const res = await fetch(base + path, { ...options, redirect: 'manual', headers: { origin: new URL(base).origin, cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...options.headers } });
    for (const item of res.headers.getSetCookie()) { const pair = item.split(';')[0], index = pair.indexOf('='); this.cookies.set(pair.slice(0, index), pair.slice(index + 1)); }
    return res;
  }
  post(path, body) { return this.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  async login(email, password) {
    const { csrfToken } = await (await this.request('/api/auth/csrf')).json();
    await this.request('/api/auth/callback/credentials', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken, identifier: email, password, json: 'true' }) });
    assert.ok((await (await this.request('/api/auth/session')).json()).user.id);
  }
}
test('real wallet association, IPFS, escrow, arbitration, durable indexing and reorg recovery', { timeout: 240000 }, async () => {
  const prisma = new PrismaClient(), c = config(), provider = providerFor(c);
  assert.equal(c.chainId, 31337, 'This test must only run on local Hardhat.');
  const users = [], products = [], tag = randomUUID(), password = 'Chain-test-password-123!';
  const seller = Wallet.createRandom().connect(provider), buyer = Wallet.createRandom().connect(provider);
  const owner = await provider.getSigner(0), arbitrator = await provider.getSigner(c.arbitrator);
  const client = new Client(), outsider = new Client();
  const nft = new Contract(c.contracts.MarketplaceNFT, abis.MarketplaceNFT, seller);
  const market = new Contract(c.contracts.Marketplace, abis.Marketplace, seller);
  const escrow = new Contract(c.contracts.Escrow, abis.Escrow, buyer);
  const disputes = new Contract(c.contracts.DisputeResolution, abis.DisputeResolution, buyer);
  const event = (receipt, name, contract) => receipt.logs.filter(l => l.address.toLowerCase() === contract.target.toLowerCase()).map(l => { try { return contract.interface.parseLog(l); } catch { return null; } }).find(l => l?.name === name).args;
  async function sync() { return syncChain(prisma, { config: c, provider }); }
  async function row(kind, key) { return (await prisma.chainRecord.findUniqueOrThrow({ where: { scope_kind_key: { scope: c.scope, kind, key: String(key) } } })).data; }
  try {
    for (const wallet of [seller, buyer]) await (await owner.sendTransaction({ to: wallet.address, value: parseEther('5') })).wait();
    for (const [i, agent] of [client, outsider].entries()) {
      const salt = randomBytes(16).toString('hex');
      const user = await prisma.user.create({ data: { email: `chain-${i}-${tag}@example.test`, emailVerified: new Date(), passwordHash: `scrypt:${salt}:${scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex')}` } });
      users.push(user.id); await agent.login(user.email, password);
    }
    assert.equal((await new Client().post('/api/chain/sync', {})).status, 401);
    const challenge = await (await client.post('/api/chain/wallet', { address: seller.address })).json();
    const signature = await seller.signMessage(challenge.message);
    assert.equal((await outsider.post('/api/chain/wallet', { address: seller.address, message: challenge.message, signature })).status, 400);
    assert.equal((await client.post('/api/chain/wallet', { address: seller.address, message: challenge.message, signature })).status, 200);
    assert.equal((await client.post('/api/chain/wallet', { address: seller.address, message: challenge.message, signature })).status, 400, 'replay rejected');
    assert.equal((await client.post('/api/chain/wallet', { address: buyer.address })).status, 409, 'cannot silently rebind seller');
    const create = await client.post('/api/products', { title: `Chain integration ${tag}`, description: 'Public product description', category: 'Watches', condition: 'Good', price: '0.2', onchain: true });
    assert.equal(create.status, 201);
    let product = (await create.json()).product; products.push(product.id);
    assert.equal(product.status, 'DRAFT');
    const photo = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#6478ff' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const imageBody = { image: `data:image/jpeg;base64,${photo.toString('base64')}` };
    assert.equal((await outsider.post(`/api/products/${product.id}/image`, imageBody)).status, 404);
    assert.equal((await client.post(`/api/products/${product.id}/image`, { image: 'data:image/png;base64,bm90LWFuLWltYWdl' })).status, 400);
    const uploaded = await client.post(`/api/products/${product.id}/image`, imageBody);
    assert.equal(uploaded.status, 200, await uploaded.clone().text());
    const imageUri = (await uploaded.json()).product.imageUrl;
    assert.match(imageUri, /^ipfs:\/\/b/);
    const imageResponse = await fetch(`${base}/api/ipfs/${imageUri.slice(7)}`);
    assert.equal(imageResponse.status, 200);
    const imageInfo = await sharp(Buffer.from(await imageResponse.arrayBuffer())).metadata();
    assert.equal(imageInfo.format, 'webp'); assert.equal(imageInfo.exif, undefined); assert.equal(imageInfo.orientation, undefined);
    assert.equal((await outsider.post(`/api/products/${product.id}/metadata`, {})).status, 404);
    const pinned = await client.post(`/api/products/${product.id}/metadata`, {});
    assert.equal(pinned.status, 200, await pinned.clone().text()); product = (await pinned.json()).product;
    assert.match(product.metadataUri, /^ipfs:\/\/b/);
    assert.ok(!JSON.stringify(product).includes('passwordHash'));
    const metadata = await (await fetch(`http://localhost:8080/ipfs/${product.metadataUri.slice(7)}`)).json();
    assert.equal(metadata.name, product.title); assert.ok(!JSON.stringify(metadata).includes('@example.test'));
    assert.equal(metadata.image, imageUri);
    assert.equal((await client.post(`/api/products/${product.id}/image`, imageBody)).status, 409);
    const backup = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/ipfs-maintenance.cjs'), 'backup'], { encoding: 'utf8' });
    assert.equal(backup.status, 0, backup.stderr);
    const restored = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/ipfs-maintenance.cjs'), 'restore'], { encoding: 'utf8' });
    assert.equal(restored.status, 0, restored.stderr);
    assert.equal((await client.request(`/api/products/${product.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Changed after pin' }) })).status, 409);
    // A third party minting the same URI to the seller must not bind to their web product.
    await (await nft.connect(buyer).mintProductNFT(seller.address, product.metadataUri)).wait();
    await sync(); assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).nftTokenId, null);
    const minted = await (await nft.mintProductNFT(seller.address, product.metadataUri)).wait();
    const tokenId = event(minted, 'ProductNFTMinted', nft).tokenId;
    const countBeforeFailure = await prisma.chainEvent.count({ where: { scope: c.scope } });
    const failingDb = { $transaction: (callback, options) => prisma.$transaction(db => callback(new Proxy(db, { get(target, key) {
      if (key === 'chainRecord') return new Proxy(target.chainRecord, { get(model, method) { if (method === 'upsert') return async () => { throw new Error('INJECTED_DB_FAILURE'); }; return model[method]; } });
      return target[key];
    } })), options) };
    await assert.rejects(() => syncChain(failingDb, { config: c, provider }), /INJECTED_DB_FAILURE/);
    assert.equal(await prisma.chainEvent.count({ where: { scope: c.scope } }), countBeforeFailure, 'failed batch rolls back its journal');
    await (await nft.approve(market.target, tokenId)).wait();
    const listed = await (await market.createListing(tokenId, parseEther('0.2'))).wait();
    const listingId = event(listed, 'ListingCreated', market).listingId;
    await sync();
    product = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(product.status, 'LISTED'); assert.equal(product.nftTokenId, String(tokenId)); assert.equal(product.listingId, String(listingId));
    const count = await prisma.chainEvent.count({ where: { scope: c.scope } });
    await sync(); assert.equal(await prisma.chainEvent.count({ where: { scope: c.scope } }), count, 'idempotent restart');
    const restarted = spawnSync(process.execPath, [path.resolve(__dirname, '../../indexer/worker.cjs'), '--once'], { encoding: 'utf8' });
    assert.equal(restarted.status, 0, restarted.stderr);
    assert.equal(await prisma.chainEvent.count({ where: { scope: c.scope } }), count, 'separate worker resumes from persisted checkpoint');
    const checkpoint = await prisma.chainCheckpoint.findUnique({ where: { scope: c.scope } });
    assert.ok(checkpoint.blockNumber >= listed.blockNumber);
    const before = await provider.getBalance(c.contracts.Escrow);
    const purchase = await (await market.connect(buyer).buyItem(listingId, { value: parseEther('0.2') })).wait();
    const orderId = event(purchase, 'ItemPurchased', market).orderId;
    await sync(); assert.equal((await row('order', orderId)).state, 'HELD');
    assert.equal((await nft.ownerOf(tokenId)).toLowerCase(), c.contracts.Escrow.toLowerCase());
    assert.equal(await provider.getBalance(c.contracts.Escrow), before + parseEther('0.2'));
    await assert.rejects(() => escrow.connect(seller).confirmDeliveryAndRelease(orderId));
    await (await escrow.confirmDeliveryAndRelease(orderId)).wait(); await sync();
    assert.equal((await row('order', orderId)).state, 'RELEASED');
    assert.equal((await nft.ownerOf(tokenId)).toLowerCase(), buyer.address.toLowerCase());
    assert.equal(await provider.getBalance(c.contracts.Escrow), before);
    assert.equal((await row('reputation', seller.address.toLowerCase())).successfulTradesCount, '1');
    const verified = await (await client.request(`/api/chain/verify/${tokenId}`)).json();
    assert.equal(verified.owner.toLowerCase(), buyer.address.toLowerCase());
    assert.equal(verified.metadataIntegrity, 'CID_VERIFIED');
    // Exercise both rulings with fresh real orders, plus evidence and role checks.
    for (const ruling of [1, 2]) {
      const mint = await (await nft.mintProductNFT(seller.address, product.metadataUri + `?case=${ruling}`)).wait();
      const token = event(mint, 'ProductNFTMinted', nft).tokenId;
      await (await nft.approve(market.target, token)).wait();
      const listing = event(await (await market.createListing(token, parseEther('0.1'))).wait(), 'ListingCreated', market).listingId;
      const order = event(await (await market.connect(buyer).buyItem(listing, { value: parseEther('0.1') })).wait(), 'ItemPurchased', market).orderId;
      const evidence = keccak256(toUtf8Bytes(`evidence-${tag}`));
      await (await disputes.openDispute(order, evidence)).wait();
      await (await disputes.connect(seller).submitEvidence(order, evidence)).wait();
      await assert.rejects(() => disputes.resolveDispute(order, ruling));
      await (await disputes.connect(arbitrator).markUnderReview(order)).wait(); await sync();
      assert.equal((await row('dispute', order)).state, 'UNDER_REVIEW');
      assert.equal((await row('order', order)).state, 'DISPUTED');
      await (await disputes.connect(arbitrator).resolveDispute(order, ruling)).wait(); await sync();
      assert.equal((await row('order', order)).state, ruling === 1 ? 'REFUNDED' : 'RELEASED');
      assert.equal((await row('dispute', order)).state, ruling === 1 ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER');
    }
    // Local-only snapshot: revert just our last test branch and force conservative replay.
    const snapshot = await provider.send('evm_snapshot', []);
    let temporaryToken;
    try {
      const mint = await (await nft.mintProductNFT(seller.address, `ipfs://reorg-${tag}`)).wait();
      temporaryToken = event(mint, 'ProductNFTMinted', nft).tokenId;
      await sync(); assert.ok(await row('nft', temporaryToken));
    } finally { await provider.send('evm_revert', [snapshot]); }
    await provider.send('evm_mine', []); await sync();
    assert.equal(await prisma.chainRecord.findUnique({ where: { scope_kind_key: { scope: c.scope, kind: 'nft', key: String(temporaryToken) } } }), null);
    assert.equal((await row('order', orderId)).state, 'RELEASED', 'canonical state rebuilt');
    // Confirmation depth prevents exposing the newest block before it is safe.
    const isolated = { ...c, scope: `${c.scope}:confirmations-test-${tag}`, confirmations: 3 };
    await syncChain(prisma, { config: isolated, provider });
    assert.equal((await prisma.chainCheckpoint.findUnique({ where: { scope: isolated.scope } })).blockNumber, (await provider.getBlockNumber()) - 3);
    await prisma.chainEvent.deleteMany({ where: { scope: isolated.scope } });
    await prisma.chainRecord.deleteMany({ where: { scope: isolated.scope } });
    await prisma.chainCheckpoint.deleteMany({ where: { scope: isolated.scope } });
  } finally {
    await prisma.product.deleteMany({ where: { id: { in: products } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect(); provider.destroy();
  }
});
