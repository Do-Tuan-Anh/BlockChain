'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Package, Plus, MapPin, Globe } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { ProductCard, ProductCardProps } from '@/components/ProductCard';
import { useTranslation } from '@/contexts/LanguageContext';

interface Seller {
  id: string; name: string | null; username: string; bio: string | null; createdAt: string;
  avatarUrl: string | null; image: string | null; city: string | null; website: string | null;
  products: (Omit<ProductCardProps, 'sellerUsername' | 'imageUrl' | 'nftTokenId'> & { imageUrl: string | null; nftTokenId: string | null })[];
}

export default function SellerProfilePage() {
  const { address } = useParams<{ address: string }>();
  const { locale, t } = useTranslation();
  const { data: session } = useSession();
  const vi = locale === 'vi';
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setSeller(null);
    fetch(`/api/sellers/${encodeURIComponent(address)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? 'missing' : 'failed');
        return response.json();
      }).then(data => setSeller(data.seller))
      .catch(error => { if (!controller.signal.aborted) setError(error.message === 'missing' ? 'missing' : 'failed'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [address, retry]);

  if (loading) return <p role="status" className="p-12 text-center text-muted">{t('common.loading')}</p>;
  if (!seller || error) return <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
    <h1 className="text-2xl font-bold">{error === 'missing' ? (vi ? 'Không tìm thấy shop' : 'Shop not found') : (vi ? 'Chưa thể tải shop' : 'Unable to load shop')}</h1>
    {error === 'failed' && <button onClick={() => setRetry(value => value + 1)} className="rounded-xl bg-primary px-5 py-3 text-white">{vi ? 'Thử lại' : 'Try again'}</button>}
    <a href={`/${locale}/explore`} className="block text-accent-soft">{vi ? 'Khám phá mặt hàng' : 'Explore products'}</a>
  </div>;
  const name = seller.name || seller.username;
  return <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
    <a href={`/${locale}/explore`} className="text-sm font-medium text-accent-soft hover:underline">← {vi ? 'Khám phá mặt hàng' : 'Explore products'}</a>
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="profile-cover" aria-hidden="true" />
      <div className="px-6 pb-8 sm:px-8">
        <div className="-mt-10 mb-5 flex flex-wrap items-end justify-between gap-4">
          <Avatar src={seller.avatarUrl || seller.image} name={name} className="relative h-28 w-28 border-4 border-surface text-4xl shadow-xl" />
          {session?.user?.id === seller.id && <div className="flex flex-wrap gap-3">
            <a href={`/${locale}/create-listing`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"><Plus size={17} />{vi ? 'Tạo bài viết / Đăng mặt hàng' : 'Create post / List product'}</a>
            <a href={`/${locale}/profile/edit`} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-inset">{vi ? 'Chỉnh sửa trang cá nhân' : 'Edit profile'}</a>
          </div>}
        </div>
        <h1 className="break-words text-3xl font-bold text-ink">{name}</h1>
        <p className="mt-1 break-all text-sm text-muted">@{seller.username}</p>
        <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-secondary">{seller.bio || (vi ? 'Người bán chưa thêm giới thiệu.' : 'This seller has not added a bio yet.')}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-secondary">
          {seller.city && <p className="flex items-center gap-2"><MapPin size={16} className="shrink-0" />{seller.city}</p>}
          {seller.website && /^https?:\/\//i.test(seller.website) && <a href={seller.website} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 break-all text-accent-soft hover:underline"><Globe size={16} className="shrink-0" />{seller.website}</a>}
        </div>
        <p className="mt-5 text-xs text-muted">{vi ? 'Tham gia từ' : 'Member since'} {new Date(seller.createdAt).toLocaleDateString(vi ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}</p>
      </div>
    </section>
    <section className="space-y-5">
      <h2 className="text-xl font-bold">{vi ? 'Mặt hàng đang bán' : 'Active listings'} <span className="font-normal text-muted">({seller.products.length})</span></h2>
      {seller.products.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{seller.products.map(product => <ProductCard key={product.id} {...product} imageUrl={product.imageUrl || ''} nftTokenId={product.nftTokenId || undefined} sellerId={seller.id} sellerUsername={name} />)}</div> : <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center"><Package className="mx-auto mb-4 text-muted" size={36} /><p className="text-sm text-muted">{vi ? 'Shop chưa có mặt hàng đang bán.' : 'This shop has no active listings yet.'}</p></div>}
    </section>
  </div>;
}
