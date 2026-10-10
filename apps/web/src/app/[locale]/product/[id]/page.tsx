"use client";

import { useParams } from "next/navigation";

import { useEffect, useState } from "react";
import { useTranslation } from "../../../../contexts/LanguageContext";
import { Product } from "@/lib/products";
import { ArrowLeft, Layers3, Package, UserRound } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const { t, locale } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/products/${encodeURIComponent(params.id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "product.notFound" : "common.error");
        return res.json();
      })
      .then(data => setProduct(data.product))
      .catch(error => { if (!controller.signal.aborted) setError(error.message === "product.notFound" ? "product.notFound" : "common.error"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [params.id]);

  if (loading) return <p className="max-w-7xl mx-auto p-10">{t("common.loading")}</p>;
  if (error || !product) return <p role="alert" className="max-w-7xl mx-auto p-10 text-danger">{t(error || "product.notFound")}</p>;

  return (
    <div className="page-shell space-y-8">
      <a href={`/${locale}/explore`} className="inline-flex min-h-11 items-center gap-2 text-accent-soft text-sm"><ArrowLeft size={16} />{t("createListing.viewMarketplace")}</a>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square rounded-3xl overflow-hidden bg-inset border border-line flex items-center justify-center lg:sticky lg:top-28">
          {product.imageUrl && failedImage !== product.imageUrl ? <img src={product.imageUrl} alt={product.title} onError={() => setFailedImage(product.imageUrl)} className="w-full h-full object-cover" /> : <span className="product-placeholder" aria-label={product.title}><Package size={90} strokeWidth={.8} /></span>}
        </div>
        <div className="space-y-6">
          <div>
            <p className="inline-flex flex-wrap gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs text-accent-soft">{t(`categories.${product.category}`)} / {t(`conditions.${product.condition}`)}</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-ink mt-5 break-words">{product.title}</h1>
            <p className="text-sm leading-7 text-secondary mt-5 whitespace-pre-wrap">{product.description}</p>
          </div>
          <div className="glass-panel p-6 sm:p-8 space-y-5">
            <h2 className="font-semibold">{t("product.details")}</h2>
            <p className="text-4xl font-bold tracking-tight break-all">{product.price} <span className="text-lg text-accent-soft">{product.currency}</span></p>
            <dl className="text-sm space-y-2">
              {product.brand && <div><dt className="text-muted">{t("createListing.brand")}</dt><dd>{product.brand}</dd></div>}
              {product.model && <div><dt className="text-muted">{t("createListing.modelSerial")}</dt><dd>{product.model}</dd></div>}
            </dl>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-6">
            <UserRound size={20} className="mb-4 text-accent-soft" aria-hidden="true" />
            <p className="font-semibold">{t("product.by")} <a href={`/${locale}/seller/${product.seller.id}`} className="text-accent-soft hover:underline">{product.seller.name || product.seller.username}</a></p>
            <a href={`/${locale}/seller/${product.seller.id}`} className="mt-3 inline-block text-sm text-accent-soft hover:underline">{locale === 'vi' ? 'Xem trang cá nhân / Shop →' : 'View profile / Shop →'}</a>
            <p className="font-mono text-xs text-muted break-all mt-2">{product.seller.walletAddress}</p>
          </div>
          <p className="flex items-center gap-2 rounded-xl border border-line bg-inset p-4 text-xs text-muted"><Layers3 size={17} className="shrink-0" />{product.nftTokenId ? `NFT #${product.nftTokenId}` : t("product.notMinted")}</p>
        </div>
      </div>
    </div>
  );
}
