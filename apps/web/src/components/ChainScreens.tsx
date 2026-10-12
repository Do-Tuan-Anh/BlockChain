'use client';
import { useEffect, useState } from 'react';
import { Contract, BrowserProvider, Eip1193Provider, formatEther, keccak256 } from 'ethers';
import { useParams } from 'next/navigation';
import { apiJson, useWallet } from '@/contexts/WalletContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { WalletPanel, TxLink } from './ChainControls';
import type { ContractName } from '@/lib/chain/types';
import abis from '@/lib/chain/abis.json';
import { mediaUrl } from '@/lib/media';

function useChainView() {
  const w = useWallet(), { locale } = useTranslation();
  useEffect(() => { const timer = setInterval(() => w.refresh().catch(() => {}), 10000); return () => clearInterval(timer); }, [w.refresh]);
  return { ...w, locale, vi: locale === 'vi' };
}
function Details({ data }: { data: Record<string, unknown> }) {
  return <dl className="space-y-3 text-sm">{Object.entries(data).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => <div key={key} className="grid gap-1 sm:grid-cols-[10rem_1fr]"><dt className="text-muted">{key}</dt><dd className="break-all">{String(value)}</dd></div>)}</dl>;
}
export function VaultScreen() {
  const w = useChainView();
  const nfts = w.snapshot?.records.filter(r => r.kind === 'nft' && r.data.owner === w.linked && !r.data.burned) || [];
  const orders = w.snapshot?.records.filter(r => r.kind === 'order' && [r.data.buyer, r.data.seller].includes(w.linked)) || [];
  const reputation = w.snapshot?.records.find(r => r.kind === 'reputation' && r.key === w.linked);
  return <div className="page-shell space-y-7"><div className="page-heading"><p className="eyebrow">ON-CHAIN ASSETS</p><h1 className="text-3xl font-bold">{w.vi ? 'Kho chứng nhận & đơn hàng' : 'Certificates & orders'}</h1><p className="text-muted mt-2">{w.vi ? 'Quyền sở hữu NFT và trạng thái giao dịch từ sự kiện blockchain.' : 'NFT ownership and transaction state from blockchain events.'}</p></div><WalletPanel />
    <h2 className="text-xl font-semibold">{w.vi ? 'NFT trong ví của bạn' : 'NFTs in your wallet'} ({nfts.length})</h2>
    {!nfts.length && <p className="glass-panel p-6 text-muted">{w.vi ? 'Chưa có NFT trong ví đã liên kết. NFT đang ký quỹ được hiển thị ở đơn hàng bên dưới.' : 'No NFTs in the linked wallet. Escrow-held NFTs appear in your orders below.'}</p>}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{nfts.map(n => <a key={n.key} href={`/${w.locale}/verify/${n.key}`} className="glass-panel p-6 space-y-3 hover:border-accent"><p className="eyebrow">ERC-721</p><h3 className="text-xl font-semibold">NFT #{n.key}</h3>{n.data.name && <p className="font-medium break-words">{String(n.data.name)}</p>}{n.data.image && <img src={mediaUrl(String(n.data.image))} alt={String(n.data.name || `NFT #${n.key}`)} className="aspect-square w-full rounded-xl object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />}<p className="text-xs text-muted break-all">{String(n.data.metadataUri || '')}</p><span className="text-accent-soft">{w.vi ? 'Xác minh →' : 'Verify →'}</span></a>)}</div>
    <h2 className="text-xl font-semibold">{w.vi ? 'Đơn mua / bán' : 'Purchases / sales'} ({orders.length})</h2>
    {!orders.length && <p className="text-muted">{w.vi ? 'Chưa có giao dịch Escrow.' : 'No escrow transactions yet.'}</p>}
    <div className="space-y-3">{orders.map(o => <a className="glass-panel flex flex-wrap justify-between gap-3 p-5" key={o.key} href={`/${w.locale}/orders/${o.key}`}><span>#{o.key} · NFT #{String(o.data.tokenId)}</span><span>{formatEther(String(o.data.amount))} ETH</span><span className="text-accent-soft">{String(o.data.state)} →</span></a>)}</div>
    {reputation && <div className="glass-panel p-6 space-y-4"><h2 className="font-semibold">{w.vi ? 'Uy tín từ giao dịch' : 'Trading reputation'}</h2><Details data={reputation.data} /></div>}
  </div>;
}

export function OrderScreen() {
  const { id } = useParams<{ id: string }>(), w = useChainView();
  const order = w.snapshot?.records.find(r => r.kind === 'order' && r.key === id)?.data;
  const dispute = w.snapshot?.records.find(r => r.kind === 'dispute' && r.key === id)?.data;
  const [evidence, setEvidence] = useState(''), [error, setError] = useState('');
  const buyer = !!order && order.buyer === w.linked, seller = !!order && order.seller === w.linked;
  const held = order?.state === 'HELD';
  const disputed = order?.state === 'DISPUTED';
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, [order?.state]);
  async function action(contract: ContractName, method: string, args: unknown[]) {
    setError(''); try { await w.run(contract, method, args); } catch (e) { setError((e as Error).message); }
  }
  return <div className="page-shell max-w-5xl space-y-6"><a className="text-accent-soft" href={`/${w.locale}/nfts`}>← {w.vi ? 'Kho chứng nhận & đơn hàng' : 'Certificates & orders'}</a><h1 className="text-3xl font-bold">{w.vi ? 'Đơn hàng' : 'Order'} #{id}</h1><WalletPanel />
    {!order ? <p className="glass-panel p-6">{w.vi ? 'Chưa tìm thấy đơn trong dữ liệu đã đồng bộ. Nếu vừa thanh toán, hãy chờ xác nhận rồi bấm Đồng bộ.' : 'Order not indexed yet. If you just paid, wait for confirmations and sync.'}</p> : <>
      <div className="glass-panel p-6 space-y-6"><div className="flex flex-wrap gap-4 justify-between"><h2 className="text-xl font-bold">{formatEther(String(order.amount))} ETH</h2><span className="text-accent-soft">{String(order.state)}</span></div>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"><li className="rounded-xl bg-positive/10 p-4 text-positive">1 · {w.vi ? 'Đã ký quỹ ETH + NFT' : 'ETH + NFT deposited'}</li><li className="rounded-xl bg-inset p-4">2 · {disputed ? (w.vi ? 'Đang tranh chấp' : 'Disputed') : held ? (w.vi ? 'Chờ nhận hàng' : 'Awaiting delivery') : (w.vi ? 'Đã xử lý' : 'Settled')}</li><li className={`rounded-xl p-4 ${held || disputed ? 'bg-inset' : 'bg-positive/10 text-positive'}`}>3 · {order.state === 'REFUNDED' ? (w.vi ? 'Đã hoàn tiền' : 'Refunded') : (w.vi ? 'Giải ngân & chuyển NFT' : 'Release & transfer NFT')}</li></ol>
        <Details data={{ buyer: order.buyer, seller: order.seller, tokenId: order.tokenId, listingId: order.listingId, createdAt: new Date(Number(order.createdAt) * 1000).toLocaleString(w.locale), escrow: w.config?.contracts.Escrow }} /><TxLink hash={String(order.lastTxHash)} />
        <div className="flex flex-wrap gap-3">
          {buyer && held && <button className="btn-primary" disabled={w.busy} onClick={() => action('Escrow', 'confirmDeliveryAndRelease', [id])}>{w.vi ? 'Đã nhận hàng · Giải ngân' : 'Received item · Release payment'}</button>}
          {seller && held && <button className="btn-secondary" disabled={w.busy} onClick={() => action('Escrow', 'refundBuyer', [id])}>{w.vi ? 'Hoàn tiền cho người mua' : 'Refund buyer'}</button>}
          {seller && held && now >= (Number(order.createdAt) + 14 * 86400) * 1000 && <button className="btn-secondary" disabled={w.busy} onClick={() => action('Escrow', 'claimTimeoutRelease', [id])}>{w.vi ? 'Nhận tiền sau 14 ngày' : 'Claim after 14 days'}</button>}
          <a className="btn-secondary" href={`/${w.locale}/verify/${order.tokenId}`}>{w.vi ? 'Xem chứng nhận NFT' : 'View NFT certificate'}</a>
        </div>
      </div>
      {(buyer || seller) && (held || disputed) && <section className="glass-panel p-6 space-y-4"><h2 className="font-semibold">{w.vi ? 'Bằng chứng tranh chấp' : 'Dispute evidence'}</h2><p className="text-sm text-muted">{w.vi ? 'Chọn tệp để tính keccak256 trên máy. Chỉ mã băm được ghi lên blockchain; giữ tệp gốc để cung cấp cho trọng tài.' : 'Choose a file to calculate keccak256 locally. Only its hash goes on-chain; keep the original for the arbitrator.'}</p><label className="block text-sm">{w.vi ? 'Tệp bằng chứng (tối đa 10 MB)' : 'Evidence file (up to 10 MB)'}<input className="block mt-2 w-full" type="file" onChange={async e => { const file = e.target.files?.[0]; setEvidence(''); if (!file) return; if (file.size > 10 * 1024 * 1024) { setError('MAX_10_MB'); return; } setEvidence(keccak256(new Uint8Array(await file.arrayBuffer()))); }} /></label><p className="break-all text-xs text-muted">{evidence}</p><button className="btn-secondary" disabled={w.busy || !evidence || (disputed && !dispute)} onClick={() => action('DisputeResolution', held ? 'openDispute' : 'submitEvidence', [id, evidence])}>{held ? (w.vi ? 'Mở tranh chấp' : 'Open dispute') : (w.vi ? 'Gửi thêm bằng chứng' : 'Submit evidence')}</button></section>}
      {dispute && <section className="glass-panel p-6 space-y-3"><h2 className="font-semibold">{w.vi ? 'Hồ sơ phân xử' : 'Dispute record'}</h2><Details data={dispute} /></section>}
      {error && <p role="alert" className="text-danger break-words">{error}</p>}
    </>}
  </div>;
}

export function VerifyScreen() {
  const { id } = useParams<{ id: string }>(), w = useChainView();
  const [data, setData] = useState<Record<string, unknown> | null>(null), [error, setError] = useState('');
  useEffect(() => { let active = true; setData(null); apiJson(`/api/chain/verify/${encodeURIComponent(id)}`).then(data => { if (active) { setData(data); setError(''); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [id, w.snapshot?.checkpoint?.blockNumber]);
  return <div className="page-shell max-w-5xl space-y-6"><h1 className="text-3xl font-bold">{w.vi ? 'Xác minh chứng nhận' : 'Verify certificate'} #{id}</h1><WalletPanel />
    <div className="glass-panel p-6 space-y-5"><p className="text-sm text-muted">{w.vi ? 'Đọc trực tiếp ownerOf và tokenURI từ contract. Chứng nhận chứng minh bản ghi và quyền sở hữu số; không tự đảm bảo hàng vật lý là chính hãng.' : 'Reads ownerOf and tokenURI directly from the contract. This verifies a digital record and ownership, not physical authenticity.'}</p>
      {error ? <p role="alert" className="text-danger">{error}</p> : !data ? <p>{w.vi ? 'Đang đọc blockchain…' : 'Reading blockchain…'}</p> : <><Details data={data} />{typeof data.metadataUri === 'string' && data.metadataUri.startsWith('ipfs://') && <a href={`${w.config?.gateway || 'http://localhost:8080/ipfs/'}${data.metadataUri.slice(7)}`} target="_blank" rel="noreferrer" className="btn-secondary">{w.vi ? 'Mở metadata IPFS' : 'Open IPFS metadata'} ↗</a>}</>}
    </div>
  </div>;
}

export function DisputesScreen() {
  const w = useChainView();
  const [arbitrator, setArbitrator] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true; setArbitrator(false);
    const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (eth && w.address && w.config) {
      const contract = new Contract(w.config.contracts.DisputeResolution, abis.DisputeResolution, new BrowserProvider(eth));
      contract.ARBITRATOR_ROLE().then(role => contract.hasRole(role, w.address)).then(value => { if (active) setArbitrator(value); }).catch(() => {});
    }
    return () => { active = false; };
  }, [w.address, w.config?.scope]);
  const disputes = w.snapshot?.records.filter(r => r.kind === 'dispute') || [];
  async function act(id: string, method: string, ruling?: number) {
    setError(''); try { await w.run('DisputeResolution', method, ruling === undefined ? [id] : [id, ruling]); } catch (e) { setError((e as Error).message); }
  }
  return <div className="page-shell space-y-6"><h1 className="text-3xl font-bold">{w.vi ? 'Phân xử tranh chấp' : 'Dispute arbitration'}</h1><WalletPanel /><p className="text-sm text-muted">{w.vi ? 'Quyền quản trị web và quyền ARBITRATOR_ROLE trên contract là hai quyền riêng. Ví đang ký phải có quyền trên contract.' : 'Web administration and the on-chain ARBITRATOR_ROLE are separate. The signing wallet must hold the contract role.'}</p>
    {!arbitrator && <p className="text-warning">{w.vi ? 'Kết nối ví được cấp ARBITRATOR_ROLE để xử lý.' : 'Connect a wallet with ARBITRATOR_ROLE to arbitrate.'}</p>}
    {!disputes.length && <div className="glass-panel p-6 text-muted">{w.vi ? 'Chưa có tranh chấp trên blockchain.' : 'No on-chain disputes yet.'}</div>}
    {disputes.map(d => { const order = w.snapshot?.records.find(r => r.kind === 'order' && r.key === d.key)?.data; const active = ['OPEN', 'UNDER_REVIEW'].includes(String(d.data.state)) && order?.state === 'DISPUTED'; return <article className="glass-panel p-6 space-y-4" key={d.key}><a className="font-semibold text-accent-soft" href={`/${w.locale}/orders/${d.key}`}>{w.vi ? 'Đơn hàng' : 'Order'} #{d.key} →</a><Details data={d.data} /><div className="flex flex-wrap gap-3">{active && <>{d.data.state === 'OPEN' && <button className="btn-secondary" disabled={!arbitrator || w.busy} onClick={() => act(d.key, 'markUnderReview')}>{w.vi ? 'Bắt đầu xem xét' : 'Mark under review'}</button>}<button className="btn-primary" disabled={!arbitrator || w.busy} onClick={() => act(d.key, 'resolveDispute', 1)}>{w.vi ? 'Phán quyết: hoàn tiền' : 'Rule: refund buyer'}</button><button className="btn-secondary" disabled={!arbitrator || w.busy} onClick={() => act(d.key, 'resolveDispute', 2)}>{w.vi ? 'Phán quyết: trả người bán' : 'Rule: pay seller'}</button></>}</div>{!active && ['OPEN', 'UNDER_REVIEW'].includes(String(d.data.state)) && <p className="text-warning">{w.vi ? 'Escrow đã được xử lý trực tiếp ngoài hồ sơ phân xử này.' : 'Escrow was settled directly outside this dispute record.'}</p>}</article>; })}
    {error && <p className="text-danger" role="alert">{error}</p>}
  </div>;
}
