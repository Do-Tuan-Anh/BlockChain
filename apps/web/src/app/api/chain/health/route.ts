import { NextResponse } from 'next/server';
import { config } from '@/lib/chain/runtime.cjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const c = config();
    const url = process.env.CHAIN_RPC_URL || (c.chainId === 31337 ? 'http://127.0.0.1:8545' : process.env.SEPOLIA_RPC_URL);
    if (!url) throw new Error('CHAIN_RPC_UNAVAILABLE');
    const rpc = async (method: string, params: unknown[] = []) => {
      const response = await fetch(url!, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(5000), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error('CHAIN_RPC_UNAVAILABLE');
      return data.result;
    };
    const [chainId, block, code] = await Promise.all([rpc('eth_chainId'), rpc('eth_getBlockByNumber', ['0x' + c.deploymentBlock.toString(16), false]), rpc('eth_getCode', [c.contracts.Marketplace, 'latest'])]);
    if (Number(BigInt(chainId)) !== c.chainId || block?.hash !== c.deploymentBlockHash || !code || code === '0x') return NextResponse.json({ ready: false, error: 'CHAIN_RESET_REDEPLOY_REQUIRED' }, { status: 503 });
    return NextResponse.json({ ready: true, chainId: c.chainId, scope: c.scope }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ ready: false, error: 'CHAIN_RPC_UNAVAILABLE' }, { status: 503 }); }
}
