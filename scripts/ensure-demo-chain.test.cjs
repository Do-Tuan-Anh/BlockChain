const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspect } = require('./ensure-demo-chain.cjs');
const saved = { chainId: 31337, deploymentBlock: 1, deploymentBlockHash: 'saved-hash', contracts: { Marketplace: 'address' } };
function fixture({ client = 'anvil/v1.4.4', chain = '0x7a69', head = '0xc', hash = 'saved-hash', code = '0x1234' } = {}) {
  return async method => ({ web3_clientVersion: client, eth_chainId: chain, eth_blockNumber: head, eth_getBlockByNumber: { hash }, eth_getCode: code })[method];
}
test('reuses matching deployment and only permits deploying on an empty chain', async () => {
  assert.equal(await inspect(fixture(), saved), 'reuse');
  assert.equal(await inspect(fixture({ head: '0x0', hash: 'new-genesis' }), saved), 'deploy');
  assert.equal(await inspect(fixture({ head: '0x0' }), null), 'deploy');
});
test('protects populated chains, wrong clients, wrong networks and missing code', async () => {
  for (const request of [fixture({ client: 'HardhatNetwork/2' }), fixture({ chain: '0x1' }), fixture({ hash: 'other' }), fixture({ code: '0x' })]) await assert.rejects(inspect(request, saved));
  await assert.rejects(inspect(fixture(), null), /contains blocks/);
});
