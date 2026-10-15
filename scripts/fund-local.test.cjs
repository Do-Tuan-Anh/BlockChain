const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEther, toQuantity } = require('ethers');
const { fundLocal } = require('./fund-local.cjs');
const address = '0x90f79bf6eb2c4f870365e785982e1f101e93b906';
function fixture(chainId = '0x7a69', client = 'HardhatNetwork/2.22.0', amount = '10000') {
  let balance = toQuantity(parseEther(amount));
  const writes = [];
  return { writes, request: async (method, params) => {
    if (method === 'eth_chainId') return chainId;
    if (method === 'web3_clientVersion') return client;
    if (method === 'eth_getBalance') return balance;
    if (method === 'hardhat_setBalance') { writes.push(params); balance = params[1]; return true; }
    throw new Error('Unexpected RPC');
  } };
}
test('funds the chosen address and does not reduce or repeatedly overwrite its balance', async () => {
  const f = fixture();
  assert.equal((await fundLocal(address, '100000', f.request)).balance, '100000.0');
  assert.equal(f.writes[0][0].toLowerCase(), address);
  await fundLocal(address, '100000', f.request);
  await fundLocal(address, '100', f.request);
  assert.equal(f.writes.length, 1);
});
test('rejects other chains/clients before any balance mutation', async () => {
  for (const f of [fixture('0x1'), fixture('0xaa36a7'), fixture('0x7a69', 'Geth/v1')]) {
    await assert.rejects(fundLocal(address, '100000', f.request), /only allowed on local Hardhat/);
    assert.equal(f.writes.length, 0);
  }
});
test('rejects invalid address and invalid amounts before RPC access', async () => {
  const noRpc = async () => assert.fail('Must not call RPC');
  await assert.rejects(fundLocal('invalid', '10', noRpc));
  for (const amount of ['-1', '0', '1000001', 'NaN']) await assert.rejects(fundLocal(address, amount, noRpc));
});
