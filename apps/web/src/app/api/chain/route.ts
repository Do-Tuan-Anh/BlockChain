import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { config } from '@/lib/chain/runtime.cjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const c = config();
    const [records, checkpoint, products] = await Promise.all([
      prisma.chainRecord.findMany({ where: { scope: c.scope }, orderBy: [{ kind: 'asc' }, { key: 'asc' }] }),
      prisma.chainCheckpoint.findUnique({ where: { scope: c.scope } }),
      prisma.product.findMany({ where: { chainScope: c.scope, nftTokenId: { not: null } }, select: { id: true, nftTokenId: true, metadataJson: true } }),
    ]);
    const enriched = records.map(record => {
      const product = record.kind === 'nft' && products.find(p => p.nftTokenId === record.key);
      const metadata = product && product.metadataJson as { name?: string; image?: string } | null;
      return metadata ? { ...record, data: { ...(record.data as object), name: metadata.name, image: metadata.image } } : record;
    });
    return NextResponse.json({ config: c, records: enriched, checkpoint });
  } catch { return NextResponse.json({ error: 'CHAIN_NOT_READY' }, { status: 503 }); }
}
