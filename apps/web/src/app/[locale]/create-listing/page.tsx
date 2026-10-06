"use client";

import React, { useState } from "react";
import { useTranslation } from "../../../contexts/LanguageContext";
import { Product } from "@/lib/products";

export default function CreateListingPage() {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">{t("createListing.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("createListing.subtitle")}</p>
      </div>

      {step === "completed" ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t("createListing.successTitle")}</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            {t("createListing.successDesc")} <strong>{savedProduct?.title}</strong> — <strong>{savedProduct?.price} {savedProduct?.currency}</strong>.
          </p>
          <p className="text-sm text-gray-600">{savedProduct?.description}</p>
          <a href={`/${locale}/product/${savedProduct?.id}`} className="block text-blue-600 font-semibold">{t("createListing.viewProduct")}</a>
          <a href={`/${locale}/profile`} className="block text-blue-600 font-semibold">{t("profile.yourListings")}</a>
          <div className="pt-4 flex justify-center space-x-4">
            <a
              href={`/${locale}/explore`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition"
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
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm px-6 py-2.5 rounded-xl transition"
            >
              {t("createListing.listAnother")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateListing} className="space-y-6">
          {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</p>}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              {t("createListing.sectionTitle")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.productTitle")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("createListing.productTitlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.category")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {categoryKeys.map((c) => (
                      <option key={c} value={c}>{t(`categories.${c}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.conditionLabel")}</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {conditionKeys.map((c) => (
                      <option key={c} value={c}>{t(`conditions.${c}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.brand")}</label>
                  <input
                    type="text"
                    placeholder={t("createListing.brandPlaceholder")}
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.modelSerial")}</label>
                  <input
                    type="text"
                    placeholder={t("createListing.modelPlaceholder")}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.description")}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t("createListing.descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.listingPrice")}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.000000000000000001"
                    required
                    placeholder="0.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-gray-500">ETH</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t("createListing.imageUrl")}</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">{t("createListing.privacyTitle")}</p>
            <p>{t("createListing.privacyDesc")}</p>
          </div>

          <button
            type="submit"
            disabled={step !== "form"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition text-sm disabled:opacity-50"
          >
            {step === "saving" && t("profile.saving")}
            {step === "form" && t("createListing.submitButton")}
          </button>
        </form>
      )}
    </div>
  );
}
