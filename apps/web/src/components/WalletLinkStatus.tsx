'use client';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useTranslation } from '@/contexts/LanguageContext';

export function WalletLinkStatus() {
  const { linked } = useWallet(), { locale } = useTranslation();
  const vi = locale === 'vi';
  const Icon = linked ? CheckCircle2 : CircleAlert;
  return <span data-testid="wallet-link-status" className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold ${linked ? 'border-positive/30 bg-positive/10 text-positive' : 'border-danger/30 bg-danger/10 text-danger'}`}>
    <Icon size={14} aria-hidden="true" />
    {linked ? (vi ? 'Đã liên kết ví' : 'Wallet associated') : (vi ? 'Chưa liên kết ví' : 'No linked wallet')}
  </span>;
}
