import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from './prisma';
import { authError, digest, emailSchema, hashPassword, passwordSchema, phoneSchema, rateLimit, readBody, validOrigin } from './auth-security';
import { sendAuthEmail } from './auth-mail';

type Action = 'register' | 'forgot-password' | 'resend-verification' | 'verify-email' | 'reset-password';
const registration = z.object({
  name: z.string().trim().min(2).max(80), email: emailSchema,
  phone: phoneSchema.optional(), password: passwordSchema,
});
const tokenInput = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema.optional() });
const accepted = () => NextResponse.json({ ok: true }, { status: 202 });

export async function authAction(req: NextRequest, action: Action) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  try {
    if (!await rateLimit('auth-total', 'all', 200, 60_000)) return authError('RATE_LIMITED', 429);
    const body = await readBody(req);
    if (action === 'register') {
      const input = registration.parse(body);
      if (!await rateLimit('register', input.email, 4)) return authError('RATE_LIMITED', 429);
      const existing = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])] } });
      if (existing) return accepted();
      const user = await prisma.user.create({ data: {
        name: input.name, email: input.email, phone: input.phone || null,
        passwordHash: await hashPassword(input.password),
      } });
      await sendAuthEmail(user, 'verify');
      return accepted();
    }
    if (action === 'forgot-password' || action === 'resend-verification') {
      const email = emailSchema.parse(body?.email);
      if (!await rateLimit(action, email, 3)) return authError('RATE_LIMITED', 429);
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && ((action === 'forgot-password' && user.emailVerified && user.passwordHash) ||
          (action === 'resend-verification' && !user.emailVerified && user.passwordHash))) {
        await sendAuthEmail(user, action === 'forgot-password' ? 'reset' : 'verify');
      }
      return accepted();
    }
    const input = tokenInput.parse(body);
    if (action === 'reset-password' && !input.password) return authError('INVALID_INPUT');
    const purpose = action === 'verify-email' ? 'verify' : 'reset';
    const hash = digest(input.token);
    if (!await rateLimit('token', hash, 5)) return authError('RATE_LIMITED', 429);
    const record = await prisma.authToken.findUnique({ where: { tokenHash: hash } });
    if (!record || (record.purpose !== purpose && !(purpose === 'verify' && record.purpose === 'verified')) || record.expiresAt <= new Date()) return authError('INVALID_TOKEN');
    if (purpose === 'verify') {
      // Retain the hash until expiry so reopening the same email is a harmless success.
      // Password-reset tokens remain strictly single-use in the transaction below.
      await prisma.$transaction(async tx => {
        const claimed = await tx.authToken.updateMany({
          where: { id: record.id, purpose: 'verify', expiresAt: { gt: new Date() } },
          data: { purpose: 'verified' },
        });
        if (claimed.count === 1) {
          await tx.user.updateMany({ where: { id: record.userId, emailVerified: null }, data: { emailVerified: new Date() } });
        } else {
          const completed = await tx.authToken.findUnique({ where: { id: record.id }, include: { user: { select: { emailVerified: true } } } });
          if (!completed || completed.purpose !== 'verified' || completed.expiresAt <= new Date() || !completed.user.emailVerified) throw new Error('INVALID_TOKEN');
        }
      });
      return NextResponse.json({ ok: true });
    }
    const passwordHash = purpose === 'reset' ? await hashPassword(input.password!) : null;
    await prisma.$transaction(async tx => {
      const consumed = await tx.authToken.deleteMany({ where: { id: record.id, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new Error('INVALID_TOKEN');
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.authToken.deleteMany({ where: { userId: record.userId, purpose } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === 'INVALID_INPUT')) return authError('INVALID_INPUT');
    if (error instanceof Error && error.message === 'INVALID_TOKEN') return authError('INVALID_TOKEN');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && action === 'register') return accepted();
    console.error('Authentication action failed:', action, error instanceof Error ? error.name : 'UnknownError');
    return authError('SERVICE_UNAVAILABLE', 503);
  }
}
