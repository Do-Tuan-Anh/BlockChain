// Shared by the background worker and the authenticated refresh endpoint.
// All derived state and the checkpoint commit atomically, protected across processes.
const { config, providerFor, validateChain, abis, Interface } = require('./runtime.cjs');
const { ZeroAddress, formatEther } = require('ethers');

async function project(db, scope, event) {
  const a = event.args, hash = event.transactionHash;
  const get = async (kind, key) => (await db.chainRecord.findUnique({ where: { scope_kind_key: { scope, kind, key: String(key) } } }))?.data || {};
  const put = async (kind, key, patch) => {
    const data = { ...await get(kind, key), ...patch, lastTxHash: hash, blockNumber: event.blockNumber };
    await db.chainRecord.upsert({ where: { scope_kind_key: { scope, kind, key: String(key) } }, create: { scope, kind, key: String(key), data }, update: { data } });
  };
  switch (event.name) {
    case 'Transfer': await put('nft', a.tokenId, { tokenId: a.tokenId, owner: a.to, burned: a.to === ZeroAddress }); break;
    case 'ProductNFTMinted': await put('nft', a.tokenId, { tokenId: a.tokenId, creator: a.creator, metadataUri: a.metadataURI, mintTxHash: hash, minter: a.transactionSender }); break;
    case 'ListingCreated': await put('listing', a.listingId, { ...a, status: 'ACTIVE', createTxHash: hash }); break;
    case 'ListingCancelled': await put('listing', a.listingId, { status: 'CANCELLED' }); break;
    case 'ItemPurchased': await put('listing', a.listingId, { status: 'SOLD', orderId: a.orderId }); break;
    case 'EscrowDeposited': await put('order', a.orderId, { ...a, state: 'HELD', createdAt: a.timestamp, purchaseTxHash: hash }); break;
    case 'EscrowReleased': await put('order', a.orderId, { state: 'RELEASED', sellerAmount: a.sellerAmount, feeAmount: a.feeAmount }); break;
    case 'EscrowRefunded': await put('order', a.orderId, { state: 'REFUNDED', refundAmount: a.refundAmount }); break;
    case 'EscrowDisputeOpened': await put('order', a.orderId, { state: 'DISPUTED' }); break;
    case 'DisputeOpened': {
      const order = await get('order', a.orderId);
      await put('dispute', a.orderId, { orderId: a.orderId, openedBy: a.openedBy, state: 'OPEN', [a.openedBy === order.buyer ? 'buyerEvidenceHash' : 'sellerEvidenceHash']: a.evidenceHash }); break;
    }
    case 'EvidenceSubmitted': {
      const order = await get('order', a.orderId);
      await put('dispute', a.orderId, { [a.submitter === order.buyer ? 'buyerEvidenceHash' : 'sellerEvidenceHash']: a.evidenceHash }); break;
    }
    case 'DisputeStateChanged': await put('dispute', a.orderId, { state: ['NONE', 'OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CANCELLED'][Number(a.newState)] }); break;
    case 'DisputeResolved': await put('dispute', a.orderId, { state: a.ruling === '1' ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER', ruling: a.ruling, arbitrator: a.arbitrator }); break;
    case 'ReputationUpdated': await put('reputation', a.user, { successfulTradesCount: a.successfulTradesCount, totalVolumeWei: a.totalVolumeWei }); break;
    case 'DisputeResultRecorded': {
      for (const [address, field] of [[a.winner, 'disputesWon'], [a.loser, 'disputesLost']]) {
        const old = await get('reputation', address);
        await put('reputation', address, { [field]: String(BigInt(old[field] || 0) + 1n) });
      } break;
    }
  }
}

async function reconcileProducts(db, scope) {
  const products = await db.product.findMany({ where: { chainScope: scope, metadataUri: { not: null } } });
  const rows = await db.chainRecord.findMany({ where: { scope, kind: { in: ['nft', 'listing', 'order'] } } });
  const nfts = rows.filter(r => r.kind === 'nft').map(r => r.data);
  const listings = rows.filter(r => r.kind === 'listing').map(r => r.data);
  for (const product of products) {
    const nft = nfts.filter(n => n.metadataUri === product.metadataUri && n.creator === product.mintWallet && n.minter === product.mintWallet).sort((a, b) => Number(BigInt(a.tokenId) - BigInt(b.tokenId)))[0];
    const listing = nft && listings.filter(l => l.tokenId === nft.tokenId && l.seller === product.mintWallet).sort((a, b) => Number(BigInt(b.listingId) - BigInt(a.listingId)))[0];
    const active = listing?.status === 'ACTIVE' && nft?.owner === product.mintWallet && !nft?.burned;
    const refunded = listing?.orderId && rows.some(r => r.kind === 'order' && r.key === listing.orderId && r.data.state === 'REFUNDED');
    await db.product.update({ where: { id: product.id }, data: {
      nftTokenId: nft?.tokenId || null, mintTxHash: nft?.mintTxHash || null, listingId: listing?.listingId || null,
      status: nft?.burned ? 'ARCHIVED' : listing?.status === 'SOLD' && !refunded ? 'SOLD' : active ? 'LISTED' : nft ? 'MINTED' : 'DRAFT',
      ...(listing ? { price: formatEther(listing.price), currency: 'ETH' } : {}),
    } });
  }
}

async function syncChain(prisma, options = {}) {
  const c = options.config || config(), provider = options.provider || providerFor(c);
  try {
    await validateChain(provider, c);
    return await prisma.$transaction(async db => {
      const [lock] = await db.$queryRaw`SELECT pg_try_advisory_xact_lock(782344221) AS locked`;
      if (!lock.locked) return { busy: true };
      let checkpoint = await db.chainCheckpoint.findUnique({ where: { scope: c.scope } });
      if (checkpoint && (await provider.getBlock(checkpoint.blockNumber))?.hash !== checkpoint.blockHash) {
        // Conservative reorg recovery: discard only this deployment's derived data and replay.
        await db.chainEvent.deleteMany({ where: { scope: c.scope } });
        await db.chainRecord.deleteMany({ where: { scope: c.scope } });
        await db.chainCheckpoint.delete({ where: { scope: c.scope } });
        checkpoint = null;
      }
      const head = await provider.getBlockNumber();
      const safeHead = head - c.confirmations;
      const from = checkpoint ? checkpoint.blockNumber + 1 : c.deploymentBlock;
      const to = Math.min(safeHead, from + 499);
      if (from <= to) {
        const endBlock = await provider.getBlock(to);
        if (!endBlock) throw new Error('BLOCK_UNAVAILABLE');
        const logs = await provider.getLogs({ address: Object.values(c.contracts), fromBlock: from, toBlock: to });
        logs.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
        const interfaces = Object.fromEntries(Object.entries(c.contracts).map(([name, address]) => [address.toLowerCase(), { name, iface: new Interface(abis[name]) }]));
        const blocks = new Map(), senders = new Map();
        for (const log of logs) {
          const contract = interfaces[log.address.toLowerCase()];
          const decoded = contract.iface.parseLog(log);
          if (!decoded) continue;
          if (!blocks.has(log.blockNumber)) blocks.set(log.blockNumber, await provider.getBlock(log.blockNumber));
          const block = blocks.get(log.blockNumber);
          if (block.hash !== log.blockHash) throw new Error('REORG_DURING_SYNC');
          const args = { timestamp: String(block.timestamp) };
          decoded.fragment.inputs.forEach((input, i) => { args[input.name] = String(decoded.args[i]).toLowerCase(); });
          // Preserve case-sensitive content addresses.
          if (decoded.name === 'ProductNFTMinted') {
            args.metadataURI = decoded.args.metadataURI;
            if (!senders.has(log.transactionHash)) senders.set(log.transactionHash, (await provider.getTransaction(log.transactionHash)).from.toLowerCase());
            args.transactionSender = senders.get(log.transactionHash);
          }
          const event = { id: `${c.scope}:${log.transactionHash}:${log.index}`, scope: c.scope, blockNumber: log.blockNumber, blockHash: log.blockHash, transactionHash: log.transactionHash, logIndex: log.index, contract: contract.name, name: decoded.name, args };
          await db.chainEvent.create({ data: event });
          await project(db, c.scope, event);
        }
        if ((await provider.getBlock(to))?.hash !== endBlock.hash) throw new Error('REORG_DURING_SYNC');
        checkpoint = await db.chainCheckpoint.upsert({ where: { scope: c.scope }, create: { scope: c.scope, blockNumber: to, blockHash: endBlock.hash }, update: { blockNumber: to, blockHash: endBlock.hash } });
      }
      await reconcileProducts(db, c.scope);
      return { blockNumber: checkpoint?.blockNumber ?? c.deploymentBlock - 1, head, safeHead, caughtUp: to >= safeHead };
    }, { maxWait: 5000, timeout: 120000 });
  } finally { if (!options.provider) provider.destroy(); }
}
module.exports = { syncChain, project, reconcileProducts };
