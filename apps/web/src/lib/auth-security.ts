import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from './prisma';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10).max(128);
export function normalizePhone(value: string) {
  const phone = value.replace(/[\s()-]/g, '');
  return /^0\d{9}$/.test(phone) ? `+84${phone.slice(1)}` : phone;
}
export const phoneSchema = z.string().trim().transform(normalizePhone)
  .refine(value => !value || /^\+[1-9]\d{7,14}$/.test(value));
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string | null) {
  if (!hash) { await derive(password, 'missing-account'); return false; }
  const [algorithm, salt, expected] = hash.split(':');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const key = await derive(password, salt);
  const stored = Buffer.from(expected, 'hex');
  return stored.length === key.length && timingSafeEqual(key, stored);
}

// Atomic counters are shared across server instances and survive a restart.
export async function rateLimit(scope: string, identifier: string, max = 8, duration = 15 * 60_000) {
  const key = digest(`${scope}:${identifier}`);
  const now = new Date();
  const expiry = new Date(now.getTime() + duration);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiry})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."expiresAt" <= ${now} THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= ${now} THEN ${expiry} ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "count"`;
  return rows[0].count <= max;
}

export function validOrigin(req: NextRequest) {
  return req.headers.get('origin') === new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin;
}
export const authError = (error: string, status = 400) => NextResponse.json({ error }, { status });
export async function readBody(req: NextRequest, limit = 16_384) {
  if (Number(req.headers.get('content-length') || 0) > limit || !req.body) throw new Error('INVALID_INPUT');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('INVALID_INPUT'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { reader.releaseLock(); }
}
