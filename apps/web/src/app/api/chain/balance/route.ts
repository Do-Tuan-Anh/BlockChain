import { NextResponse } from 'next/server';
import { formatEther } from 'ethers';
import { currentUser } from '@/lib/auth';
import { authError } from '@/lib/auth-security';
import prisma from '@/lib/prisma';
import { config, providerFor, validateChain } from '@/lib/chain/runtime.cjs';

export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  try {
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { walletAddress: true } });
    if (!account?.walletAddress) return authError('LINK_WALLET_FIRST', 409);
    const c = config(), provider = providerFor(c);
    try {
      await validateChain(provider, c);
      const balanceWei = (await provider.getBalance(account.walletAddress)).toString();
      return NextResponse.json({ address: account.walletAddress, scope: c.scope, balanceWei, balanceEth: formatEther(balanceWei) }, { headers: { 'Cache-Control': 'no-store' } });
    } finally { provider.destroy(); }
  } catch { return authError('CHAIN_BALANCE_UNAVAILABLE', 503); }
}
