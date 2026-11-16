const { Interface } = require('ethers');
const { abis, validateChain } = require('./runtime.cjs');
const HASH = /^0x[0-9a-fA-F]{64}$/;
const interfaces = Object.fromEntries(Object.entries(abis).map(([name, abi]) => [name, new Interface(abi)]));
const stringify = value => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
const parameters = (fragment, args) => fragment.inputs.map((input, index) => ({ name: input.name || String(index), type: input.type, value: stringify(args[index]) }));

// Read-only: never consult account/profile tables or change projections.
async function readTransaction(provider, c, hash, requestedScope) {
  if (!HASH.test(hash)) throw new Error('INVALID_TRANSACTION_HASH');
  if (requestedScope && requestedScope !== c.scope) throw new Error('TRANSACTION_SCOPE_MISMATCH');
  await validateChain(provider, c);
  const contracts = Object.fromEntries(Object.entries(c.contracts).map(([name, address]) => [address.toLowerCase(), name]));
  const [tx, receipt] = await Promise.all([provider.getTransaction(hash), provider.getTransactionReceipt(hash)]);
  const requiredConfirmations = Math.max(1, Number(c.confirmations) + 1);
  const base = {
    hash: hash.toLowerCase(),
    chain: { chainId: c.chainId, chainName: c.chainName, scope: c.scope, explorer: /^https?:\/\//.test(c.explorer || '') ? c.explorer.replace(/\/$/, '') : '' },
    requiredConfirmations,
  };
  if (!tx) return { ...base, status: receipt ? 'reorg' : 'not_found', transaction: null, receipt: null, events: [], membership: 'unknown', confirmations: 0, confirmationSatisfied: false };
  const contractName = contracts[tx.to?.toLowerCase()] || contracts[receipt?.contractAddress?.toLowerCase()] || null;
  let call = null;
  if (contractName && tx.to) {
    try { const decoded = interfaces[contractName].parseTransaction({ data: tx.data, value: tx.value }); if (decoded) call = { name: decoded.name, signature: decoded.signature, args: parameters(decoded.fragment, decoded.args) }; } catch { /* Unknown calldata remains inspectable. */ }
  }
  const transaction = { from: tx.from, to: tx.to, valueWei: tx.value.toString(), nonce: tx.nonce, gasLimit: tx.gasLimit.toString(), data: tx.data, contractName, call };
  const membership = (blockNumber) => blockNumber !== null && blockNumber < c.deploymentBlock ? 'before_deployment' : contractName || receipt?.logs.some(log => contracts[log.address.toLowerCase()]) ? 'current' : 'external';
  if (!receipt) return { ...base, status: 'pending', transaction, receipt: null, events: [], membership: membership(tx.blockNumber), confirmations: 0, confirmationSatisfied: false };
  const block = await provider.getBlock(receipt.blockNumber);
  const head = await provider.getBlockNumber();
  // Re-read both receipt and canonical block after collecting data to catch a moving chain.
  const [latestReceipt, canonicalBlock] = await Promise.all([provider.getTransactionReceipt(hash), provider.getBlock(receipt.blockNumber)]);
  const canonical = !!block && block.hash === receipt.blockHash && canonicalBlock?.hash === receipt.blockHash && latestReceipt?.blockHash === receipt.blockHash && tx.blockHash === receipt.blockHash && head >= receipt.blockNumber;
  if (!canonical) return { ...base, status: 'reorg', transaction, receipt: null, events: [], membership: 'unknown', confirmations: 0, confirmationSatisfied: false };
  if (receipt.status !== 0 && receipt.status !== 1) throw new Error('RECEIPT_STATUS_UNAVAILABLE');
  const confirmations = head - receipt.blockNumber + 1;
  const events = receipt.logs.map(log => {
    const name = contracts[log.address.toLowerCase()] || null;
    let decoded = null;
    if (name) { try { const parsed = interfaces[name].parseLog(log); if (parsed) decoded = { name: parsed.name, signature: parsed.signature, args: parameters(parsed.fragment, parsed.args) }; } catch { /* Keep raw logs for other ABIs. */ } }
    return { index: log.index, address: log.address, contractName: name, decoded, topics: [...log.topics], data: log.data };
  });
  return {
    ...base, status: receipt.status === 1 ? 'success' : 'failed', transaction, membership: membership(receipt.blockNumber),
    confirmations, confirmationSatisfied: confirmations >= requiredConfirmations,
    receipt: { status: receipt.status, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, timestamp: block.timestamp, contractAddress: receipt.contractAddress, gasUsed: receipt.gasUsed.toString(), effectiveGasPriceWei: receipt.gasPrice.toString(), gasFeeWei: (receipt.gasUsed * receipt.gasPrice).toString() }, events,
  };
}

// Bounded aggregate limiter per server process. No caller-supplied IP header is trusted.
function createLimiter(limit = 120, windowMs = 60000) {
  let windowStart = 0, count = 0;
  return (now = Date.now()) => {
    if (now - windowStart >= windowMs) { windowStart = now; count = 0; }
    return ++count <= limit;
  };
}
async function withDeadline(work, milliseconds = 12000) {
  let timer;
  try { return await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('CHAIN_RPC_TIMEOUT')), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
module.exports = { readTransaction, createLimiter, withDeadline, HASH };
