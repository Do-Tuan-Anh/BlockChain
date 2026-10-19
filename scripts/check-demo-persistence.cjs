// Run prepare, gracefully restart the Docker chain service, then verify.
// Uses only a dedicated local test account; no app products or users are modified.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JsonRpcProvider, Contract, parseEther } = require('ethers');
const { inspect, rpc } = require('./ensure-demo-chain.cjs');
const root = path.resolve(__dirname, '..'), file = path.join(root, '.local/demo/persistence-check.json');
async function main() {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'data/trustchain-deployments.json')));
  assert.equal(await inspect(rpc, config), 'reuse');
  const provider = new JsonRpcProvider('http://127.0.0.1:8545', undefined, { cacheTimeout: -1 });
  try {
    const nft = new Contract(config.contracts.MarketplaceNFT, require('../apps/web/src/lib/chain/abis.json').MarketplaceNFT, provider);
    if (process.argv[2] === 'prepare') {
      const signer = await provider.getSigner(8), owner = await signer.getAddress();
      const uri = 'data:application/json,' + encodeURIComponent(JSON.stringify({ name: 'Persistence verification NFT', description: 'Local infrastructure test; not a sale listing.' }));
      const receipt = await (await nft.connect(signer).mintProductNFT(owner, uri)).wait();
      const event = receipt.logs.map(log => { try { return nft.interface.parseLog(log); } catch { return null; } }).find(log => log?.name === 'ProductNFTMinted');
      await (await signer.sendTransaction({ to: await (await provider.getSigner(9)).getAddress(), value: parseEther('0.123') })).wait();
      const data = { scope: config.scope, owner, uri, token: event.args.tokenId.toString(), hash: receipt.hash, blockHash: receipt.blockHash, block: receipt.blockNumber, balance: (await provider.getBalance(owner)).toString(), nonce: await provider.getTransactionCount(owner) };
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log('Created a test NFT and ETH transfer. Now gracefully restart Docker service chain, then run verify.');
    } else if (process.argv[2] === 'verify') {
      const data = JSON.parse(fs.readFileSync(file));
      assert.equal(config.scope, data.scope);
      assert.equal(await nft.ownerOf(data.token), data.owner);
      assert.equal(await nft.tokenURI(data.token), data.uri);
      assert.equal((await provider.getBalance(data.owner)).toString(), data.balance);
      assert.equal(await provider.getTransactionCount(data.owner), data.nonce);
      assert.equal((await provider.getBlock(data.block)).hash, data.blockHash);
      assert.equal((await provider.getTransactionReceipt(data.hash)).status, 1);
      assert.equal((await provider.getTransaction(data.hash)).hash, data.hash);
      assert.ok((await provider.getLogs({ address: config.contracts.MarketplaceNFT, fromBlock: data.block, toBlock: data.block })).some(log => log.transactionHash === data.hash));
      console.log('PASS: deployment, NFT ownership/URI, ETH balance, nonce, historical block, transaction, receipt and event logs survived restart.');
    } else throw new Error('Use prepare or verify.');
  } finally { provider.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
