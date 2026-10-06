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

  if (loading) return <p role="status" className="p-12 text-center text-slate-500">{t('common.loading')}</p>;
  if (!seller || error) return <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
    <h1 className="text-2xl font-bold">{error === 'missing' ? (vi ? 'Không tìm thấy shop' : 'Shop not found') : (vi ? 'Chưa thể tải shop' : 'Unable to load shop')}</h1>
    {error === 'failed' && <button onClick={() => setRetry(value => value + 1)} className="rounded-xl bg-blue-600 px-5 py-3 text-white">{vi ? 'Thử lại' : 'Try again'}</button>}
    <a href={`/${locale}/explore`} className="block text-blue-600">{vi ? 'Khám phá mặt hàng' : 'Explore products'}</a>
  </div>;
  const name = seller.name || seller.username;
  return <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
    <a href={`/${locale}/explore`} className="text-sm font-medium text-blue-600 hover:underline">← {vi ? 'Khám phá mặt hàng' : 'Explore products'}</a>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />
      <div className="px-6 pb-8 sm:px-8">
        <div className="-mt-10 mb-5 flex flex-wrap items-end justify-between gap-4">
          <Avatar src={seller.avatarUrl || seller.image} name={name} className="h-28 w-28 border-4 border-white text-4xl" />
          {session?.user?.id === seller.id && <div className="flex flex-wrap gap-3">
            <a href={`/${locale}/create-listing`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={17} />{vi ? 'Tạo bài viết / Đăng mặt hàng' : 'Create post / List product'}</a>
            <a href={`/${locale}/profile/edit`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">{vi ? 'Chỉnh sửa trang cá nhân' : 'Edit profile'}</a>
          </div>}
        </div>
        <h1 className="break-words text-3xl font-bold text-slate-900">{name}</h1>
        <p className="mt-1 break-all text-sm text-slate-400">@{seller.username}</p>
        <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{seller.bio || (vi ? 'Người bán chưa thêm giới thiệu.' : 'This seller has not added a bio yet.')}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
          {seller.city && <p className="flex items-center gap-2"><MapPin size={16} className="shrink-0" />{seller.city}</p>}
          {seller.website && /^https?:\/\//i.test(seller.website) && <a href={seller.website} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 break-all text-blue-600 hover:underline"><Globe size={16} className="shrink-0" />{seller.website}</a>}
        </div>
        <p className="mt-5 text-xs text-slate-500">{vi ? 'Tham gia từ' : 'Member since'} {new Date(seller.createdAt).toLocaleDateString(vi ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}</p>
      </div>
    </section>
    <section className="space-y-5">
      <h2 className="text-xl font-bold">{vi ? 'Mặt hàng đang bán' : 'Active listings'} <span className="font-normal text-slate-400">({seller.products.length})</span></h2>
      {seller.products.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{seller.products.map(product => <ProductCard key={product.id} {...product} imageUrl={product.imageUrl || ''} nftTokenId={product.nftTokenId || undefined} sellerId={seller.id} sellerUsername={name} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Package className="mx-auto mb-4 text-slate-300" size={36} /><p className="text-sm text-slate-500">{vi ? 'Shop chưa có mặt hàng đang bán.' : 'This shop has no active listings yet.'}</p></div>}
    </section>
  </div>;
}
