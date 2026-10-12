import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAddress, verifyMessage } from 'ethers';
import prisma from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin, digest, rateLimit, readBody } from '@/lib/auth-security';
import { config } from '@/lib/chain/runtime.cjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  return NextResponse.json(await prisma.user.findUnique({ where: { id: user.id }, select: { walletAddress: true } }));
}
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  if (!await rateLimit('wallet-link', user.id, 20)) return authError('RATE_LIMITED', 429);
  try {
    const { address, message, signature } = await readBody(req);
    if (typeof address !== 'string' || !isAddress(address)) return authError('INVALID_ADDRESS');
    const wallet = address.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (existing?.walletAddress && existing.walletAddress.toLowerCase() !== wallet) return authError('WALLET_ALREADY_LINKED', 409);
    const purpose = `wallet:${wallet}`;
    if (!signature) {
      const expiresAt = new Date(Date.now() + 5 * 60000);
      const challenge = `TrustChain wallet association\nOrigin: ${new URL(req.url).origin}\nAccount: ${user.id}\nWallet: ${wallet}\nChain ID: ${config().chainId}\nNonce: ${randomBytes(24).toString('hex')}\nExpires: ${expiresAt.toISOString()}\nThis signature links your wallet; it does not authorize a payment.`;
      await prisma.authToken.create({ data: { userId: user.id, purpose, tokenHash: digest(challenge), expiresAt } });
      return NextResponse.json({ message: challenge });
    }
    if (typeof message !== 'string' || typeof signature !== 'string' || verifyMessage(message, signature).toLowerCase() !== wallet) return authError('INVALID_SIGNATURE');
    await prisma.$transaction(async db => {
      const consumed = await db.authToken.deleteMany({ where: { tokenHash: digest(message), userId: user.id, purpose, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new Error('EXPIRED_CHALLENGE');
      const updated = await db.user.updateMany({ where: { id: user.id, OR: [{ walletAddress: null }, { walletAddress: wallet }] }, data: { walletAddress: wallet } });
      if (updated.count !== 1) throw new Error('WALLET_ALREADY_LINKED');
    });
    return NextResponse.json({ walletAddress: wallet });
  } catch { return authError('WALLET_LINK_FAILED', 400); }
}
