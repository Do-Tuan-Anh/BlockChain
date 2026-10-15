import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { config } from '@/lib/chain/runtime.cjs';
import { featuredSelection } from '@/lib/featured-products.cjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    let scope: string | null = null;
    try { scope = config().scope; } catch { /* Ordinary off-chain listings can still be featured. */ }
    const where = { status: 'LISTED' as const, OR: [{ chainScope: null }, ...(scope ? [{ chainScope: scope }] : [])] };
    const candidates = await prisma.product.findMany({ where, select: { id: true } });
    const { ids, rotation, refreshAt } = featuredSelection(candidates);
    const products = await prisma.product.findMany({ where: { ...where, id: { in: ids } }, select: {
      id: true, title: true, description: true, price: true, currency: true, imageUrl: true, category: true, condition: true,
      seller: { select: { id: true, name: true, username: true } },
    } });
    products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return NextResponse.json({ products, rotation, refreshAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'FEATURED_UNAVAILABLE' }, { status: 503 }); }
}
