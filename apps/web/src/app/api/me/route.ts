import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { authError, readBody, validOrigin } from '@/lib/auth-security';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
const select = {
  id: true, name: true, username: true, email: true, phone: true, emailVerified: true,
  walletAddress: true, image: true, avatarUrl: true, bio: true, role: true, createdAt: true,
  city: true, address: true, website: true,
  products: { orderBy: { createdAt: 'desc' as const } },
};
export async function GET() {
  const session = await currentUser();
  if (!session) return authError('UNAUTHORIZED', 401);
  return NextResponse.json({ user: await prisma.user.findUnique({ where: { id: session.id }, select }) });
}
export async function PUT(req: NextRequest) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const session = await currentUser();
  if (!session) return authError('UNAUTHORIZED', 401);
  try {
    const { avatarData, ...data } = z.object({
      name: z.string().trim().min(2).max(80), bio: z.string().trim().max(1000),
      city: z.string().trim().max(100).optional(), address: z.string().trim().max(300).optional(),
      website: z.string().trim().max(300).refine(value => !value || /^https?:\/\//i.test(value) && z.string().url().safeParse(value).success).optional(),
      avatarData: z.string().max(2_800_000).nullable().optional(),
    }).strict().parse(await readBody(req, 3 * 1024 * 1024));
    let avatarUrl: string | null | undefined;
    if (avatarData === null) avatarUrl = null;
    else if (avatarData !== undefined) {
      const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(avatarData);
      if (!match) return authError('INVALID_AVATAR');
      const bytes = Buffer.from(match[1], 'base64');
      if (bytes.length > 2 * 1024 * 1024) return authError('INVALID_AVATAR');
      try {
        const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'error' });
        const metadata = await image.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) return authError('INVALID_AVATAR');
        // Decode/re-encode raster content and strip metadata before storing it.
        const normalized = await image.rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
        avatarUrl = `data:image/webp;base64,${normalized.toString('base64')}`;
      } catch { return authError('INVALID_AVATAR'); }
    }
    return NextResponse.json({ user: await prisma.user.update({ where: { id: session.id }, data: {
      ...data, ...(avatarUrl !== undefined ? { avatarUrl, ...(avatarUrl === null ? { image: null } : {}) } : {}),
    }, select }) });
  } catch { return authError('INVALID_INPUT'); }
}
