import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { authError } from '@/lib/auth-security';
import { config } from '@/lib/chain/runtime.cjs';
import type { HistoryEntry } from '@/lib/chain/history-types';

export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  try {
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { walletAddress: true } });
    const wallet = account?.walletAddress?.toLowerCase() || null;
    const c = config();
    const chain = { chainId: c.chainId, chainName: c.chainName, scope: c.scope, explorer: c.explorer };
    if (!wallet) return NextResponse.json({ wallet, chain, checkpoint: null, totals: { incomingWei: '0', outgoingWei: '0', escrowWei: '0' }, entries: [] }, { headers: { 'Cache-Control': 'no-store' } });

    // The account's saved wallet is the only identity accepted. Query parameters cannot select another wallet.
    const parties = [{ path: ['buyer'], equals: wallet }, { path: ['seller'], equals: wallet }];
    const result = await prisma.$transaction(async db => {
      const events = await db.chainEvent.findMany({
        where: { scope: c.scope, contract: 'Escrow', name: { in: ['EscrowDeposited', 'EscrowReleased', 'EscrowRefunded'] }, OR: parties.map(args => ({ args })) },
        orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
        select: { id: true, name: true, args: true, blockNumber: true, transactionHash: true },
      });
      const orders = await db.chainRecord.findMany({ where: { scope: c.scope, kind: 'order', OR: parties.map(data => ({ data })) }, select: { key: true, data: true } });
      const tokenIds = orders.map(row => String((row.data as Record<string, string>).tokenId));
      const products = await db.product.findMany({ where: { chainScope: c.scope, nftTokenId: { in: tokenIds } }, select: { id: true, title: true, nftTokenId: true } });
      const checkpoint = await db.chainCheckpoint.findUnique({ where: { scope: c.scope }, select: { blockNumber: true, updatedAt: true } });
      return { events, orders, products, checkpoint };
    }, { isolationLevel: 'RepeatableRead' });

    const orders = new Map(result.orders.map(row => [row.key, row.data as Record<string, string>]));
    let incoming = BigInt(0), outgoing = BigInt(0), escrow = BigInt(0);
    for (const order of Array.from(orders.values())) if (['HELD', 'DISPUTED'].includes(order.state)) escrow += BigInt(order.amount);
    const entries: HistoryEntry[] = result.events.map(event => {
      const a = event.args as Record<string, string>, order = orders.get(a.orderId);
      const buyer = a.buyer === wallet;
      const kind = event.name === 'EscrowDeposited' ? (buyer ? 'PURCHASE' : 'SALE_CREATED')
        : event.name === 'EscrowReleased' ? (buyer ? 'PURCHASE_COMPLETED' : 'SALE_PAID')
        : buyer ? 'REFUND' : 'SALE_REFUNDED';
      const direction = kind === 'PURCHASE' ? 'out' : ['SALE_PAID', 'REFUND'].includes(kind) ? 'in' : 'neutral';
      const amountWei = kind === 'PURCHASE' ? a.amount : kind === 'SALE_PAID' ? a.sellerAmount : kind === 'REFUND' ? a.refundAmount : '0';
      if (direction === 'in') incoming += BigInt(amountWei);
      if (direction === 'out') outgoing += BigInt(amountWei);
      const product = result.products.find(p => p.nftTokenId === order?.tokenId);
      return {
        id: event.id, kind, direction, amountWei,
        orderValueWei: order?.amount || a.amount || a.refundAmount || (BigInt(a.sellerAmount) + BigInt(a.feeAmount)).toString(),
        feeWei: event.name === 'EscrowReleased' ? a.feeAmount : null,
        orderId: a.orderId, orderState: order?.state || 'UNKNOWN', tokenId: order?.tokenId || null,
        product: product ? { id: product.id, title: product.title } : null,
        counterparty: buyer ? a.seller : a.buyer, timestamp: a.timestamp,
        blockNumber: event.blockNumber, transactionHash: event.transactionHash,
      };
    });
    return NextResponse.json({ wallet, chain, checkpoint: result.checkpoint, totals: { incomingWei: incoming.toString(), outgoingWei: outgoing.toString(), escrowWei: escrow.toString() }, entries }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Transaction history:', error);
    return authError('HISTORY_UNAVAILABLE', 503);
  }
}
