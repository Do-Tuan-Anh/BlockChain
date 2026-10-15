import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { authError, readBody, validOrigin } from '@/lib/auth-security';
import { normalizeProfileImage } from '@/lib/profile-image';

export const dynamic = 'force-dynamic';
const select = {
  id: true, name: true, username: true, email: true, phone: true, emailVerified: true,
  walletAddress: true, image: true, avatarUrl: true, bio: true, role: true, createdAt: true,
  city: true, address: true, website: true, coverUrl: true,
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
    const { avatarData, coverData, ...data } = z.object({
      name: z.string().trim().min(2).max(80), bio: z.string().trim().max(1000),
      city: z.string().trim().max(100).optional(), address: z.string().trim().max(300).optional(),
      website: z.string().trim().max(300).refine(value => !value || /^https?:\/\//i.test(value) && z.string().url().safeParse(value).success).optional(),
      avatarData: z.string().max(2_800_000).nullable().optional(),
      coverData: z.string().max(7_000_000).nullable().optional(),
    }).strict().parse(await readBody(req, 10 * 1024 * 1024));
    let avatarUrl: string | null | undefined;
    if (avatarData === null) avatarUrl = null;
    else if (avatarData !== undefined) {
      try { avatarUrl = await normalizeProfileImage(avatarData, 'avatar'); }
      catch { return authError('INVALID_AVATAR'); }
    }
    let coverUrl: string | null | undefined;
    if (coverData === null) coverUrl = null;
    else if (coverData !== undefined) {
      try { coverUrl = await normalizeProfileImage(coverData, 'cover'); }
      catch { return authError('INVALID_COVER'); }
    }
    return NextResponse.json({ user: await prisma.user.update({ where: { id: session.id }, data: {
      ...data, ...(avatarUrl !== undefined ? { avatarUrl, ...(avatarUrl === null ? { image: null } : {}) } : {}),
      ...(coverUrl !== undefined ? { coverUrl } : {}),
    }, select }) });
  } catch { return authError('INVALID_INPUT'); }
}
