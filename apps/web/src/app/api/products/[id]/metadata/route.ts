import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin, rateLimit } from '@/lib/auth-security';
import { config, providerFor, validateChain } from '@/lib/chain/runtime.cjs';
import { pinBytes, readVerified } from '@/lib/ipfs.cjs';
import sharp from 'sharp';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  if (!await rateLimit('metadata', user.id, 30)) return authError('RATE_LIMITED', 429);
  try {
    const c = config(), provider = providerFor(c);
    try { await validateChain(provider, c); } finally { provider.destroy(); }
    const product = await prisma.product.findUnique({ where: { id: (await params).id }, include: { seller: true } });
    if (!product || product.sellerId !== user.id) return authError('NOT_FOUND', 404);
    if (!product.seller.walletAddress) return authError('LINK_WALLET_FIRST');
    if (product.chainScope && product.chainScope !== c.scope) return authError('PRODUCT_BELONGS_TO_ANOTHER_DEPLOYMENT', 409);
    if (product.metadataUri) { const { seller, ...publicProduct } = product; return NextResponse.json({ product: publicProduct }); }
    if (product.imageUrl) {
      if (!product.imageUrl.startsWith('ipfs://')) return authError('UPLOAD_IMAGE_TO_IPFS_FIRST', 409);
      const image = await readVerified(product.imageUrl, 5 * 1024 * 1024);
      const info = await sharp(image, { limitInputPixels: 16000000 }).metadata();
      if (!['png', 'jpeg', 'webp'].includes(info.format || '')) return authError('INVALID_PRODUCT_IMAGE');
      await pinBytes(image); // Ensure both configured replicas pin the image before minting.
    }
    // Snapshot public product information only. Never include name, email, phone, or delivery address.
    const metadata = { name: product.title, description: product.description, image: product.imageUrl || '', external_url: `${new URL(req.url).origin}/vi/product/${product.id}`, properties: { productId: product.id, scope: c.scope }, attributes: [
      { trait_type: 'Category', value: product.category }, { trait_type: 'Condition', value: product.condition },
      { trait_type: 'Brand', value: product.brand || '' }, { trait_type: 'Model', value: product.model || '' },
    ] };
    const metadataUri = await pinBytes(Buffer.from(JSON.stringify(metadata)));
    await prisma.product.updateMany({ where: { id: product.id, metadataUri: null, updatedAt: product.updatedAt }, data: { metadataUri, metadataJson: metadata, chainScope: c.scope, mintWallet: product.seller.walletAddress.toLowerCase(), status: 'DRAFT' } });
    const saved = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    if (!saved.metadataUri) return authError('PRODUCT_CHANGED_RETRY', 409);
    return NextResponse.json({ product: saved });
  } catch (error) { console.error('Metadata pin:', error); return authError('METADATA_PREPARATION_FAILED', 503); }
}
