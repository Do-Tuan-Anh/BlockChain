'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Interface, parseEther } from 'ethers';
import { Wallet, RefreshCw, ExternalLink } from 'lucide-react';
import { apiJson, useWallet } from '@/contexts/WalletContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { Product } from '@/lib/products';
import abis from '@/lib/chain/abis.json';
import { uploadProductImage } from '@/lib/upload-image';
import { mediaUrl } from '@/lib/media';

export function TxLink({ hash }: { hash?: string | null }) {
  const { config } = useWallet();
  if (!hash) return null;
  return config?.explorer ? <a className="text-accent-soft break-all inline-flex gap-2 items-center" href={`${config.explorer}/tx/${hash}`} target="_blank" rel="noreferrer">{hash}<ExternalLink size={14} /></a> : <code className="break-all text-xs">{hash}</code>;
}
export function PrivateDrafts() {
  const { data: session } = useSession(), { locale } = useTranslation();
  const [drafts, setDrafts] = useState<Product[]>([]), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (session?.user?.id) apiJson('/api/me').then(({ user }) => { if (active) setDrafts(user.products.filter((p: Product) => ['DRAFT', 'MINTED'].includes(p.status || ''))); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [session?.user?.id]);
  if (!drafts.length && !error) return null;
  return <section className="glass-panel p-6 space-y-4"><h2 className="text-xl font-semibold">{locale === 'vi' ? 'Bản nháp của bạn · Tiếp tục đăng bán' : 'Your drafts · Resume publishing'}</h2><p className="text-sm text-muted">{locale === 'vi' ? 'Chỉ bạn nhìn thấy phần này. Mở sản phẩm để hoàn tất mint hoặc đăng bán.' : 'Only you can see this section. Open a product to finish minting or listing.'}</p>{drafts.map(p => <a key={p.id} href={`/${locale}/product/${p.id}`} className="flex flex-wrap justify-between gap-3 rounded-xl bg-inset p-4 text-accent-soft"><span className="break-words">{p.title}</span><span>{p.status} →</span></a>)}{error && <p role="alert" className="text-danger">{error}</p>}</section>;
}
export function WalletPanel() {
  const w = useWallet(), { locale } = useTranslation(), vi = locale === 'vi';
  const [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  return <section className="glass-panel p-5 space-y-3" aria-label={vi ? 'Ví blockchain' : 'Blockchain wallet'}>
    <div className="flex flex-wrap items-center gap-3 justify-between">
      <div><p className="font-semibold flex gap-2 items-center"><Wallet size={18} />{w.config?.chainName || (vi ? 'Blockchain chưa sẵn sàng' : 'Blockchain not configured')}</p><p className="text-xs text-muted break-all mt-1">{w.linked || (vi ? 'Chưa liên kết ví' : 'No wallet linked')}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-primary" disabled={w.busy} onClick={() => w.connect().catch(() => {})}>{w.address ? (vi ? 'Kết nối lại ví' : 'Reconnect wallet') : (vi ? 'Kết nối ví' : 'Connect wallet')}</button>
      <button type="button" className="btn-secondary" disabled={w.busy || refreshing} onClick={async () => { setRefreshing(true); setError(''); try { await w.refresh(true); } catch (e) { setError((e as Error).message); } finally { setRefreshing(false); } }}><RefreshCw size={15} />{vi ? 'Đồng bộ' : 'Sync'}</button></div>
    </div>
    {w.config && <p className="text-xs text-muted">Chain ID {w.config.chainId} · {vi ? 'Block đã đồng bộ' : 'Indexed block'}: {w.snapshot?.checkpoint?.blockNumber ?? '—'} · {w.config.confirmations} {vi ? 'block chờ an toàn' : 'confirmation blocks'}</p>}
    {w.status && <p role="status" className="text-sm text-positive">{w.status}</p>}
    {w.hash && <TxLink hash={w.hash} />}
    {(w.error || error) && <p role="alert" className="text-sm text-danger break-words">{w.error || error}</p>}
    {w.config?.chainId === 31337 && <p className="text-xs text-muted">{vi ? 'Mạng thử nghiệm trên máy. Dùng ETH thử nghiệm; không dùng ví chứa tiền thật.' : 'Local test network. Use test ETH and a development wallet.'}</p>}
  </section>;
}
export function ProductBlockchain({ product, onUpdated }: { product: Product; onUpdated?: (product: Product) => void }) {
  const w = useWallet(), { locale } = useTranslation(), { data: session } = useSession();
  const vi = locale === 'vi', owner = session?.user?.id === product.seller.id;
  const [working, setWorking] = useState(false), [error, setError] = useState(''), [stage, setStage] = useState('');
  const scopeMatches = !!w.config && (!product.chainScope || product.chainScope === w.config.scope);
  const listing = scopeMatches ? w.snapshot?.records.find(r => r.kind === 'listing' && r.key === product.listingId)?.data : null;
  const disabled = working || w.busy || !scopeMatches;
  async function updated() {
    await w.refresh(true);
    const { product: current } = await apiJson(`/api/products/${product.id}`);
    onUpdated?.(current); return current as Product;
  }
  async function publish() {
    setWorking(true); setError('');
    const storageKey = `trustchain-publish:${w.config?.scope}:${product.id}`;
    try {
      if (!w.linked) throw new Error(vi ? 'Kết nối và liên kết ví trước.' : 'Connect and link your wallet first.');
      // Recover a submitted transaction before sending another one after a reload.
      const pending = localStorage.getItem(storageKey);
      if (pending) { await w.resume(pending); localStorage.removeItem(storageKey); }
      setStage(vi ? '1/4 · Ghim metadata lên IPFS' : '1/4 · Pin metadata to IPFS');
      let current = (await apiJson(`/api/products/${product.id}/metadata`, {})).product as Product;
      await w.refresh(true);
      current = await updated();
      const savePending = (hash: string) => localStorage.setItem(storageKey, hash);
      if (!current.nftTokenId) {
        setStage(vi ? '2/4 · Mint chứng nhận NFT' : '2/4 · Mint NFT certificate');
        await w.run('MarketplaceNFT', 'mintProductNFT', [current.mintWallet, current.metadataUri], undefined, savePending);
        current = await updated();
        if (!current.nftTokenId) throw new Error('MINT_CONFIRMED_WAIT_FOR_INDEXER');
        localStorage.removeItem(storageKey);
      }
      if (current.status !== 'LISTED') {
        setStage(vi ? '3/4 · Cấp quyền cho Marketplace' : '3/4 · Approve Marketplace');
        await w.run('MarketplaceNFT', 'approve', [w.config!.contracts.Marketplace, current.nftTokenId], undefined, savePending);
        localStorage.removeItem(storageKey);
        setStage(vi ? '4/4 · Đăng bán trên blockchain' : '4/4 · Create on-chain listing');
        await w.run('Marketplace', 'createListing', [current.nftTokenId, parseEther(current.price)], undefined, savePending);
        current = await updated();
        if (current.status !== 'LISTED') throw new Error('LISTING_CONFIRMED_WAIT_FOR_INDEXER');
        localStorage.removeItem(storageKey);
      }
      setStage(vi ? 'Đã đăng bán trên blockchain' : 'Listed on blockchain');
    } catch (e) {
      const failed = e as { message: string; code?: string; cancelled?: boolean; receipt?: { status: number } };
      if (failed.message === 'TRANSACTION_REVERTED' || failed.receipt?.status === 0 || (failed.code === 'TRANSACTION_REPLACED' && failed.cancelled)) localStorage.removeItem(storageKey);
      setError(failed.message);
    }
    finally { setWorking(false); }
  }
  async function buy() {
    setWorking(true); setError('');
    try {
      const receipt = await w.run('Marketplace', 'buyItem', [product.listingId], BigInt(String(listing?.price)));
      const iface = new Interface(abis.Marketplace);
      const event = receipt.logs.filter(log => log.address.toLowerCase() === w.config?.contracts.Marketplace.toLowerCase()).map(log => { try { return iface.parseLog(log); } catch { return null; } }).find(log => log?.name === 'ItemPurchased');
      if (event) window.location.assign(`/${locale}/orders/${event.args.orderId}`);
      else await updated();
    } catch (e) { setError((e as Error).message); } finally { setWorking(false); }
  }
  return <div className="space-y-4">
    <WalletPanel />
    <div className="glass-panel p-5 space-y-3">
      <h2 className="font-semibold">{vi ? 'Chứng nhận & giao dịch blockchain' : 'Certificate & blockchain transaction'}</h2>
      {owner && !product.metadataUri && <div className="rounded-xl border border-line p-4 space-y-3"><label className="block text-sm font-medium">{vi ? 'Ảnh sản phẩm trên IPFS' : 'Product image on IPFS'}<input aria-label={vi ? 'Tải ảnh lên IPFS' : 'Upload image to IPFS'} className="mt-2 block w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        setWorking(true); setError('');
        try { onUpdated?.(await uploadProductImage(product.id, file)); setStage(vi ? 'Ảnh đã ghim trên IPFS' : 'Image pinned to IPFS'); }
        catch (e) { setError((e as Error).message); } finally { setWorking(false); }
      }} /></label><p className="text-xs text-muted">{vi ? 'JPG/PNG/WebP tối đa 5 MB. Ảnh được bỏ EXIF/GPS và ghim trước khi mint. Nếu dùng URL ngoài, hãy tải ảnh về rồi chọn tệp tại đây.' : 'JPG/PNG/WebP up to 5 MB. EXIF/GPS is stripped before pinning. For an external URL, download the image and choose the file here.'}</p>{product.imageUrl?.startsWith('ipfs://') && <img className="h-32 w-32 rounded-xl object-cover" src={mediaUrl(product.imageUrl)} alt={product.title} />}</div>}
      {!scopeMatches && <p className="text-warning text-sm">{vi ? 'Sản phẩm thuộc deployment khác hoặc blockchain chưa được cấu hình.' : 'Different deployment or blockchain not configured.'}</p>}
      <p className="text-sm">{product.nftTokenId ? `NFT #${product.nftTokenId} · ${product.status}` : (vi ? 'Chưa mint NFT' : 'NFT not minted')}</p>
      {product.metadataUri && <p className="text-xs break-all text-muted">{product.metadataUri}</p>}
      {product.mintTxHash && <TxLink hash={product.mintTxHash} />}
      {product.nftTokenId && scopeMatches && <a className="block text-accent-soft" href={`/${locale}/verify/${product.nftTokenId}`}>{vi ? 'Xác minh chứng nhận' : 'Verify certificate'} →</a>}
      {owner && !['SOLD', 'ARCHIVED'].includes(product.status || '') && (!product.nftTokenId || product.status !== 'LISTED') && <button type="button" disabled={disabled} onClick={publish} className="btn-primary">{product.nftTokenId ? (vi ? 'Tiếp tục đăng bán' : 'Resume listing') : (vi ? 'Mint NFT & đăng bán' : 'Mint NFT & list')}</button>}
      {listing?.status === 'ACTIVE' && product.status === 'LISTED' && <>
        {owner ? <button className="btn-secondary" disabled={disabled} onClick={async () => { setWorking(true); setError(''); try { await w.run('Marketplace', 'cancelListing', [product.listingId]); await updated(); } catch (e) { setError((e as Error).message); } finally { setWorking(false); } }}>{vi ? 'Hủy đăng bán' : 'Cancel listing'}</button> : <><p className="text-sm text-muted">{vi ? 'Thanh toán ETH vào Escrow. NFT được giữ trong contract đến khi giải ngân hoặc hoàn tiền.' : 'Pay ETH into Escrow. The contract holds the NFT until release or refund.'}</p><button className="btn-primary" disabled={disabled || !w.linked || w.linked === product.mintWallet} onClick={buy}>{vi ? 'Mua qua Escrow' : 'Buy with Escrow'} · {product.price} ETH</button></>}
      </>}
      {stage && <p role="status" className="text-sm text-accent-soft">{stage}</p>}
      {error && <p role="alert" className="text-sm text-danger break-words">{error}</p>}
    </div>
  </div>;
}
