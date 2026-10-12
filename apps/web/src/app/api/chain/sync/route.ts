import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin, rateLimit } from '@/lib/auth-security';
import { syncChain } from '@/lib/chain/indexer.cjs';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  if (!await rateLimit('chain-sync', user.id, 60, 60000)) return authError('RATE_LIMITED', 429);
  try { return NextResponse.json(await syncChain(prisma)); }
  catch (error) { console.error('Chain sync:', error); return authError('CHAIN_SYNC_FAILED', 503); }
}
