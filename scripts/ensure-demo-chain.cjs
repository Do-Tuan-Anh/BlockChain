// Never redeploy over a populated chain. Keep the manifest paired with its block hash.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const manifest = path.join(root, 'data/trustchain-deployments.json');
async function rpc(method, params = []) {
  const response = await fetch('http://127.0.0.1:8545', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(5000) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || 'Local RPC unavailable');
  return data.result;
}
async function inspect(request, saved) {
  const client = await request('web3_clientVersion');
  if (!/^anvil\//i.test(client) || BigInt(await request('eth_chainId')) !== 31337n) throw new Error('Expected persistent Anvil on localhost:8545, chain 31337. Stop the other node manually; no chain was reset.');
  const head = BigInt(await request('eth_blockNumber'));
  if (saved?.chainId === 31337 && saved.deploymentBlockHash && saved.contracts) {
    const block = await request('eth_getBlockByNumber', ['0x' + Number(saved.deploymentBlock).toString(16), false]);
    if (block?.hash === saved.deploymentBlockHash) {
      for (const address of Object.values(saved.contracts)) if (await request('eth_getCode', [address, 'latest']) === '0x') throw new Error('Saved deployment is missing contract code. Refusing automatic redeployment.');
      return 'reuse';
    }
  }
  if (head !== 0n) throw new Error('Chain contains blocks but the deployment manifest does not match. Restore the matching manifest/state backup; refusing to redeploy or erase data.');
  return 'deploy';
}
async function main() {
  process.chdir(root);
  const saved = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : null;
  if (await inspect(rpc, saved) === 'reuse') { console.log('Reusing saved blockchain and contracts.'); return; }
  if (saved) {
    const backup = path.join(root, '.local/deployments'); fs.mkdirSync(backup, { recursive: true });
    fs.copyFileSync(manifest, path.join(backup, `before-persistent-${Date.now()}.json`));
    console.log('Archived old deployment manifest. Existing database records are preserved; old-chain NFTs cannot be recovered from the database.');
  }
  console.log('First startup of this chain: deploying contracts once.');
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/hardhat/internal/cli/cli.js'), 'run', 'packages/contracts/scripts/deploy.js', '--network', 'localhost'], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Deployment failed. Do not reset the chain; inspect the error before retrying.');
  const deployed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  if (await inspect(rpc, deployed) !== 'reuse') throw new Error('Deployment verification failed.');
  console.log('Deployment verified. Anvil saves to the Docker chain_data volume every 5 seconds.');
}
module.exports = { inspect, rpc };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
