"use client";

import React, { useState } from "react";
import { useTranslation } from "../../../contexts/LanguageContext";
import { Product } from "@/lib/products";
import { ImagePlus, Package, Plus } from 'lucide-react';
import { useClientReady } from '@/components/useClientReady';

export default function CreateListingPage() {
  const clientReady = useClientReady();
  const { t, locale } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Sneakers");
  const [condition, setCondition] = useState("New in Box");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [step, setStep] = useState<"form" | "saving" | "completed">("form");
  const [savedProduct, setSavedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  const categoryKeys = ["Sneakers", "Electronics", "Watches", "Gaming", "Collectibles", "Fashion"];
  const conditionKeys = ["New in Box", "Like New", "Good", "Fair", "Pristine"];

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== "form") return;
    setStep("saving");
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          condition,
          brand,
          model,
          price,
          currency: "ETH",
          imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.product?.id) throw new Error(data.error || t("common.error"));
      setSavedProduct(data.product);
      setStep("completed");
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
      setStep("form");
    }
  };

  return (
    <div className="page-shell space-y-8">
      <div className="page-heading">
        <p className="eyebrow"><Plus size={15} />YOUR NEXT LISTING</p>
        <h1 className="text-3xl font-extrabold text-ink">{t("createListing.title")}</h1>
        <p className="text-sm text-muted mt-1">{t("createListing.subtitle")}</p>
      </div>

      {step === "completed" ? (
        <div className="bg-surface border border-line rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-positive/10 text-positive rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-ink">{t("createListing.successTitle")}</h2>
          <p className="text-sm text-secondary max-w-md mx-auto">
            {t("createListing.successDesc")} <strong>{savedProduct?.title}</strong> — <strong>{savedProduct?.price} {savedProduct?.currency}</strong>.
          </p>
          <p className="text-sm text-secondary">{savedProduct?.description}</p>
          <a href={`/${locale}/product/${savedProduct?.id}`} className="block text-accent-soft font-semibold">{t("createListing.viewProduct")}</a>
          <a href={`/${locale}/profile`} className="block text-accent-soft font-semibold">{t("profile.yourListings")}</a>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <a
              href={`/${locale}/explore`}
              className="bg-primary hover:bg-primary-hover text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition"
            >
              {t("createListing.viewMarketplace")}
            </a>
            <button
              onClick={() => {
                setStep("form");
                setTitle("");
                setPrice("");
                setDescription("");
                setBrand("");
                setModel("");
                setImageUrl("");
                setSavedProduct(null);
              }}
              className="bg-elevated hover:bg-line text-secondary font-semibold text-sm px-6 py-2.5 rounded-xl transition"
            >
              {t("createListing.listAnother")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateListing} aria-busy={!clientReady || step === 'saving'}>
          <fieldset disabled={!clientReady} className="listing-layout">
          {error && <p role="alert" className="lg:col-span-2 bg-danger/10 border border-danger/25 text-danger p-4 rounded-xl">{error}</p>}
          <div className="glass-panel p-6 sm:p-8 space-y-6">
            <h2 className="text-base font-bold text-ink border-b border-line pb-3">
              {t("createListing.sectionTitle")}
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="listing-title" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.productTitle")}</label>
                <input
                  id="listing-title"
                  type="text"
                  required
                  placeholder={t("createListing.productTitlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:border-accent/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="listing-category" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.category")}</label>
                  <select
                    id="listing-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:border-accent/30"
                  >
                    {categoryKeys.map((c) => (
                      <option key={c} value={c}>{t(`categories.${c}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="listing-condition" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.conditionLabel")}</label>
                  <select
                    id="listing-condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:border-accent/30"
                  >
                    {conditionKeys.map((c) => (
                      <option key={c} value={c}>{t(`conditions.${c}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="listing-brand" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.brand")}</label>
                  <input
                    id="listing-brand"
                    type="text"
                    placeholder={t("createListing.brandPlaceholder")}
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:border-accent/30"
                  />
                </div>

                <div>
                  <label htmlFor="listing-model" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.modelSerial")}</label>
                  <input
                    id="listing-model"
                    type="text"
                    placeholder={t("createListing.modelPlaceholder")}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:border-accent/30"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="listing-description" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.description")}</label>
                <textarea
                  id="listing-description"
                  required
                  rows={4}
                  placeholder={t("createListing.descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:border-accent/30"
                />
              </div>

              <div>
                <label htmlFor="listing-price" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.listingPrice")}</label>
                <div className="relative">
                  <input
                    id="listing-price"
                    type="number"
                    step="any"
                    min="0.000000000000000001"
                    required
                    placeholder="0.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:border-accent/30 pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-muted">ETH</span>
                </div>
              </div>
              <div>
                <label htmlFor="listing-image" className="block text-xs font-semibold text-secondary mb-1">{t("createListing.imageUrl")}</label>
                <input id="listing-image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-inset border border-line rounded-lg p-2.5 text-sm" />
              </div>
            </div>
          </div>

          <aside className="listing-aside">
          <div className="glass-panel overflow-hidden p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><ImagePlus size={17} className="text-accent-soft" />{locale === 'vi' ? 'Xem trước sản phẩm' : 'Listing preview'}</h2>
            <div className="aspect-square overflow-hidden rounded-xl border border-line bg-inset">{imageUrl ? <img key={imageUrl} src={imageUrl} alt={title || t('createListing.productTitle')} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /> : <div className="product-placeholder"><Package size={50} strokeWidth={1} /></div>}</div>
            <p className="mt-4 text-xs text-accent-soft">{t(`categories.${category}`)} · {t(`conditions.${condition}`)}</p>
            <p className="mt-2 break-words text-lg font-semibold">{title || t('createListing.productTitle')}</p>
            <p className="mt-3 break-all text-2xl font-bold">{price || '—'} <span className="text-sm font-normal text-muted">ETH</span></p>
            <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">{locale === 'vi' ? 'Bản xem trước từ thông tin bạn đang nhập. Sản phẩm chỉ được đăng sau khi lưu thành công.' : 'A preview of your current details. Your product is published only after saving successfully.'}</p>
          </div>
          <div className="bg-warning/10 border border-warning/25 rounded-xl p-5 text-xs leading-6 text-warning space-y-1">
            <p className="font-semibold">{t("createListing.privacyTitle")}</p>
            <p>{t("createListing.privacyDesc")}</p>
          </div>

          <button
            type="submit"
            disabled={step !== "form"}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 rounded-xl transition text-sm disabled:opacity-50"
          >
            {step === "saving" && t("profile.saving")}
            {step === "form" && t("createListing.submitButton")}
          </button>
          </aside>
          </fieldset>
        </form>
      )}
    </div>
  );
}
