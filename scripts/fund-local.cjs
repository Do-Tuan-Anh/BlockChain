// Hardhat-only demo funding. Does not send a transaction or spend real ETH.
const { isAddress, getAddress, parseEther, formatEther, toQuantity } = require('ethers');

async function rpc(method, params = []) {
  const response = await fetch('http://127.0.0.1:8545', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || 'Local RPC unavailable');
  return data.result;
}
async function fundLocal(address, amount = '100000', request = rpc) {
  if (!isAddress(address)) throw new Error('Usage: npm run demo:fund -- <wallet-address> [target-ETH, default 100000]');
  const target = parseEther(amount);
  if (target <= 0n || target > parseEther('1000000')) throw new Error('Target must be between 0 and 1000000 test ETH.');
  const chainId = await request('eth_chainId'), client = await request('web3_clientVersion');
  if (BigInt(chainId) !== 31337n || !/^HardhatNetwork\//i.test(client)) throw new Error('Funding is only allowed on local Hardhat chain 31337.');
  address = getAddress(address);
  const before = BigInt(await request('eth_getBalance', [address, 'latest']));
  // Never reduce a balance if the command is repeated.
  if (before < target) await request('hardhat_setBalance', [address, toQuantity(target)]);
  const balance = BigInt(await request('eth_getBalance', [address, 'latest']));
  if (balance < target) throw new Error('Funding verification failed.');
  return { address, before: formatEther(before), balance: formatEther(balance), chainId: 31337 };
}
module.exports = { fundLocal };
if (require.main === module) fundLocal(process.argv[2], process.argv[3]).then(result => {
  console.log(`Local Hardhat only: ${result.address}\n${result.before} → ${result.balance} test ETH (no monetary value).`);
}).catch(error => { console.error(error.message); process.exitCode = 1; });
