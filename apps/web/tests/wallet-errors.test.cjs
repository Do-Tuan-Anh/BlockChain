const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Interface } = require('ethers');
const abis = require('../src/lib/chain/abis.json');
const { escrowActionError, transactionErrorMessage } = require('../src/lib/chain/wallet-errors.cjs');

test('metadata infrastructure failures are distinguished from contract failures', () => {
  assert.match(transactionErrorMessage(new Error('CHAIN_RPC_UNAVAILABLE'), true), /Blockchain chưa chạy/);
  assert.match(transactionErrorMessage(new Error('PRODUCT_STORAGE_UNAVAILABLE'), false), /IPFS/);
  assert.match(transactionErrorMessage(new Error('METADATA_PREPARATION_FAILED'), false), /draft is preserved/);
  assert.match(transactionErrorMessage(new Error('WRONG_RPC_CHAIN'), false), /wrong network/);
});

test('settled escrow is distinguished from held/disputed escrow', () => {
  assert.equal(escrowActionError(1n), null);
  assert.equal(escrowActionError(4n), null);
  assert.equal(escrowActionError(2n), 'ORDER_ALREADY_RELEASED');
  assert.equal(escrowActionError(3n), 'ORDER_ALREADY_REFUNDED');
});
test('decodes nested MetaMask contract reverts instead of generic RPC error', () => {
  const iface = new Interface(abis.Escrow);
  const error = { code: 'UNKNOWN_ERROR', shortMessage: 'could not coalesce error', info: { error: { data: iface.encodeErrorResult('InvalidState', [2, 1]) } } };
  assert.match(transactionErrorMessage(error, true), /đã giải ngân/);
  assert.match(transactionErrorMessage(error, false), /already released/);
  error.info.error.data = iface.encodeErrorResult('Unauthorized', []);
  assert.match(transactionErrorMessage(error, false), /not authorized/);
});
test('distinguishes nonce, funds, rejection and mined revert', () => {
  assert.match(transactionErrorMessage({ info: { error: { message: 'nonce too low' } } }, false), /nonce/);
  assert.match(transactionErrorMessage({ code: 'INSUFFICIENT_FUNDS' }, false), /Not enough ETH/);
  assert.equal(transactionErrorMessage({ code: 4001 }, false), 'Request rejected in wallet.');
  assert.match(transactionErrorMessage({ receipt: { status: 0 }, shortMessage: 'transaction execution reverted' }, false), /contract reverted/);
});
