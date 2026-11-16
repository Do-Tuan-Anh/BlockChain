import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin, rateLimit } from '@/lib/auth-security';
import prisma from '@/lib/prisma';

// Skip is a durable choice for this user, not a browser-local dismissal.
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  if (!await rateLimit('profile-onboarding', user.id, 20, 60000)) return authError('RATE_LIMITED', 429);
  await prisma.user.updateMany({ where: { id: user.id, profileSetupAt: null }, data: { profileSetupAt: new Date() } });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
