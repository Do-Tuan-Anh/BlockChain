'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock3, History, RefreshCw } from 'lucide-react';
import { formatEther } from 'ethers';
import { apiJson, useWallet } from '@/contexts/WalletContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { WalletPanel } from './ChainControls';
import type { HistoryKind, TransactionHistoryData } from '@/lib/chain/history-types';

const labels: Record<HistoryKind, [string, string]> = {
  PURCHASE: ['Thanh toán vào Escrow', 'Payment into Escrow'],
  SALE_CREATED: ['Đơn bán qua Escrow', 'Sale placed in Escrow'],
  SALE_PAID: ['Nhận tiền bán hàng', 'Sale proceeds received'],
  PURCHASE_COMPLETED: ['Đã giải ngân cho người bán', 'Payment released to seller'],
  REFUND: ['Nhận tiền hoàn lại', 'Refund received'],
  SALE_REFUNDED: ['Đơn bán đã hoàn tiền', 'Sale refunded to buyer'],
};
const states: Record<string, [string, string]> = {
  HELD: ['Đang ký quỹ', 'Held in Escrow'], DISPUTED: ['Đang tranh chấp', 'Disputed'],
  RELEASED: ['Đã giải ngân', 'Released'], REFUNDED: ['Đã hoàn tiền', 'Refunded'],
};
const eth = (wei: string) => formatEther(wei).replace(/\.0$/, '');
type Filter = 'all' | 'in' | 'out' | 'neutral';
const pageSize = 20;

export function TransactionHistory() {
  const { locale } = useTranslation(), vi = locale === 'vi', language = vi ? 0 : 1;
  const w = useWallet(), { refresh } = w;
  const [data, setData] = useState<TransactionHistoryData | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all'), [page, setPage] = useState(1);
  const request = useRef(0);
  const load = useCallback(async (sync = false) => {
    const id = ++request.current;
    setBusy(true); setError('');
    try {
      if (sync) await refresh(true);
      const result = await apiJson('/api/me/transactions') as TransactionHistoryData;
      if (id === request.current) { setData(result); setPage(1); }
    } catch {
      if (id === request.current) { setData(null); setError('HISTORY_UNAVAILABLE'); }
    } finally { if (id === request.current) setBusy(false); }
  }, [refresh]);
  useEffect(() => {
    setData(null); load();
    return () => { request.current++; };
  }, [load, w.linked, w.config?.scope]);
  const filtered = data?.entries.filter(entry => filter === 'all' || entry.direction === filter) || [];
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const entries = filtered.slice((page - 1) * pageSize, page * pageSize);
  const filters: [Filter, string][] = [['all', vi ? 'Tất cả' : 'All'], ['in', vi ? 'Tiền vào' : 'Money in'], ['out', vi ? 'Tiền ra' : 'Money out'], ['neutral', vi ? 'Trạng thái đơn' : 'Order activity']];
  return <div className="page-shell space-y-6">
    <header className="page-heading flex flex-wrap items-start justify-between gap-4">
      <div><span className="eyebrow"><History size={14} />TrustChain</span><h1>{vi ? 'Lịch sử giao dịch' : 'Transaction history'}</h1><p>{vi ? 'Theo dõi tiền vào, tiền ra và trạng thái mua bán qua Escrow.' : 'Track incoming funds, outgoing payments and Escrow activity.'}</p></div>
      <button type="button" className="btn-secondary" disabled={busy || w.busy} onClick={() => load(true)}><RefreshCw size={16} className={busy ? 'animate-spin' : ''} />{busy ? (vi ? 'Đang tải…' : 'Loading…') : (vi ? 'Đồng bộ lịch sử' : 'Sync history')}</button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">{vi ? 'Chưa tải được lịch sử. Kiểm tra dịch vụ blockchain rồi bấm Đồng bộ lịch sử để thử lại.' : 'History could not be loaded. Check the blockchain services and try Sync history again.'}</p>}
    {busy && !data && <p role="status" className="text-muted">{vi ? 'Đang đọc lịch sử giao dịch…' : 'Loading transaction history…'}</p>}
    {data && <>
      <section className="glass-panel p-5 space-y-2 text-sm" aria-label={vi ? 'Phạm vi lịch sử' : 'History scope'}>
        <p className="font-semibold">{data.chain.chainName} · Chain ID {data.chain.chainId}{data.chain.chainId === 31337 && (vi ? ' · ETH thử nghiệm' : ' · test ETH')}</p>
        {data.wallet && <p className="break-all font-mono text-xs text-secondary">{data.wallet}</p>}
        <p className="text-muted">{vi ? 'Chỉ gồm giao dịch mua bán của ví đã liên kết trên lần triển khai blockchain hiện tại. Không bao gồm tiền demo được cấp, chuyển tiền ngoài TrustChain hoặc phí gas; tổng dưới đây không phải số dư ví.' : 'Only marketplace activity for your linked wallet on the current deployment. Demo funding, transfers outside TrustChain and gas fees are excluded; these totals are not your wallet balance.'}</p>
        {data.checkpoint && <p className="text-xs text-muted">{vi ? 'Đã đồng bộ đến block' : 'Indexed through block'} {data.checkpoint.blockNumber} · {new Date(data.checkpoint.updatedAt).toLocaleString(vi ? 'vi-VN' : 'en-US')}</p>}
      </section>
      {!data.wallet ? <><p className="empty-state">{vi ? 'Liên kết ví với tài khoản để xem lịch sử mua bán của bạn.' : 'Link a wallet to your account to view your trading history.'}</p><WalletPanel /></> : <>
        <section className="grid gap-4 sm:grid-cols-3" aria-label={vi ? 'Tổng giao dịch' : 'Transaction totals'}>
          <div className="glass-panel p-5"><p className="text-sm text-muted flex items-center gap-2"><ArrowDownLeft size={17} />{vi ? 'Đã nhận' : 'Received'}</p><p data-testid="history-incoming" className="mt-3 text-2xl font-semibold text-positive break-words">+{eth(data.totals.incomingWei)} ETH</p></div>
          <div className="glass-panel p-5"><p className="text-sm text-muted flex items-center gap-2"><ArrowUpRight size={17} />{vi ? 'Đã chi' : 'Paid'}</p><p data-testid="history-outgoing" className="mt-3 text-2xl font-semibold text-danger break-words">−{eth(data.totals.outgoingWei)} ETH</p></div>
          <div className="glass-panel p-5"><p className="text-sm text-muted flex items-center gap-2"><Clock3 size={17} />{vi ? 'Đang ký quỹ' : 'Currently in Escrow'}</p><p data-testid="history-escrow" className="mt-3 text-2xl font-semibold text-warning break-words">{eth(data.totals.escrowWei)} ETH</p><p className="mt-2 text-xs text-muted">{vi ? 'Giá trị các đơn mua/bán chưa giải ngân hoặc đang tranh chấp; chưa phải tiền người bán nhận.' : 'Value of your held or disputed orders; not yet seller income.'}</p></div>
        </section>
        <div className="flex flex-wrap gap-2" role="group" aria-label={vi ? 'Lọc giao dịch' : 'Filter transactions'}>{filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} className={`rounded-xl border px-4 py-2 text-sm font-medium ${filter === value ? 'border-accent/40 bg-accent/10 text-accent-soft' : 'border-line bg-surface text-secondary'}`} onClick={() => { setFilter(value); setPage(1); }}>{label}</button>)}</div>
        {!entries.length ? <p className="empty-state">{data.entries.length ? (vi ? 'Không có giao dịch trong bộ lọc này.' : 'No transactions match this filter.') : (vi ? 'Chưa có giao dịch mua bán được xác nhận cho ví này trên mạng hiện tại. Sau khi mua hàng, giải ngân hoặc hoàn tiền, bấm Đồng bộ lịch sử.' : 'No confirmed trades for this wallet on the current deployment. After a purchase, release or refund, select Sync history.')}</p> : <div className="space-y-4" aria-live="polite">{entries.map(entry => {
          const Icon = entry.direction === 'in' ? ArrowDownLeft : entry.direction === 'out' ? ArrowUpRight : Clock3;
          const color = entry.direction === 'in' ? 'text-positive bg-positive/10' : entry.direction === 'out' ? 'text-danger bg-danger/10' : 'text-muted bg-inset';
          return <article key={entry.id} data-testid="history-entry" className="glass-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3 min-w-0"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></span><div className="min-w-0"><h2 className="font-semibold">{labels[entry.kind][language]}</h2><p className="mt-1 text-sm text-secondary break-words">{entry.product?.title || `NFT #${entry.tokenId || '—'}`} · {vi ? 'Đơn' : 'Order'} #{entry.orderId}</p><p className="mt-1 text-xs text-muted">{new Date(Number(entry.timestamp) * 1000).toLocaleString(vi ? 'vi-VN' : 'en-US')}</p></div></div>
              <div className="min-w-0 sm:text-right">{entry.direction === 'neutral' ? <p className="text-sm text-muted">{vi ? 'Không phát sinh cộng/trừ' : 'No additional balance movement'}</p> : <p data-testid="history-amount" className={`text-xl font-semibold break-words ${entry.direction === 'in' ? 'text-positive' : 'text-danger'}`}>{entry.direction === 'in' ? '+' : '−'}{eth(entry.amountWei)} ETH</p>}<p className="mt-1 text-xs text-muted">{vi ? 'Trạng thái đơn hiện tại: ' : 'Current order status: '}{states[entry.orderState]?.[language] || entry.orderState}</p></div>
            </div>
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-xs text-muted">
              <p>{vi ? 'Giá trị đơn: ' : 'Order value: '}{eth(entry.orderValueWei)} ETH{entry.feeWei !== null && <> · {vi ? 'Phí nền tảng: ' : 'Protocol fee: '}{eth(entry.feeWei)} ETH</>}</p>
              {entry.kind === 'SALE_PAID' && <p>{vi ? 'Khoản cộng là tiền thực nhận sau phí nền tảng.' : 'The credit is the net amount received after the protocol fee.'}</p>}
              <p className="break-all">{vi ? 'Ví đối tác: ' : 'Counterparty: '}<code>{entry.counterparty}</code></p>
              <p className="break-all">Tx: {data.chain.explorer ? <a className="text-accent-soft underline" href={`${data.chain.explorer}/tx/${entry.transactionHash}`} target="_blank" rel="noreferrer">{entry.transactionHash}</a> : <code>{entry.transactionHash}</code>}</p>
              <p>Block {entry.blockNumber}</p>
              <div className="flex flex-wrap gap-4 pt-1"><a className="inline-flex min-h-11 items-center text-sm text-accent-soft" href={`/${locale}/orders/${entry.orderId}`}>{vi ? 'Xem đơn hàng →' : 'View order →'}</a>{entry.product && <a className="inline-flex min-h-11 items-center text-sm text-accent-soft" href={`/${locale}/product/${entry.product.id}`}>{vi ? 'Xem sản phẩm →' : 'View product →'}</a>}</div>
            </div>
          </article>;
        })}</div>}
        {pages > 1 && <nav className="flex flex-wrap items-center justify-center gap-4" aria-label={vi ? 'Phân trang lịch sử' : 'History pagination'}><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{vi ? 'Trang trước' : 'Previous'}</button><span className="text-sm text-muted">{page} / {pages}</span><button className="btn-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{vi ? 'Trang sau' : 'Next'}</button></nav>}
      </>}
    </>}
  </div>;
}
