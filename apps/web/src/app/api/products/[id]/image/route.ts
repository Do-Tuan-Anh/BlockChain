import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin, rateLimit, readBody } from '@/lib/auth-security';
import { pinBytes } from '@/lib/ipfs.cjs';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  if (!await rateLimit('product-image', user.id, 30)) return authError('RATE_LIMITED', 429);
  const product = await prisma.product.findUnique({ where: { id: (await params).id } });
  if (!product || product.sellerId !== user.id) return authError('NOT_FOUND', 404);
  if (product.metadataUri) return authError('ONCHAIN_METADATA_IS_IMMUTABLE', 409);
  let bytes: Buffer;
  try {
    const { image } = await readBody(req, 7 * 1024 * 1024);
    const match = typeof image === 'string' && /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
    if (!match) return authError('INVALID_PRODUCT_IMAGE');
    const input = Buffer.from(match[1], 'base64');
    if (input.length > 5 * 1024 * 1024) return authError('IMAGE_MAX_5_MB');
    const decoder = sharp(input, { limitInputPixels: 16000000, failOn: 'error' });
    const metadata = await decoder.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) return authError('INVALID_PRODUCT_IMAGE');
    // Decode, normalize and strip EXIF/GPS; never upload the original photo metadata.
    bytes = await decoder.rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { return authError('INVALID_PRODUCT_IMAGE'); }
  try {
    const imageUrl = await pinBytes(bytes);
    const changed = await prisma.product.updateMany({ where: { id: product.id, sellerId: user.id, metadataUri: null, updatedAt: product.updatedAt }, data: { imageUrl } });
    if (changed.count !== 1) return authError('PRODUCT_CHANGED_RETRY', 409);
    const saved = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { seller: { select: { id: true, username: true, name: true, walletAddress: true } } } });
    return NextResponse.json({ product: saved });
  } catch { return authError('IPFS_UPLOAD_FAILED', 503); }
}
