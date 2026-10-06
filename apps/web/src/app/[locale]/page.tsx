"use client";

import React, { useEffect, useState } from "react";
import { ProductCard } from "../../components/ProductCard";
import { EscrowTimeline } from "../../components/EscrowTimeline";
import { useTranslation } from "../../contexts/LanguageContext";

export default function HomePage() {
  const { t, locale } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);

  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/products?status=LISTED", { cache: "no-store", signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then(data => setProducts(data.products.slice(0, 4)))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-200">
            <span>{t("home.badge")}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            {t("home.title")}
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            {t("home.subtitle")}
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href={`/${locale}/explore`}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-lg transition"
            >
              {t("home.browseCatalog")}
            </a>
            <a
              href={`/${locale}/create-listing`}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm px-6 py-3 rounded-lg transition"
            >
              {t("home.startSelling")}
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Trust & Escrow Architecture Visualizer */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t("home.howItWorks")}</h2>
            <p className="text-xs text-gray-500">{t("home.howItWorksDesc")}</p>
          </div>
          <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
            {t("home.activeContract")}
          </span>
        </div>
        <EscrowTimeline currentStatus="SHIPPED" />
      </section>

      {error && <p role="alert" className="text-red-600">{t("common.error")}</p>}
      {/* Featured Products Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("home.featuredTitle")}</h2>
            <p className="text-sm text-gray-500">{t("home.featuredDesc")}</p>
          </div>
          <a href={`/${locale}/explore`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            {t("home.viewAll")}
          </a>
        </div>

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
              sellerUsername={prod.seller?.name || prod.seller?.username || "unknown"}
              sellerId={prod.seller?.id}
              nftTokenId={prod.nftTokenId}
            />
          ))}
        </div>
      </section>

      {/* Architectural Principles Callout */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-3">
            🔒
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">{t("home.escrowTitle")}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{t("home.escrowDesc")}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg mb-3">
            📜
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">{t("home.nftTitle")}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{t("home.nftDesc")}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg mb-3">
            🛡️
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">{t("home.privacyTitle")}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{t("home.privacyDesc")}</p>
        </div>
      </section>
    </div>
  );
}
