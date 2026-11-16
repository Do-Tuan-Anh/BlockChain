import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin } from '@/lib/auth-security';
import prisma from '@/lib/prisma';
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const user = await currentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
