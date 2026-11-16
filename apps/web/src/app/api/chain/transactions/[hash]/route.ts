import { NextRequest, NextResponse } from 'next/server';
import { config, providerFor } from '@/lib/chain/runtime.cjs';
import { readTransaction, createLimiter, withDeadline, HASH } from '@/lib/chain/transaction-details.cjs';
export const dynamic = 'force-dynamic';
const allowRequest = createLimiter();
const headers = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const scope = req.nextUrl.searchParams.get('scope');
  if (!HASH.test(hash) || (scope?.length || 0) > 512) return NextResponse.json({ error: 'INVALID_TRANSACTION_HASH' }, { status: 400, headers });
  if (!allowRequest()) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers: { ...headers, 'Retry-After': '60' } });
  try {
    const c = config(), provider = providerFor(c, 8000);
    try { return NextResponse.json(await withDeadline(() => readTransaction(provider, c, hash, scope)), { headers }); }
    finally { provider.destroy(); }
  } catch (error) {
    const code = (error as Error).message;
    const mismatch = ['TRANSACTION_SCOPE_MISMATCH', 'CHAIN_RESET_REDEPLOY_REQUIRED', 'WRONG_RPC_CHAIN'].includes(code);
    return NextResponse.json({ error: mismatch ? code : 'CHAIN_RPC_UNAVAILABLE' }, { status: mismatch ? 409 : 503, headers });
  }
}
