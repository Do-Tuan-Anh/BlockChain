const fs = require('fs');
const path = require('path');
const { JsonRpcProvider, Interface, Contract } = require('ethers');
const abis = require('./abis.json');

function config() {
  const candidates = [process.env.CHAIN_DEPLOYMENT_FILE, path.resolve(process.cwd(), 'data/trustchain-deployments.json'), path.resolve(process.cwd(), '../../data/trustchain-deployments.json')].filter(Boolean);
  const file = candidates.find(p => fs.existsSync(p));
  if (!file) throw new Error('CHAIN_NOT_DEPLOYED');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value.scope || !value.deploymentBlockHash) throw new Error('REDEPLOY_REQUIRED');
  return { ...value, confirmations: Math.max(0, Number(process.env.CHAIN_CONFIRMATIONS ?? (value.chainId === 31337 ? 0 : 3))), walletRpcUrl: value.chainId === 31337 ? 'http://127.0.0.1:8545' : 'https://ethereum-sepolia-rpc.publicnode.com', gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'http://localhost:8080/ipfs/' };
}
function providerFor(c) {
  const url = process.env.CHAIN_RPC_URL || (c.chainId === 31337 ? 'http://127.0.0.1:8545' : process.env.SEPOLIA_RPC_URL);
  if (!url) throw new Error('CHAIN_RPC_URL_REQUIRED');
  return new JsonRpcProvider(url, undefined, { cacheTimeout: -1 });
}
async function validateChain(provider, c) {
  if (Number((await provider.getNetwork()).chainId) !== c.chainId) throw new Error('WRONG_RPC_CHAIN');
  const block = await provider.getBlock(c.deploymentBlock);
  if (block?.hash !== c.deploymentBlockHash || await provider.getCode(c.contracts.Marketplace) === '0x') throw new Error('CHAIN_RESET_REDEPLOY_REQUIRED');
}
module.exports = { config, providerFor, validateChain, abis, Interface, Contract };
