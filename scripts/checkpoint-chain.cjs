// Validated local chain checkpoints. Independent from Anvil's in-place state writes.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function validateState(bytes) {
  const state = JSON.parse(bytes.toString('utf8'));
  if (!state.accounts || !state.block || !Array.isArray(state.blocks) || !Array.isArray(state.transactions) || Number(BigInt(state.block.number)) !== state.best_block_number) throw new Error('INVALID_CHAIN_CHECKPOINT');
  return state;
}
function saveCheckpoint(dir, bytes) {
  validateState(bytes); // Reject partial JSON before touching the last good snapshot.
  fs.mkdirSync(dir, { recursive: true });
  const latest = path.join(dir, 'latest.json'), previous = path.join(dir, 'previous.json');
  if (fs.existsSync(latest)) {
    const current = fs.readFileSync(latest);
    if (current.equals(bytes)) return false;
    try { validateState(current); fs.writeFileSync(previous + '.tmp', current); fs.renameSync(previous + '.tmp', previous); } catch (error) { if (error.code) throw error; }
  }
  const fd = fs.openSync(latest + '.tmp', 'w');
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(latest + '.tmp', latest);
  return true;
}
async function checkpoint() {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'data/trustchain-deployments.json'), 'utf8'));
  if (config.chainId !== 31337) throw new Error('LOCAL_CHAIN_ONLY');
  const rpc = async (method, params = []) => {
    const response = await fetch('http://127.0.0.1:8545', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error('CHECKPOINT_RPC_FAILED');
    return data.result;
  };
  if (Number(BigInt(await rpc('eth_chainId'))) !== config.chainId || (await rpc('eth_getBlockByNumber', ['0x' + config.deploymentBlock.toString(16), false]))?.hash !== config.deploymentBlockHash) throw new Error('CHECKPOINT_DEPLOYMENT_MISMATCH');
  const hex = await rpc('anvil_dumpState', [true]);
  const bytes = zlib.gunzipSync(Buffer.from(hex.slice(2), 'hex'), { maxOutputLength: 128 * 1024 * 1024 });
  const state = validateState(bytes);
  const block = await rpc('eth_getBlockByNumber', ['0x' + state.best_block_number.toString(16), false]);
  if (!block || !state.blocks.some(b => b.header.stateRoot === block.stateRoot && b.header.parentHash === block.parentHash && Number(b.header.number) === state.best_block_number)) throw new Error('CHECKPOINT_BLOCK_MISMATCH');
  const dir = path.join(root, '.local/backups/chain-checkpoints', crypto.createHash('sha256').update(config.scope).digest('hex').slice(0, 16));
  saveCheckpoint(dir, bytes);
  return { block: state.best_block_number, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
if (require.main === module) {
  let busy = false;
  const run = async () => {
    if (busy) return; busy = true;
    try { console.log(JSON.stringify({ time: new Date().toISOString(), ...await checkpoint() })); }
    catch (error) { console.error(`Chain checkpoint unavailable: ${error.message}`); if (!process.argv.includes('--watch')) process.exitCode = 1; }
    finally { busy = false; }
  };
  void run();
  if (process.argv.includes('--watch')) setInterval(run, 30000);
}
module.exports = { validateState, saveCheckpoint };
