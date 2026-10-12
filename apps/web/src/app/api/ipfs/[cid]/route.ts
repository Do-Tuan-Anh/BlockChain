import { NextRequest, NextResponse } from 'next/server';
import { CID, readVerified } from '@/lib/ipfs.cjs';
import sharp from 'sharp';
export const dynamic = 'force-dynamic';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  if (!CID.test(cid)) return new NextResponse(null, { status: 400 });
  try {
    const bytes = await readVerified(`ipfs://${cid}`, 5 * 1024 * 1024);
    const metadata = await sharp(bytes, { limitInputPixels: 16000000 }).metadata();
    if (!['webp', 'png', 'jpeg'].includes(metadata.format || '')) return new NextResponse(null, { status: 415 });
    return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': `image/${metadata.format}`, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new NextResponse(null, { status: 502 }); }
}
