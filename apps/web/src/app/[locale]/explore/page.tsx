"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { Compass, PackageSearch, Search, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from "../../../components/ProductCard";
import { useTranslation } from "../../../contexts/LanguageContext";

export default function ExplorePage() {
  return <Suspense fallback={<div className="page-shell" aria-busy="true">TrustChain…</div>}><ExploreCatalog /></Suspense>;
}

function ExploreCatalog() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryKeys = ["All", "Sneakers", "Electronics", "Watches", "Gaming", "Collectibles", "Fashion"];
  const conditionKeys = ["All", "New in Box", "Like New", "Good", "Fair", "Pristine"];

  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ status: "LISTED" });
    if (selectedCategory !== "All") params.set("category", selectedCategory);
    if (selectedCondition !== "All") params.set("condition", selectedCondition);
    fetch(`/api/products?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then((data) => setProducts(data.products))
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedCategory, selectedCondition]);

  // Search only the products returned by the existing filters; no API/data changes.
  const visibleProducts = products.filter(product => [product.title, product.brand, product.model, product.category, product.nftTokenId].some(value => String(value || '').toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())));

  return (
    <div className="page-shell space-y-8">
      <div className="page-heading">
        <p className="eyebrow"><Compass size={15} aria-hidden="true" />THE MARKETPLACE</p>
        <h1 className="text-3xl font-extrabold text-ink">{t("explore.title")}</h1>
        <p className="text-sm text-muted mt-1">{t("explore.subtitle")}</p>
      </div>

      <form role="search" className="relative max-w-xl">
        <Search size={19} className="pointer-events-none absolute left-4 top-4 text-muted" aria-hidden="true" />
        <input key={searchTerm} name="q" type="search" defaultValue={searchTerm} aria-label={t('nav.searchPlaceholder')} placeholder={t('nav.searchPlaceholder')} className="w-full !min-h-14 border py-3 pl-12 pr-16 text-sm" />
        <button type="submit" aria-label={t('nav.explore')} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-hover"><Search size={17} aria-hidden="true" /></button>
      </form>

      {/* Filter Bar */}
      <div className="glass-panel flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted mr-2"><SlidersHorizontal size={15} />{t("explore.category")}</span>
          {categoryKeys.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-10 text-xs px-4 py-2 rounded-xl font-medium transition ${
                selectedCategory === cat
                  ? "bg-primary text-white"
                  : "bg-elevated text-secondary hover:bg-line"
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <label htmlFor="product-condition" className="text-xs font-semibold text-muted">{t("explore.condition")}</label>
          <select
            id="product-condition"
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="text-xs bg-inset border border-line rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent/30"
          >
            {conditionKeys.map((cond) => (
              <option key={cond} value={cond}>
                {t(`conditions.${cond}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {error ? (<p role="alert" className="text-danger">{t("common.error")}</p>) : loading ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">{t("common.loading")}</p>
        </div>
      ) : visibleProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              id={prod.id}
              title={prod.title}
              category={prod.category}
              condition={prod.condition}
              price={prod.price}
              currency={prod.currency || "ETH"}
              imageUrl={prod.imageUrl || ""}
              sellerUsername={prod.seller?.name || prod.seller?.username || prod.sellerUsername || "unknown"}
              sellerId={prod.seller?.id}
              nftTokenId={prod.nftTokenId}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <PackageSearch size={36} strokeWidth={1.4} className="mx-auto mb-5 text-accent-soft" aria-hidden="true" />
          <p className="text-muted text-sm">{t("explore.noProducts")}</p>
        </div>
      )}
    </div>
  );
}
