"use client";

import React, { useState, useEffect } from "react";
import { ProductCard } from "../../../components/ProductCard";
import { useTranslation } from "../../../contexts/LanguageContext";

export default function ExplorePage() {
  const { t } = useTranslation();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">{t("explore.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("explore.subtitle")}</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-gray-500 uppercase mr-1">{t("explore.category")}</span>
          {categoryKeys.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500 uppercase mr-1">{t("explore.condition")}</span>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
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
      {error ? (<p role="alert" className="text-red-600">{t("common.error")}</p>) : loading ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">{t("common.loading")}</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((prod) => (
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
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">{t("explore.noProducts")}</p>
        </div>
      )}
    </div>
  );
}
