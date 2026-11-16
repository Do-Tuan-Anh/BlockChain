'use client';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useTranslation } from '@/contexts/LanguageContext';

export function WalletBalance({ compact = false }: { compact?: boolean }) {
  const { balance, balanceLoading, balanceError, refreshBalance, linked, config } = useWallet();
  const { locale } = useTranslation(), vi = locale === 'vi';
  useEffect(() => { void refreshBalance(); }, [refreshBalance]);
  const unit = config?.chainId === 31337 ? (vi ? 'ETH thử nghiệm' : 'test ETH') : 'ETH';
  let amount = '';
  if (balance) {
    const [whole, fraction = ''] = balance.balanceEth.split('.');
    const decimals = fraction.slice(0, 6).replace(/0+$/, '');
    amount = BigInt(whole).toLocaleString(vi ? 'vi-VN' : 'en-US') + (decimals ? `${vi ? ',' : '.'}${decimals}` : '');
    if (BigInt(balance.balanceWei) > BigInt(0) && BigInt(balance.balanceWei) < BigInt('1000000000000')) amount = vi ? '< 0,000001' : '< 0.000001';
  }
  return <div className={`min-w-0 rounded-xl border border-line bg-inset ${compact ? 'mt-3 p-3' : 'p-4'} space-y-2`} data-testid="wallet-balance-card">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted">{vi ? 'Số dư ví hiện tại' : 'Current wallet balance'}</p>
      <button type="button" role={compact ? 'menuitem' : undefined} tabIndex={compact ? -1 : 0} disabled={!compact && (!linked || balanceLoading)} aria-disabled={!linked || balanceLoading} onClick={() => { if (linked && !balanceLoading) void refreshBalance(); }} aria-label={vi ? 'Làm mới số dư ví' : 'Refresh wallet balance'} className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-accent-soft hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"><RefreshCw size={15} className={balanceLoading ? 'animate-spin' : ''} aria-hidden="true" /></button>
    </div>
    <p data-testid="wallet-balance" aria-live="polite" title={balance ? `${balance.balanceEth} ${unit}` : undefined} className={`break-words font-semibold ${balanceError ? 'text-warning text-sm' : compact ? 'text-sm text-ink' : 'text-xl text-ink'}`}>
      {!linked ? (vi ? 'Liên kết ví để xem số dư' : 'Link a wallet to view its balance') : balanceError || !config ? (vi ? 'Chưa đọc được số dư' : 'Balance unavailable') : balance ? `${amount} ${unit}` : (vi ? 'Đang đọc số dư…' : 'Loading balance…')}
    </p>
    {config && <p className="text-xs text-muted break-words">{config.chainName}</p>}
    {!compact && <p className="text-xs text-muted">{vi ? 'Số dư trên blockchain đã phản ánh phí gas; không gồm tiền đang giữ trong Escrow.' : 'On-chain balance reflects gas fees and excludes funds held in Escrow.'}</p>}
  </div>;
}
