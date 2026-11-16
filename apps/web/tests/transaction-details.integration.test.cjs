const { test } = require('node:test');
const assert = require('node:assert/strict');
const { config, providerFor } = require('../src/lib/chain/runtime.cjs');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const hashes = ['0xe19969ef6bd051c7930664dd9f43e050a5c25abf63b6a3ee79fb1130e715828d', '0x2459b876d5adfbda56f2d14269f97ffb615e4485e168bddb691ec08fab951475'];
test('public API matches saved local buy/release receipts without private account data', async () => {
  const c = config(), p = providerFor(c, 5000);
  try {
    for (const hash of hashes) {
      const receipt = await p.getTransactionReceipt(hash);
      assert.ok(receipt, 'Saved demo transaction must exist; never reset/redeploy to satisfy this test');
      const response = await fetch(`${base}/api/chain/transactions/${hash}?scope=${encodeURIComponent(c.scope)}`);
      assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
      const data = await response.json();
      assert.equal(data.status, receipt.status === 1 ? 'success' : 'failed');
      assert.equal(data.receipt.blockHash, receipt.blockHash);
      assert.equal(data.receipt.gasFeeWei, (receipt.gasUsed * receipt.gasPrice).toString());
      assert.equal(data.membership, 'current');
      assert.equal(data.events.length, receipt.logs.length);
      assert.ok(data.events.some(e => e.contractName === 'Escrow' && e.decoded));
      assert.doesNotMatch(JSON.stringify(data), /passwordHash|email|phone|sessionToken/);
    }
    const invalid = await fetch(`${base}/api/chain/transactions/bad`);
    assert.equal(invalid.status, 400);
    const old = await fetch(`${base}/api/chain/transactions/${hashes[0]}?scope=old`);
    assert.equal(old.status, 409);
    const missing = await fetch(`${base}/api/chain/transactions/0x${'f'.repeat(64)}`);
    assert.equal((await missing.json()).status, 'not_found');
  } finally { p.destroy(); }
});
