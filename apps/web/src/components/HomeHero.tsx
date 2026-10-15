'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Package, Pause, Play } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { mediaUrl } from '@/lib/media';

interface FeaturedProduct {
  id: string; title: string; description: string; price: string; currency: string; imageUrl: string | null;
  category: string; condition: string; seller: { id: string; name: string | null; username: string };
}
function FeaturedImage({ product }: { product: FeaturedProduct }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed ? <img src={mediaUrl(product.imageUrl)} alt={product.title} className="h-full w-full object-contain" loading="lazy" onError={() => setFailed(true)} /> : <Package size={80} strokeWidth={1} className="text-accent-soft" aria-hidden="true" />;
}

export function HomeHero({ children }: { children: React.ReactNode }) {
  const { locale, t } = useTranslation(), vi = locale === 'vi';
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [activeId, setActiveId] = useState('intro');
  const [autoplay, setAutoplay] = useState(false), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [hidden, setHidden] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null), swiped = useRef(false);
  const ids = ['intro', ...products.map(p => p.id)];
  const index = Math.max(0, ids.indexOf(activeId)), count = ids.length;
  const playing = autoplay && !hovered && !focused && !hidden && count > 1;
  function move(offset: number) { setActiveId(ids[(index + offset + count) % count]); }

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setAutoplay(!preference.matches);
    const visibility = () => setHidden(document.hidden);
    motion(); visibility();
    preference.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { preference.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    let disposed = false, timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    async function load() {
      clearTimeout(timer); controller?.abort();
      const current = new AbortController(); controller = current;
      let wait = 60_000;
      try {
        const response = await fetch('/api/products/featured', { cache: 'no-store', signal: current.signal });
        if (!response.ok) throw new Error('FEATURED_UNAVAILABLE');
        const data = await response.json();
        if (disposed || current.signal.aborted) return;
        setProducts(data.products);
        setActiveId(id => id === 'intro' || data.products.some((p: FeaturedProduct) => p.id === id) ? id : 'intro');
        wait = Math.max(1000, Math.min(wait, data.refreshAt - Date.now()));
      } catch { if (current.signal.aborted) return; if (!disposed) { setProducts([]); setActiveId('intro'); } }
      if (!disposed) timer = setTimeout(load, wait);
    }
    const visible = () => { if (!document.hidden) { clearTimeout(timer); void load(); } };
    void load(); document.addEventListener('visibilitychange', visible);
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visible); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setActiveId(ids[(index + 1) % count]), 6500);
    return () => clearTimeout(timer);
  // A new ID list may arrive after a sale or at the 30-minute rotation boundary.
  }, [playing, index, ids.join('|'), count]);

  return <section className="hero-carousel" aria-roledescription={vi ? 'trình chiếu' : 'carousel'} aria-label={vi ? 'Giới thiệu TrustChain và sản phẩm nổi bật' : 'TrustChain introduction and featured products'}
    onPointerEnter={e => { if (e.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="hero-slides" tabIndex={0} aria-label={vi ? 'Dùng phím trái/phải hoặc vuốt để chuyển slide' : 'Use left/right arrows or swipe to change slides'}
      onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); } }}
      onPointerDown={e => { swiped.current = false; if (e.pointerType !== 'mouse') touch.current = { x: e.clientX, y: e.clientY }; }}
      onPointerCancel={() => { touch.current = null; }}
      onPointerUp={e => { if (!touch.current) return; const dx = e.clientX - touch.current.x, dy = e.clientY - touch.current.y; touch.current = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; move(dx < 0 ? 1 : -1); } }}
      onClickCapture={e => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } }}>
      <div className={`hero-slide ${index === 0 ? 'is-active' : ''}`} inert={index !== 0} aria-hidden={index !== 0} data-testid="hero-intro">{children}</div>
      {products.map((product, i) => <div key={product.id} className={`hero-slide ${index === i + 1 ? 'is-active' : ''}`} inert={index !== i + 1} aria-hidden={index !== i + 1} data-testid="hero-product" data-product-id={product.id}>
        <article className="hero featured-hero">
          <div className="relative z-10 min-w-0">
            <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-positive" />{vi ? 'KHÁM PHÁ / ĐANG BÁN' : 'DISCOVER / FOR SALE'}</p>
            <p className="mb-4 text-sm text-accent-soft">{t(`categories.${product.category}`) === `categories.${product.category}` ? product.category : t(`categories.${product.category}`)}</p>
            <h2 className="hero-title line-clamp-3 break-words">{product.title}</h2>
            <p className="mt-5 line-clamp-3 max-w-lg text-base leading-7 text-secondary">{product.description}</p>
            <p className="mt-5 text-2xl font-bold break-words">{product.price} <span className="text-base text-accent-soft">{product.currency}</span></p>
            <p className="mt-3 text-sm text-muted">{vi ? 'Đăng bởi ' : 'Listed by '}<a className="text-accent-soft hover:underline" href={`/${locale}/seller/${product.seller.id}`}>{product.seller.name || product.seller.username}</a></p>
            <a className="btn-primary mt-7" href={`/${locale}/product/${product.id}`}>{vi ? 'Khám phá sản phẩm' : 'Explore this product'}<ArrowUpRight size={18} /></a>
          </div>
          <a className="featured-hero-image" href={`/${locale}/product/${product.id}`} aria-label={`${vi ? 'Xem sản phẩm' : 'View product'}: ${product.title}`}><FeaturedImage product={product} /><span className="featured-image-label">{vi ? 'Tìm thấy điều bạn yêu thích.' : 'Find something you love.'}</span></a>
        </article>
      </div>)}
    </div>
    <div className="carousel-controls">
      <div className="flex items-center gap-1"><button type="button" className="carousel-button" disabled={count === 1} aria-label={vi ? 'Slide trước' : 'Previous slide'} onClick={() => move(-1)}><ChevronLeft size={20} /></button><button type="button" className="carousel-button" disabled={count === 1} aria-label={vi ? 'Slide sau' : 'Next slide'} onClick={() => move(1)}><ChevronRight size={20} /></button><button type="button" className="carousel-button" disabled={count === 1} aria-label={autoplay ? (vi ? 'Tạm dừng tự chuyển' : 'Pause slideshow') : (vi ? 'Bật tự chuyển' : 'Play slideshow')} onClick={() => setAutoplay(value => !value)}>{autoplay ? <Pause size={16} /> : <Play size={16} />}</button></div>
      <div className="flex flex-wrap items-center justify-center gap-1" role="group" aria-label={vi ? 'Chọn slide' : 'Choose slide'}>{ids.map((id, i) => <button key={id} type="button" className="carousel-dot" aria-current={index === i ? 'true' : undefined} aria-label={i === 0 ? (vi ? 'Giới thiệu TrustChain' : 'TrustChain introduction') : `${vi ? 'Sản phẩm' : 'Product'} ${i}: ${products[i - 1].title}`} onClick={() => setActiveId(id)}><span /></button>)}</div>
      <span className="min-w-10 text-right font-mono text-xs text-muted" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{index + 1} / {count}</span>
    </div>
  </section>;
}
