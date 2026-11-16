import { randomBytes } from 'crypto';
import { isAddress, verifyMessage } from 'ethers';
import prisma from './prisma';
import { digest, rateLimit } from './auth-security';
export const walletCookie = 'trustchain-wallet-challenge';
export async function walletChallenge(address: unknown) {
  if (typeof address !== 'string' || !isAddress(address)) throw new Error('INVALID_ADDRESS');
  const wallet = address.toLowerCase();
  if (!await rateLimit('wallet-login-total', 'all', 100, 60000) || !await rateLimit('wallet-login', wallet, 15, 60000)) throw new Error('RATE_LIMITED');
  const binding = randomBytes(32).toString('hex'), expires = new Date(Date.now() + 5 * 60000);
  const origin = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin;
  const message = `TrustChain sign-in\nOrigin: ${origin}\nWallet: ${wallet}\nNonce: ${randomBytes(24).toString('hex')}\nExpires: ${expires.toISOString()}\nSign in to TrustChain. This does not authorize a payment or cost gas.`;
  await prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: 'wallet-login:' }, expires: { lt: new Date() } } });
  await prisma.verificationToken.create({ data: { identifier: `wallet-login:${wallet}`, token: digest(`${binding}:${message}`), expires } });
  return { binding, message };
}
export async function authorizeWallet(credentials: Record<string, string> | undefined, cookie: string) {
  const { address, message, signature } = credentials || {};
  if (!address || !isAddress(address) || !message || message.length > 2048 || !signature || signature.length > 300) return null;
  const binding = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(`${walletCookie}=`))?.slice(walletCookie.length + 1);
  if (!binding || !/^[a-f0-9]{64}$/.test(binding)) return null;
  const wallet = address.toLowerCase();
  if (!await rateLimit('wallet-signature', wallet, 20, 60000)) return null;
  try { if (verifyMessage(message, signature).toLowerCase() !== wallet) return null; } catch { return null; }
  return prisma.$transaction(async db => {
    const used = await db.verificationToken.deleteMany({ where: { identifier: `wallet-login:${wallet}`, token: digest(`${binding}:${message}`), expires: { gt: new Date() } } });
    if (used.count !== 1) return null;
    const existing = await db.user.findMany({ where: { walletAddress: { equals: wallet, mode: 'insensitive' } }, take: 2 });
    if (existing.length > 1) throw new Error('AMBIGUOUS_WALLET');
    return existing[0] || db.user.upsert({ where: { walletAddress: wallet }, update: {}, create: { walletAddress: wallet, name: `User ${wallet.slice(0, 6)}…${wallet.slice(-4)}` } });
  });
}
