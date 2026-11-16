'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { loginDestination } from '@/lib/login-destination';
type Ethereum = { request: (args: { method: string }) => Promise<unknown>; on?: (event: string, handler: () => void) => void; removeListener?: (event: string, handler: () => void) => void };
export function WalletSessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession(), { locale } = useTranslation();
  const [changing, setChanging] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const eth = (window as unknown as { ethereum?: Ethereum }).ethereum;
    if (!eth || !session?.user?.walletAddress) return;
    let active = true, switching = false, sequence = 0;
    const check = async () => {
      const id = ++sequence;
      try {
        const accounts = await eth.request({ method: 'eth_accounts' }) as string[];
        if (!active || id !== sequence || switching || accounts[0]?.toLowerCase() === session.user.walletAddress) return;
        switching = true; setChanging(true);
        const onAuthPage = /^\/(?:en|vi)\/(?:login|welcome)(?:\/|$)/.test(location.pathname);
        const next = encodeURIComponent(loginDestination(onAuthPage ? new URLSearchParams(location.search).get('next') : location.pathname + location.search, locale));
        // A concurrent session refresh must not resurrect the previous wallet's token.
        const response = await fetch('/api/auth/wallet-logout', { method: 'POST' });
        if (!response.ok) throw new Error('LOGOUT_FAILED');
        await signOut({ redirect: false });
        window.location.replace(`/${locale}/login?next=${next}${accounts.length ? '&switch=1' : ''}`);
      } catch { if (active && switching) setFailed(true); /* Network errors alone do not imply a different identity. */ }
    };
    const visible = () => { if (!document.hidden) void check(); };
    void check(); eth.on?.('accountsChanged', visible); window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    return () => { active = false; sequence++; eth.removeListener?.('accountsChanged', visible); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [session?.user?.walletAddress, locale]);
  return changing ? <div className="page-shell text-muted"><p role={failed ? 'alert' : 'status'}>{failed ? (locale === 'vi' ? 'Chưa kết thúc được phiên cũ. Hãy thử lại.' : 'Could not end the previous session. Try again.') : (locale === 'vi' ? 'Đang chuyển tài khoản…' : 'Switching account…')}</p>{failed && <button className="btn-secondary mt-4" onClick={() => window.location.reload()}>{locale === 'vi' ? 'Thử lại' : 'Try again'}</button>}</div> : children;
}
