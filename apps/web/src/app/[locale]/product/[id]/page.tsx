"use client";

import { useParams } from "next/navigation";

import { useEffect, useState } from "react";
import { useTranslation } from "../../../../contexts/LanguageContext";
import { Product } from "@/lib/products";

export default function ProductDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const { t, locale } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  if (error || !product) return <p role="alert" className="max-w-7xl mx-auto p-10 text-red-600">{t(error || "product.notFound")}</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <a href={`/${locale}/explore`} className="text-blue-600 text-sm">{t("createListing.viewMarketplace")}</a>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-6xl" aria-label={product.title}>&#9633;</span>}
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500">{t(`categories.${product.category}`)} / {t(`conditions.${product.condition}`)}</p>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-2">{product.title}</h1>
            <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{product.description}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold">{t("product.details")}</h2>
            <p className="text-3xl font-bold">{product.price} <span className="text-lg text-gray-600">{product.currency}</span></p>
            <dl className="text-sm space-y-2">
              {product.brand && <div><dt className="text-gray-500">{t("createListing.brand")}</dt><dd>{product.brand}</dd></div>}
              {product.model && <div><dt className="text-gray-500">{t("createListing.modelSerial")}</dt><dd>{product.model}</dd></div>}
            </dl>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-semibold">{t("product.by")} <a href={`/${locale}/seller/${product.seller.id}`} className="text-blue-600 hover:underline">{product.seller.name || product.seller.username}</a></p>
            <a href={`/${locale}/seller/${product.seller.id}`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">{locale === 'vi' ? 'Xem trang cá nhân / Shop →' : 'View profile / Shop →'}</a>
            <p className="font-mono text-xs text-gray-500 break-all mt-2">{product.seller.walletAddress}</p>
          </div>
          <p className="text-sm text-gray-500">{product.nftTokenId ? `NFT #${product.nftTokenId}` : t("product.notMinted")}</p>
        </div>
      </div>
    </div>
  );
}
