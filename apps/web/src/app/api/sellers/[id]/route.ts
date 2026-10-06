import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Public allowlist: account contact details and credentials never leave this endpoint.
    const seller = await prisma.user.findFirst({
      where: { OR: [{ id }, { walletAddress: id }] },
      select: {
        id: true, username: true, name: true, bio: true, createdAt: true,
        avatarUrl: true, image: true, city: true, website: true,
        products: {
          where: { status: 'LISTED' }, orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, category: true, condition: true, price: true,
            currency: true, imageUrl: true, nftTokenId: true },
        },
      },
    });
    return seller ? NextResponse.json({ seller }) : NextResponse.json({ error: 'Seller not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Unable to load shop' }, { status: 500 });
  }
}
