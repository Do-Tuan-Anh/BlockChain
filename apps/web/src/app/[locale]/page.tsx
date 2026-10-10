"use client";

import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Blocks, Fingerprint, Layers3, LockKeyhole, Package, Shield } from 'lucide-react';
import { ProductCard } from '../../components/ProductCard';
import { EscrowTimeline } from '../../components/EscrowTimeline';
import { useTranslation } from '../../contexts/LanguageContext';

export default function HomePage() {
  const { t, locale } = useTranslation();
  const vi = locale === 'vi';
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/products?status=LISTED', { cache: 'no-store', signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load products');
        return res.json();
      })
      .then(data => setProducts(data.products.slice(0, 4)))
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return <div className="page-shell space-y-14">
    <section className="hero">
      <div className="relative z-10 min-w-0">
        <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-positive" />TRUSTCHAIN / P2P MARKETPLACE</p>
        <h1 className="hero-title">{vi ? 'Trao giá trị.' : 'Exchange value.'}<br /><span className="gradient-text">{vi ? 'Kết nối niềm tin.' : 'Connect with trust.'}</span></h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-secondary">{vi ? 'Khám phá những sản phẩm dành cho bạn. Xây dựng cửa hàng của riêng mình trên TrustChain — dự án marketplace hướng đến chứng nhận NFT và ký quỹ hợp đồng thông minh.' : 'Discover products that feel like you. Build your own shop on TrustChain — a marketplace project exploring NFT passports and smart-contract escrow.'}</p>
        <div className="mt-8 flex flex-wrap gap-3"><a href={`/${locale}/explore`} className="btn-primary">{t('home.browseCatalog')}<ArrowUpRight size={18} aria-hidden="true" /></a><a href={`/${locale}/create-listing`} className="btn-secondary">{t('home.startSelling')}<ArrowRight size={16} aria-hidden="true" /></a></div>
        <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 border-t border-line/70 pt-5 text-xs text-muted"><span className="inline-flex items-center gap-2"><Layers3 size={15} className="text-accent-soft" />NFT Passport</span><span className="inline-flex items-center gap-2"><LockKeyhole size={15} className="text-positive" />Smart Escrow</span><span className="inline-flex items-center gap-2"><Blocks size={15} className="text-accent-soft" />Blockchain</span></div>
      </div>
      <div className="hero-art" role="img" aria-label={vi ? 'Minh họa chứng nhận NFT và ký quỹ hợp đồng thông minh' : 'Illustration of an NFT passport and smart-contract escrow'}>
        <div className="hero-orbit" />
        <div className="hero-passport" aria-hidden="true"><div className="flex items-center justify-between text-[10px] font-semibold tracking-[.15em] text-secondary"><span>TRUSTCHAIN</span><Layers3 size={16} /></div><div className="passport-symbol"><div className="passport-diamond"><Shield size={49} strokeWidth={1.2} /></div></div><p className="text-lg font-semibold tracking-tight">Digital Passport</p><div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-muted"><span>ERC-721</span><span>OWNERSHIP RECORD</span></div></div>
        <div className="floating-card top" aria-hidden="true"><span className="icon-tile !h-9 !w-9"><Layers3 size={18} /></span><div><p className="text-[10px] uppercase tracking-wider text-muted">Digital ownership</p><p className="mt-1 text-sm font-semibold">NFT Passport</p></div></div>
        <div className="floating-card bottom" aria-hidden="true"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-positive/20 bg-positive/10 text-positive"><LockKeyhole size={20} /></span><div><p className="text-[10px] uppercase tracking-wider text-muted">Smart contract</p><p className="mt-1 text-sm font-semibold">Escrow Protocol</p></div></div>
        <p className="hero-caption">{vi ? 'MINH HỌA KIẾN TRÚC · NFT + ESCROW' : 'ARCHITECTURE CONCEPT · NFT + ESCROW'}</p>
      </div>
    </section>

    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-2">THE MARKETPLACE</p><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{vi ? 'Khám phá mới nhất' : 'Fresh on the marketplace'}</h2><p className="mt-2 text-sm text-muted">{vi ? 'Những mặt hàng vừa được cộng đồng đăng bán.' : 'The latest products listed by the community.'}</p></div><a href={`/${locale}/explore`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-soft hover:text-ink">{t('home.viewAll')}</a></div>
      {error ? <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/10 p-6 text-danger">{t('common.error')}</p> : loading ? <div className="empty-state" role="status">{t('common.loading')}</div> : products.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map(prod => <ProductCard key={prod.id} id={prod.id} title={prod.title} category={prod.category} condition={prod.condition} price={prod.price} currency={prod.currency || 'ETH'} imageUrl={prod.imageUrl || ''} sellerUsername={prod.seller?.name || prod.seller?.username || 'unknown'} sellerId={prod.seller?.id} nftTokenId={prod.nftTokenId} />)}</div> : <div className="empty-state"><Package size={32} className="mx-auto mb-4 text-accent-soft" /><p>{vi ? 'Chưa có sản phẩm được đăng bán.' : 'No products have been listed yet.'}</p><a href={`/${locale}/create-listing`} className="mt-3 inline-block font-semibold text-accent-soft">{t('home.startSelling')} →</a></div>}
    </section>

    <section className="glass-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6"><div><p className="eyebrow mb-2">THE TRUST LAYER</p><h2 className="text-2xl font-bold tracking-tight">{vi ? 'Từ giao dịch đến niềm tin.' : 'From transaction to trust.'}</h2><p className="mt-3 text-sm text-muted">{t('home.howItWorksDesc')}</p></div><span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs text-accent-soft">{vi ? 'Minh họa quy trình Escrow' : 'Escrow flow illustration'}</span></div>
      <EscrowTimeline currentStatus="SHIPPED" />
      <p className="border-t border-line pt-4 font-mono text-xs text-muted">Escrow.sol · Solidity 0.8.28</p>
    </section>

    <section className="grid gap-5 md:grid-cols-3">
      {[{ icon: LockKeyhole, title: t('home.escrowTitle'), desc: vi ? 'Mô hình ký quỹ giữ tiền trong smart contract và giải ngân theo trạng thái giao dịch.' : 'The escrow model holds funds in a smart contract and releases them according to the transaction state.' }, { icon: Layers3, title: t('home.nftTitle'), desc: vi ? 'Chứng nhận ERC-721 đại diện cho bản ghi số về sản phẩm và lịch sử chuyển quyền sở hữu.' : 'An ERC-721 passport represents a digital product record and its ownership history.' }, { icon: Fingerprint, title: t('home.privacyTitle'), desc: vi ? 'Thông tin tài khoản và sản phẩm được lưu ngoài chuỗi. Dữ liệu cá nhân không cần công khai trên blockchain.' : 'Account and product information is stored off-chain. Personal information does not need to be public on the blockchain.' }].map(({ icon: Icon, title, desc }, index) => <div key={title} className="feature-card"><div className="flex items-center justify-between"><span className="icon-tile"><Icon size={22} strokeWidth={1.6} /></span><span className="font-mono text-xs text-muted">0{index + 1}</span></div><h3>{title}</h3><p>{desc}</p></div>)}
    </section>
  </div>;
}
