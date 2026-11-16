import { NextRequest, NextResponse } from 'next/server';
import { authError, readBody, validOrigin } from '@/lib/auth-security';
import { walletChallenge, walletCookie } from '@/lib/wallet-login';
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  try {
    const { binding, message } = await walletChallenge((await readBody(req)).address);
    const response = NextResponse.json({ message }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(walletCookie, binding, { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.NEXTAUTH_URL || req.url).protocol === 'https:', maxAge: 300, path: '/' });
    return response;
  } catch (error) { const code = (error as Error).message; return authError(code === 'RATE_LIMITED' ? code : 'WALLET_CHALLENGE_FAILED', code === 'RATE_LIMITED' ? 429 : 400); }
}
