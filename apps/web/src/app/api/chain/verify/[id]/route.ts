import { NextRequest, NextResponse } from 'next/server';
import { Contract, config, providerFor, validateChain, abis } from '@/lib/chain/runtime.cjs';
import { readVerified } from '@/lib/ipfs.cjs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,78}$/.test(id)) return NextResponse.json({ error: 'INVALID_TOKEN_ID' }, { status: 400 });
  try {
    const c = config(), provider = providerFor(c);
    try {
      await validateChain(provider, c);
      const blockNumber = await provider.getBlockNumber();
      const contract = new Contract(c.contracts.MarketplaceNFT, abis.MarketplaceNFT, provider);
      const [owner, metadataUri] = await Promise.all([contract.ownerOf(id, { blockTag: blockNumber }), contract.tokenURI(id, { blockTag: blockNumber })]);
      let metadataIntegrity = 'unsupported_uri', metadataName = '', metadataImage = '';
      if (String(metadataUri).startsWith('ipfs://')) {
        try {
          const metadata = JSON.parse((await readVerified(metadataUri)).toString('utf8'));
          metadataName = typeof metadata.name === 'string' ? metadata.name : '';
          metadataImage = typeof metadata.image === 'string' ? metadata.image : '';
          metadataIntegrity = 'CID_VERIFIED';
        } catch { metadataIntegrity = 'UNAVAILABLE_OR_CID_MISMATCH'; }
      }
      return NextResponse.json({ chainId: c.chainId, contract: c.contracts.MarketplaceNFT, tokenId: id, owner, metadataUri, blockNumber, metadataIntegrity, metadataName, metadataImage });
    } finally { provider.destroy(); }
  } catch { return NextResponse.json({ error: 'TOKEN_NOT_FOUND_OR_RPC_UNAVAILABLE' }, { status: 404 }); }
}
