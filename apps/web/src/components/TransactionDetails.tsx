'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Copy, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { formatEther, formatUnits } from 'ethers';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TransactionDetail, TransactionArgument } from '@/lib/chain/transaction-types';

function Fields({ fields }: { fields: [string, string | number | null | undefined][] }) {
  return <dl className="space-y-4 text-sm">{fields.filter(([, value]) => value !== null && value !== undefined).map(([label, value]) => <div key={label} className="grid min-w-0 gap-1 sm:grid-cols-[12rem_minmax(0,1fr)]"><dt className="text-muted">{label}</dt><dd className="min-w-0 break-all text-secondary">{value}</dd></div>)}</dl>;
}
function Args({ args }: { args: TransactionArgument[] }) {
  return <Fields fields={args.map(arg => [`${arg.name} (${arg.type})`, typeof arg.value === 'string' ? arg.value : JSON.stringify(arg.value)])} />;
}

export function TransactionDetails({ hash, scope }: { hash: string; scope?: string }) {
  const { locale } = useTranslation(), vi = locale === 'vi';
  const t = (vn: string, en: string) => vi ? vn : en;
  const key = `${hash}:${scope || ''}`;
  const [result, setResult] = useState<{ key: string; data?: TransactionDetail; error?: string }>({ key });
  const [loading, setLoading] = useState(true), [copyMessage, setCopyMessage] = useState('');
  const pending = useRef<AbortController | null>(null), generation = useRef(0), retryAt = useRef(0);
  const load = useCallback(async () => {
    if (pending.current || Date.now() < retryAt.current) return;
    const id = ++generation.current, controller = new AbortController(); pending.current = controller;
    setLoading(true);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/chain/transactions/${encodeURIComponent(hash)}${scope ? `?scope=${encodeURIComponent(scope)}` : ''}`, { cache: 'no-store', signal: controller.signal });
      const data = await response.json();
      if (response.status === 429) retryAt.current = Date.now() + 60000;
      if (id === generation.current) setResult(response.ok ? { key, data } : { key, error: data.error || 'CHAIN_RPC_UNAVAILABLE' });
    } catch { if (id === generation.current) setResult({ key, error: 'CHAIN_RPC_UNAVAILABLE' }); }
    finally { clearTimeout(timeout); if (id === generation.current) { setLoading(false); pending.current = null; } }
  }, [hash, scope, key]);
  useEffect(() => {
    retryAt.current = 0; setCopyMessage(''); void load();
    const visible = () => { if (!document.hidden) void load(); };
    const timer = setInterval(visible, 15000);
    document.addEventListener('visibilitychange', visible);
    return () => { generation.current++; pending.current?.abort(); pending.current = null; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [load]);
  const data = result.key === key ? result.data : undefined, error = result.key === key ? result.error : undefined;
  const tx = data?.transaction, receipt = data?.receipt;
  const status = data?.status;
  const labels = {
    success: t('Giao dịch thành công', 'Transaction successful'), failed: t('Giao dịch thất bại', 'Transaction failed'),
    pending: t('Đang chờ receipt', 'Awaiting receipt'), not_found: t('Chưa tìm thấy giao dịch', 'Transaction not found'), reorg: t('Blockchain thay đổi · đang kiểm tra lại', 'Chain changed · checking again'),
  };
  const errors: Record<string, string> = {
    INVALID_TRANSACTION_HASH: t('Mã giao dịch không hợp lệ. Mã Tx phải gồm 0x và 64 ký tự hex.', 'Invalid transaction hash. A Tx hash must contain 0x and 64 hexadecimal characters.'),
    TRANSACTION_SCOPE_MISMATCH: t('Liên kết thuộc deployment khác. Không thể đối chiếu giao dịch này với blockchain hiện tại.', 'This link belongs to a different deployment. It cannot be matched against the current blockchain.'),
    CHAIN_RESET_REDEPLOY_REQUIRED: t('RPC không khớp deployment đã lưu. Kiểm tra dịch vụ demo; không reset dữ liệu.', 'RPC does not match the saved deployment. Check the demo services; do not reset data.'),
    WRONG_RPC_CHAIN: t('RPC đang trỏ tới sai mạng blockchain.', 'RPC is connected to the wrong blockchain network.'),
    RATE_LIMITED: t('Có quá nhiều yêu cầu. Trang sẽ thử lại sau một phút.', 'Too many requests. This page will retry after a minute.'),
  };
  const current = status === 'success' && data?.membership === 'current';
  return <div className="page-shell max-w-5xl space-y-6">
    <a className="inline-flex min-h-11 items-center gap-2 text-accent-soft" href={`/${locale}/transactions`}><ArrowLeft size={16} />{t('Lịch sử giao dịch', 'Transaction history')}</a>
    <header className="page-heading flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">TRUSTCHAIN · ON-CHAIN</p><h1>{t('Chi tiết giao dịch', 'Transaction details')}</h1><p>{t('Đối chiếu trực tiếp transaction, receipt và sự kiện trên blockchain.', 'Inspect the transaction, receipt and events directly on the blockchain.')}</p></div>
      <button className="btn-secondary" type="button" disabled={loading} onClick={() => void load()}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('Làm mới', 'Refresh')}</button>
    </header>
    <div className="glass-panel p-5 space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">Transaction hash</p><button type="button" aria-label={t('Sao chép mã giao dịch', 'Copy transaction hash')} className="rounded-lg p-3 text-accent-soft focus-visible:ring-2 focus-visible:ring-accent" onClick={async () => { try { await navigator.clipboard.writeText(hash); setCopyMessage(t('Đã sao chép', 'Copied')); } catch { setCopyMessage(t('Không sao chép được. Bạn có thể chọn mã bên dưới.', 'Copy unavailable. Select the hash below.')); } }}><Copy size={16} /></button></div><code className="block break-all text-sm">{hash}</code>{copyMessage && <p className="text-xs text-muted" role="status">{copyMessage}</p>}</div>
    {loading && !data && !error && <p role="status" className="text-muted">{t('Đang đọc blockchain…', 'Reading blockchain…')}</p>}
    {error && <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-danger">{errors[error] || t('Chưa đọc được RPC. Kiểm tra mạng blockchain rồi bấm Làm mới.', 'RPC is unavailable. Check the blockchain network and refresh.')}</p>}
    {data && <>
      <section className="glass-panel p-5 space-y-4" aria-label={t('Kết quả blockchain', 'Blockchain result')}>
        <h2 data-testid="transaction-status" className={`flex items-center gap-2 text-xl font-semibold ${status === 'success' ? 'text-positive' : status === 'failed' ? 'text-danger' : 'text-warning'}`}>{status === 'success' ? <CheckCircle2 size={22} /> : status === 'failed' ? <XCircle size={22} /> : <Clock3 size={22} />}{labels[data.status]}</h2>
        <p className="text-sm text-secondary">{data.chain.chainName} · Chain ID {data.chain.chainId}{data.chain.chainId === 31337 && t(' · ETH thử nghiệm', ' · test ETH')}</p>
        {receipt && <p data-testid="transaction-confirmations" className="text-sm text-muted">{data.confirmations} {t('xác nhận', 'confirmations')} · {data.confirmationSatisfied ? t('Đã đủ độ sâu xác nhận theo cấu hình', 'Configured confirmation depth reached') : t('Chưa đủ độ sâu xác nhận theo cấu hình', 'Awaiting configured confirmation depth')} ({data.requiredConfirmations})</p>}
        {status === 'not_found' && <p className="text-sm text-muted">{t('RPC chưa có mã Tx này. Có thể giao dịch chưa được gửi lên mạng này; đây không phải kết luận giao dịch thất bại.', 'This RPC has no record of the hash. It may not have been submitted to this network; this does not mean it failed.')}</p>}
        {status === 'pending' && <p className="text-sm text-muted">{t('Đã tìm thấy transaction nhưng chưa có receipt để kết luận kết quả.', 'The transaction exists, but a receipt is not yet available to determine its outcome.')}</p>}
        {status === 'reorg' && <p className="text-sm text-muted">{t('Receipt không còn khớp block hiện tại. Trang đã bỏ kết quả cũ và sẽ kiểm tra lại.', 'The receipt no longer matches the current block. The previous result has been cleared and will be checked again.')}</p>}
        {status === 'failed' && <p className="text-sm text-muted">{t('Receipt có status = 0: thực thi đã bị hoàn tác. Phí gas vẫn được tính; receipt không luôn chứa lý do lỗi.', 'Receipt status = 0: execution was reverted. Gas is still charged; a receipt does not always include the failure reason.')}</p>}
        {['external', 'before_deployment'].includes(data.membership) && <p role="note" className="rounded-xl bg-warning/10 p-3 text-sm text-warning">{data.membership === 'before_deployment' ? t('Giao dịch có trước deployment đang dùng. Không liên kết với đơn hàng hiện tại.', 'This transaction predates the current deployment. It is not linked to current orders.') : t('Giao dịch không tương tác với các contract TrustChain hiện tại.', 'This transaction does not interact with the current TrustChain contracts.')}</p>}
        {data.chain.explorer && <a className="inline-flex min-h-11 items-center gap-2 text-accent-soft" href={`${data.chain.explorer}/tx/${data.hash}`} target="_blank" rel="noreferrer">{t('Mở trên explorer', 'Open in explorer')}<ExternalLink size={15} /></a>}
      </section>
      {tx && <section className="glass-panel p-5 sm:p-7 space-y-5"><h2 className="text-xl font-semibold">{t('Thông tin giao dịch', 'Transaction information')}</h2><Fields fields={[
        [t('Ví gửi', 'From'), tx.from], [t('Địa chỉ nhận', 'To'), tx.to || t('Tạo hợp đồng', 'Contract creation')], ['Contract', tx.contractName], [t('Phương thức', 'Method'), tx.call?.signature || t('Không nhận diện bằng ABI hiện tại', 'Not recognized by the current ABI')],
        [t('ETH gửi kèm transaction', 'Transaction value'), `${formatEther(tx.valueWei)} ETH`], ['Nonce', tx.nonce], [t('Gas tối đa', 'Gas limit'), tx.gasLimit],
        ['Block', receipt?.blockNumber], [t('Thời gian block', 'Block time'), receipt ? new Date(receipt.timestamp * 1000).toLocaleString(vi ? 'vi-VN' : 'en-US') : null],
        [t('Gas đã dùng', 'Gas used'), receipt?.gasUsed], [t('Giá gas thực tế', 'Effective gas price'), receipt ? `${formatUnits(receipt.effectiveGasPriceWei, 9)} Gwei` : null],
      ]} />{receipt && <div className="rounded-xl border border-line bg-inset p-4"><p className="text-sm text-muted">{t('Phí gas thực trả', 'Actual gas fee')}</p><p data-testid="transaction-gas-fee" className="mt-2 break-all text-lg font-semibold">{formatEther(receipt.gasFeeWei)} ETH</p><p className="mt-1 break-all text-xs text-muted">{receipt.gasUsed} × {receipt.effectiveGasPriceWei} wei = {receipt.gasFeeWei} wei</p></div>}<p className="text-sm text-muted">{t('ETH gửi kèm không bao gồm mọi khoản chuyển nội bộ. Các khoản Escrow và phí nền tảng bên dưới lấy từ sự kiện, tách biệt với phí gas.', 'Transaction value does not include every internal transfer. Escrow amounts and protocol fees below come from events and are separate from gas fees.')}</p>
        {tx.call && <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-medium">{t('Tham số gọi hợp đồng', 'Contract call arguments')}</summary><div className="mt-4"><Args args={tx.call.args} /></div></details>}
      </section>}
      {receipt && <section className="space-y-4"><h2 className="text-xl font-semibold">{t('Sự kiện trong receipt', 'Receipt events')} ({data.events.length})</h2>{!data.events.length && <p className="glass-panel p-5 text-muted">{t('Receipt không có sự kiện.', 'This receipt contains no events.')}</p>}{data.events.map(event => {
        const decoded = event.decoded, args = Object.fromEntries(decoded?.args.map(arg => [arg.name, arg.value]) || []);
        const escrow = current && event.contractName === 'Escrow';
        const amounts: [string, string][] = [];
        if (escrow && decoded?.name === 'EscrowDeposited') amounts.push([t('ETH khóa trong Escrow', 'ETH deposited into Escrow'), String(args.amount)]);
        if (escrow && decoded?.name === 'EscrowReleased') amounts.push([t('Người bán thực nhận', 'Seller proceeds'), String(args.sellerAmount)], [t('Phí nền tảng', 'Protocol fee'), String(args.feeAmount)]);
        if (escrow && decoded?.name === 'EscrowRefunded') amounts.push([t('Hoàn tiền người mua', 'Buyer refund'), String(args.refundAmount)]);
        return <article key={event.index} className="glass-panel p-5 space-y-4"><h3 className="break-words font-semibold">#{event.index} · {event.contractName || t('Contract khác', 'Other contract')} · {decoded?.name || t('Sự kiện chưa giải mã', 'Undecoded event')}</h3>
          {amounts.map(([label, wei]) => <p key={label} className="break-words text-sm text-accent-soft">{label}: <strong>{formatEther(wei)} ETH</strong></p>)}
          {current && event.contractName === 'MarketplaceNFT' && decoded?.name === 'Transfer' && <p className="break-all text-sm text-accent-soft">NFT #{String(args.tokenId)} · {String(args.from)} → {String(args.to)}</p>}
          {decoded && <Args args={decoded.args} />}
          {current && event.contractName === 'Escrow' && typeof args.orderId === 'string' && /^\d+$/.test(args.orderId) && <a className="inline-flex min-h-11 items-center text-sm text-accent-soft" href={`/${locale}/orders/${args.orderId}`}>{t('Mở đơn hàng', 'Open order')} #{args.orderId} →</a>}
          <details className="rounded-xl border border-line p-4 text-xs"><summary className="cursor-pointer text-muted">{t('Log gốc', 'Raw log')}</summary><div className="mt-4"><Fields fields={[[t('Địa chỉ phát sự kiện', 'Emitting address'), event.address], ...event.topics.map((topic, i): [string, string] => [`Topic ${i}`, topic]), ['Data', event.data]]} /></div></details>
        </article>;
      })}</section>}
      <details className="glass-panel p-5"><summary className="cursor-pointer font-semibold">{t('Thông tin kỹ thuật', 'Technical details')}</summary><div className="mt-5"><Fields fields={[
        ['Deployment scope', data.chain.scope], ['Block hash', receipt?.blockHash], ['Receipt status', receipt?.status], [t('Contract được tạo', 'Created contract'), receipt?.contractAddress], ['Input data', tx?.data],
      ]} /></div></details>
    </>}
  </div>;
}
