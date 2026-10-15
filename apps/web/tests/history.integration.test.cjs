const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, scryptSync } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { Wallet, Contract, parseEther } = require('ethers');
const { config, providerFor, validateChain, abis } = require('../src/lib/chain/runtime.cjs');
const { syncChain } = require('../src/lib/chain/indexer.cjs');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
class Client {
  cookies = new Map();
  async request(path, options = {}) {
    const response = await fetch(base + path, { ...options, redirect: 'manual', headers: { origin: new URL(base).origin, cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...options.headers } });
    for (const item of response.headers.getSetCookie()) { const pair = item.split(';')[0], at = pair.indexOf('='); this.cookies.set(pair.slice(0, at), pair.slice(at + 1)); }
    return response;
  }
  async login(email, password) {
    const { csrfToken } = await (await this.request('/api/auth/csrf')).json();
    await this.request('/api/auth/callback/credentials', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken, identifier: email, password, json: 'true' }) });
    assert.ok((await (await this.request('/api/auth/session')).json()).user?.id);
  }
  async history(query = '') {
    const response = await this.request('/api/me/transactions' + query);
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  }
}

test('history follows real deposits, disputes and refunds, with wallet/scope isolation and exact wei', { timeout: 120000 }, async () => {
  const prisma = new PrismaClient(), c = config(), provider = providerFor(c);
  assert.equal(c.chainId, 31337);
  await validateChain(provider, c);
  const users = [], tag = randomUUID(), password = 'History-test-password-123';
  const seller = Wallet.createRandom().connect(provider), buyer = Wallet.createRandom().connect(provider);
  const sellerClient = new Client(), buyerClient = new Client(), otherClient = new Client();
  const nft = new Contract(c.contracts.MarketplaceNFT, abis.MarketplaceNFT, seller);
  const market = new Contract(c.contracts.Marketplace, abis.Marketplace, seller);
  const escrow = new Contract(c.contracts.Escrow, abis.Escrow, seller);
  const price = parseEther('0.200000000000000001');
  const args = (receipt, contract, name) => receipt.logs.filter(log => log.address.toLowerCase() === contract.target.toLowerCase()).map(log => { try { return contract.interface.parseLog(log); } catch { return null; } }).find(log => log?.name === name).args;
  const oldScope = `history-test-old-${tag}`;
  try {
    assert.equal((await new Client().request('/api/me/transactions')).status, 401);
    const funding = await provider.getSigner(0);
    for (const wallet of [seller, buyer]) await (await funding.sendTransaction({ to: wallet.address, value: parseEther('1') })).wait();
    for (const [i, client, wallet] of [[0, sellerClient, seller], [1, buyerClient, buyer], [2, otherClient, Wallet.createRandom()]]) {
      const salt = randomBytes(16).toString('hex');
      const user = await prisma.user.create({ data: { email: `history-${i}-${tag}@example.test`, emailVerified: new Date(), walletAddress: wallet.address.toLowerCase(), passwordHash: `scrypt:${salt}:${scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex')}` } });
      users.push(user.id); await client.login(user.email, password);
    }
    const minted = await (await nft.mintProductNFT(seller.address, `data:application/json,${encodeURIComponent(JSON.stringify({ name: `History test ${tag}` }))}`)).wait();
    const tokenId = args(minted, nft, 'ProductNFTMinted').tokenId;
    await (await nft.approve(c.contracts.Marketplace, tokenId)).wait();
    const listed = await (await market.createListing(tokenId, price)).wait();
    const listingId = args(listed, market, 'ListingCreated').listingId;
    const purchased = await (await market.connect(buyer).buyItem(listingId, { value: price })).wait();
    const orderId = args(purchased, market, 'ItemPurchased').orderId;
    await syncChain(prisma, { config: c, provider });
    const heldBuyer = await buyerClient.history(), heldSeller = await sellerClient.history();
    assert.deepEqual(heldBuyer.totals, { incomingWei: '0', outgoingWei: price.toString(), escrowWei: price.toString() });
    assert.deepEqual(heldSeller.totals, { incomingWei: '0', outgoingWei: '0', escrowWei: price.toString() });
    assert.equal(heldSeller.entries[0].kind, 'SALE_CREATED');
    assert.equal(heldSeller.entries[0].direction, 'neutral');
    assert.equal(heldBuyer.entries[0].transactionHash, purchased.hash);
    assert.equal(heldBuyer.entries[0].product, null, 'on-chain trades without a database product remain visible');
    assert.equal(heldBuyer.entries[0].tokenId, tokenId.toString());

    // A record from a different deployment must not be mixed into the current deployment's totals.
    const original = await prisma.chainEvent.findUniqueOrThrow({ where: { id: heldBuyer.entries[0].id } });
    await prisma.chainEvent.create({ data: { ...original, id: `${oldScope}:event`, scope: oldScope } });
    assert.equal((await buyerClient.history()).entries.length, 1);
    assert.deepEqual((await otherClient.history(`?wallet=${buyer.address}&userId=${users[1]}`)).entries, []);

    await (await escrow.connect(buyer).openDispute(orderId)).wait();
    await syncChain(prisma, { config: c, provider });
    const disputed = await sellerClient.history();
    assert.equal(disputed.entries[0].orderState, 'DISPUTED');
    assert.equal(disputed.totals.incomingWei, '0');
    assert.equal(disputed.totals.escrowWei, price.toString());

    const refund = await (await escrow.refundBuyer(orderId)).wait();
    await syncChain(prisma, { config: c, provider });
    const refundedBuyer = await buyerClient.history(), refundedSeller = await sellerClient.history();
    assert.deepEqual(refundedBuyer.totals, { incomingWei: price.toString(), outgoingWei: price.toString(), escrowWei: '0' });
    assert.deepEqual(refundedBuyer.entries.map(row => row.kind), ['REFUND', 'PURCHASE']);
    assert.equal(refundedBuyer.entries[0].transactionHash, refund.hash);
    assert.equal(refundedBuyer.entries[0].amountWei, price.toString());
    assert.ok(refundedBuyer.entries.every(row => row.orderState === 'REFUNDED'));
    assert.deepEqual(refundedSeller.totals, { incomingWei: '0', outgoingWei: '0', escrowWei: '0' });
    assert.deepEqual(refundedSeller.entries.map(row => row.kind), ['SALE_REFUNDED', 'SALE_CREATED']);
    await syncChain(prisma, { config: c, provider });
    assert.equal((await buyerClient.history()).entries.length, 2, 'repeated sync does not double count');
  } finally {
    await prisma.chainEvent.deleteMany({ where: { scope: oldScope } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect(); provider.destroy();
  }
});
