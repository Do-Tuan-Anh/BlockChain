const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Interface } = require('ethers');
const { abis } = require('../src/lib/chain/runtime.cjs');
const { readTransaction, createLimiter, withDeadline } = require('../src/lib/chain/transaction-details.cjs');
const hash = '0x' + 'a'.repeat(64), blockHash = '0x' + 'b'.repeat(64);
const address = '0x' + '1'.repeat(40), other = '0x' + '2'.repeat(40);
function fixture() {
  const c = { chainId: 31337, chainName: 'Local', scope: 'test-scope', deploymentBlock: 1, deploymentBlockHash: 'deployment', confirmations: 3, contracts: { Marketplace: address, Escrow: other } };
  const tx = { from: address, to: other, value: 0n, nonce: 2, gasLimit: 500000n, data: '0x', blockNumber: 10, blockHash };
  const receipt = { status: 1, blockNumber: 10, blockHash, contractAddress: null, gasUsed: 234567n, gasPrice: 123456789012345n, logs: [] };
  const p = { getNetwork: async () => ({ chainId: 31337n }), getCode: async () => '0x1234', getBlock: async n => n === 1 ? { hash: 'deployment' } : { hash: blockHash, timestamp: 1700000000 }, getBlockNumber: async () => 12, getTransaction: async () => tx, getTransactionReceipt: async () => receipt };
  return { c, tx, receipt, p };
}
test('exact gas arithmetic and configured confirmations, not finality', async () => {
  const { c, p, receipt } = fixture();
  const result = await readTransaction(p, c, hash);
  assert.equal(result.status, 'success');
  assert.equal(result.receipt.gasFeeWei, (receipt.gasUsed * receipt.gasPrice).toString());
  assert.equal(result.confirmations, 3); assert.equal(result.confirmationSatisfied, false);
  p.getBlockNumber = async () => 13;
  assert.equal((await readTransaction(p, c, hash)).confirmationSatisfied, true);
});
test('failed, pending, missing and reorg are distinct and clear receipt evidence', async () => {
  const { c, p, receipt } = fixture();
  receipt.status = 0; assert.equal((await readTransaction(p, c, hash)).status, 'failed');
  p.getTransactionReceipt = async () => null;
  assert.equal((await readTransaction(p, c, hash)).status, 'pending');
  p.getTransaction = async () => null;
  assert.equal((await readTransaction(p, c, hash)).status, 'not_found');
  const f = fixture(); let reads = 0;
  f.p.getTransactionReceipt = async () => ++reads === 1 ? f.receipt : null;
  const result = await readTransaction(f.p, f.c, hash);
  assert.equal(result.status, 'reorg'); assert.equal(result.receipt, null);
  assert.deepEqual(result.events, []); assert.equal(result.confirmationSatisfied, false);
});
test('decodes only known emitting contracts; preserves unknown logs and calldata', async () => {
  const { c, p, receipt, tx } = fixture(); const abi = new Interface(abis.Escrow);
  const event = abi.getEvent('EscrowReleased');
  const values = event.inputs.map(input => input.type === 'address' ? address : 19n);
  const log = abi.encodeEventLog(event, values);
  receipt.logs = [{ ...log, address: other, index: 0 }, { ...log, address: '0x' + '3'.repeat(40), index: 1 }, { address: other, topics: [hash], data: '0x', index: 2 }];
  tx.data = '0xdeadbeef';
  const result = await readTransaction(p, c, hash);
  assert.equal(result.transaction.call, null);
  assert.equal(result.events[0].decoded.name, 'EscrowReleased');
  assert.equal(result.events[1].decoded, null); assert.equal(result.events[2].decoded, null);
  assert.equal(result.events[0].decoded.args.find(arg => arg.name === 'sellerAmount').value, '19');
});
test('invalid hash, wrong chain, old scope, external and predeployment', async () => {
  const { c, p, tx } = fixture();
  await assert.rejects(readTransaction(p, c, 'bad'), /INVALID_TRANSACTION_HASH/);
  await assert.rejects(readTransaction(p, c, hash, 'old'), /TRANSACTION_SCOPE_MISMATCH/);
  tx.to = '0x' + '3'.repeat(40);
  assert.equal((await readTransaction(p, c, hash)).membership, 'external');
  c.deploymentBlock = 11; c.deploymentBlockHash = blockHash;
  assert.equal((await readTransaction(p, c, hash)).membership, 'before_deployment');
  p.getNetwork = async () => ({ chainId: 1n });
  await assert.rejects(readTransaction(p, c, hash), /WRONG_RPC_CHAIN/);
});
test('bounded requests and RPC deadline', async () => {
  const allow = createLimiter(2, 100);
  assert.equal(allow(100), true); assert.equal(allow(101), true); assert.equal(allow(102), false); assert.equal(allow(200), true);
  await assert.rejects(withDeadline(() => new Promise(() => {}), 10), /CHAIN_RPC_TIMEOUT/);
});
