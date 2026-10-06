import { getServerSession, NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';
import { normalizePhone, rateLimit, verifyPassword } from './auth-security';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    Credentials({
      name: 'Email or phone',
      credentials: { identifier: { type: 'text' }, password: { type: 'password' } },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim().toLowerCase();
        const password = credentials?.password;
        if (!identifier || identifier.length > 254 || !password || password.length > 128) return null;
        const normalized = identifier.includes('@') ? identifier : normalizePhone(identifier);
        if (!await rateLimit('login-total', 'all', 200, 60_000) || !await rateLimit('login', normalized, 10)) throw new Error('RATE_LIMITED');
        const user = await prisma.user.findFirst({ where: identifier.includes('@') ? { email: normalized } : { phone: normalized } });
        if (!await verifyPassword(password, user?.passwordHash || null) || !user) return null;
        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED');
        return { id: user.id, email: user.email, name: user.name || user.username, image: user.image };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [Google({
      clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return { id: profile.sub, name: profile.name, email: profile.email?.toLowerCase(), image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null };
      },
    })] : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? [Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID, clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      profile(profile) {
        return { id: profile.id, name: profile.name, email: profile.email?.toLowerCase() || null, image: profile.picture?.data?.url || null };
      },
    })] : []),
  ],
  callbacks: {
    // Never automatically link accounts just because their email addresses match.
    async jwt({ token, user }) {
      if (user) {
        const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } });
        token.sessionVersion = stored?.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      const user = token.sub ? await prisma.user.findUnique({ where: { id: token.sub } }) : null;
      session.user = user && user.sessionVersion === token.sessionVersion
        ? { id: user.id, name: user.name || user.username, username: user.username, email: user.email, image: user.avatarUrl || user.image, role: user.role }
        : { id: '', username: '', role: '' };
      return session;
    },
    async redirect({ url, baseUrl }) {
      try { const target = new URL(url, baseUrl); return target.origin === new URL(baseUrl).origin ? target.href : baseUrl; }
      catch { return baseUrl; }
    },
  },
};

export async function currentUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}
