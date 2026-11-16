'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserProvider, Eip1193Provider } from 'ethers';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Wallet, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { loginDestination } from '@/lib/login-destination';

export function WalletLogin() {
  const { locale } = useTranslation(), vi = locale === 'vi', params = useSearchParams();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false), auto = useRef(false);
  async function login() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
      if (!eth) throw new Error('NO_WALLET');
      await eth.request({ method: 'eth_requestAccounts' });
      const signer = await new BrowserProvider(eth).getSigner(), address = (await signer.getAddress()).toLowerCase();
      const response = await fetch('/api/auth/wallet-challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
      const challenge = await response.json();
      if (!response.ok) throw new Error(challenge.error);
      const signature = await signer.signMessage(challenge.message);
      const accounts = await eth.request({ method: 'eth_accounts' }) as string[];
      if (accounts[0]?.toLowerCase() !== address) throw new Error('ACCOUNT_CHANGED');
      const result = await signIn('wallet', { address, message: challenge.message, signature, redirect: false, callbackUrl: `/${locale}` });
      if (!result?.ok || result.error) throw new Error('LOGIN_FAILED');
      const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || session.user?.walletAddress !== address) throw new Error('LOGIN_FAILED');
      const next = loginDestination(params.get('next'), locale);
      window.location.assign(session.user.needsProfileSetup ? `/${locale}/welcome?next=${encodeURIComponent(next)}` : next);
    } catch (e) {
      const err = e as { code?: number | string; message?: string };
      setError(err.code === 4001 || err.code === 'ACTION_REJECTED' ? (vi ? 'Bạn đã hủy ký đăng nhập. Bấm để thử lại.' : 'Sign-in signature cancelled. Try again.') : err.message === 'NO_WALLET' ? (vi ? 'Hãy cài MetaMask hoặc mở bằng trình duyệt ví.' : 'Install MetaMask or open in a wallet browser.') : (vi ? 'Chưa đăng nhập được. Kiểm tra account MetaMask rồi thử lại.' : 'Unable to sign in. Check your MetaMask account and try again.'));
    } finally { lock.current = false; setBusy(false); }
  }
  useEffect(() => { if (params.get('switch') === '1' && !auto.current) { auto.current = true; void login(); } }, []); // A wallet change starts a fresh signature, never reuses the previous session.
  return <div className="page-shell flex justify-center"><section className="glass-panel w-full max-w-lg space-y-6 p-6 sm:p-10">
    <Wallet className="text-accent-soft" size={36} /><p className="eyebrow">TRUSTCHAIN · WALLET</p>
    <h1 className="text-3xl font-bold">{vi ? 'Đăng nhập bằng MetaMask' : 'Sign in with MetaMask'}</h1>
    <p className="text-secondary leading-7">{vi ? 'Chọn account trong MetaMask và ký xác nhận. Mỗi địa chỉ ví có một hồ sơ riêng; lần đầu đăng nhập sẽ tự tạo tài khoản.' : 'Choose your MetaMask account and sign in. Each wallet address has its own profile; your first sign-in creates an account.'}</p>
    <p className="flex gap-2 text-sm text-positive"><ShieldCheck className="shrink-0" size={20} />{vi ? 'Chữ ký đăng nhập không mất gas và không cho phép thanh toán.' : 'Signing in costs no gas and does not authorize payments.'}</p>
    <button className="btn-primary w-full justify-center" disabled={busy} onClick={() => void login()}>{busy ? (vi ? 'Xác nhận trong MetaMask…' : 'Confirm in MetaMask…') : (vi ? 'Đăng nhập bằng MetaMask' : 'Sign in with MetaMask')}</button>
    {error && <p role="alert" className="text-danger text-sm">{error}</p>}
    <p className="text-xs leading-6 text-muted">{vi ? 'Bạn có thể sửa tên, avatar, ảnh bìa và giới thiệu sau khi đăng nhập. Giữ an toàn cụm từ khôi phục ví của bạn.' : 'Edit your name, avatar, cover and bio after signing in. Keep your wallet recovery phrase safe.'}</p>
    <a className="text-accent-soft text-sm" href={`/${locale}/help`}>{vi ? 'Hướng dẫn MetaMask →' : 'MetaMask guide →'}</a>
  </section></div>;
}
