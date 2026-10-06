import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
// Public seller profile: never expose email, phone, hashes, tokens or private account data.
export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const user = await prisma.user.findUnique({ where: { walletAddress: (await params).address }, select: {
    id: true, username: true, name: true, walletAddress: true, avatarUrl: true, bio: true, isVerified: true,
    products: { where: { status: 'LISTED' }, orderBy: { createdAt: 'desc' } },
  } });
  return user ? NextResponse.json({ user }) : NextResponse.json({ error: 'User not found' }, { status: 404 });
}
