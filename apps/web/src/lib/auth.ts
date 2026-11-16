import { getServerSession, NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import prisma from './prisma';
import { authorizeWallet } from './wallet-login';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [Credentials({
    id: 'wallet', name: 'MetaMask',
    credentials: { address: { type: 'text' }, message: { type: 'text' }, signature: { type: 'text' } },
    async authorize(credentials, req) {
      if (req.headers?.origin !== new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin) return null;
      const user = await authorizeWallet(credentials, String(req.headers?.cookie || ''));
      // Profile photos may be inline data URLs. Never let NextAuth copy them into JWT cookies.
      return user ? { id: user.id } : null;
    },
  })],
  callbacks: {
    // Never automatically link accounts just because their email addresses match.
    async jwt({ token, user }) {
      if (user) {
        const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true, walletAddress: true } });
        token.sessionVersion = stored?.sessionVersion;
        token.walletAddress = stored?.walletAddress?.toLowerCase();
        token.authMethod = 'wallet';
      }
      // Rebuild on every read as well, so pre-fix tokens lose picture/name/email claims.
      // The session callback below reads the current profile directly from PostgreSQL.
      return {
        sub: token.sub,
        sessionVersion: token.sessionVersion,
        walletAddress: token.walletAddress,
        authMethod: token.authMethod,
      };
    },
    async session({ session, token }) {
      const user = token.authMethod === 'wallet' && token.sub ? await prisma.user.findUnique({ where: { id: token.sub } }) : null;
      session.user = user && user.sessionVersion === token.sessionVersion && user.walletAddress?.toLowerCase() === token.walletAddress
        ? { id: user.id, name: user.name || user.username, username: user.username, email: user.email, image: user.avatarUrl || user.image, role: user.role, walletAddress: token.walletAddress, needsProfileSetup: !user.profileSetupAt }
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
