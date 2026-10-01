"use client";

import React, { useState } from "react";
import { useTranslation } from "../../../contexts/LanguageContext";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<"idle" | "wallet" | "confirming" | "success">("idle");
  const [txHash, setTxHash] = useState("");

  const product = {
    id: params.id || "prod-001",
    title: "Nike Air Max 1 '86 OG Big Bubble",
    description:
      "Original 1986 specification release featuring the iconic enlarged Air unit. Kept in a climate-controlled collector environment. Complete with original factory laces, box, and verifiable decentralized digital product passport.",
    category: "Footwear / Sneakers",
    condition: "New in Box",
    brand: "Nike",
    model: "Air Max 1 '86 OG",
    price: "0.50",
    currency: "ETH",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80",
    seller: {
      username: "alice_collector",
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      rating: "5.0",
      reviewCount: 42,
      successfulSales: 38,
      memberSince: "Jan 2025"
    },
    nft: {
      tokenId: "1",
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      metadataUri: "ipfs://QmMetadataCid123456789/product.json",
      productHash: "0xe4e6ab734223a3b4811eeebb233a52f21c9fff0fcca3bf01d1be8df429e85b79",
      standard: "ERC-721",
      network: "EVM Local / Sepolia"
    },
    escrowTerms: {
      inspectionWindow: "3 days after delivery",
      takeRate: "2.5% protocol fee",
      refundPolicy: "100% money-back guarantee if counterfeit or lost"
    }
  };

  const handleBuyNow = () => {
    setIsPurchasing(true);
    setPurchaseStep("wallet");

    setTimeout(() => {
      setPurchaseStep("confirming");
      setTimeout(() => {
        setTxHash("0x8b32f91a629b3c4d5e8f00129487cbe501239aa84716298bb3628192a01948fc");
        setPurchaseStep("success");
      }, 1500);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Image Showcase */}
        <div className="space-y-4">
          <div className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-xs relative">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-xs">
              {t("product.verified")} #{product.nft.tokenId}
            </div>
          </div>
        </div>

        {/* Right Column: Details & Escrow Purchase */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
              <span>{product.category}</span>
              <span>•</span>
              <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                {product.condition}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">{product.title}</h1>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{product.description}</p>
          </div>

          {/* Pricing & Escrow Action Box */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-400 block font-medium uppercase">{t("product.price")}</span>
                <span className="text-3xl font-black text-gray-900">
                  {product.price}{" "}
                  <span className="text-lg font-medium text-gray-600">{product.currency}</span>
                </span>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
                {t("product.escrowProtected")}
              </span>
            </div>

            <div className="text-xs text-gray-500 space-y-1.5">
              <p className="flex items-center">
                <span className="text-emerald-600 mr-2">✔</span>{t("product.escrowNote1")}
              </p>
              <p className="flex items-center">
                <span className="text-emerald-600 mr-2">✔</span>{t("product.escrowNote2")}
              </p>
              <p className="flex items-center">
                <span className="text-emerald-600 mr-2">✔</span>{t("product.escrowNote3")} {product.escrowTerms.inspectionWindow}.
              </p>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition shadow-xs text-sm"
            >
              {t("product.buyNowEscrow")}
            </button>
          </div>

          {/* Seller Reputation Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                {product.seller.username[0].toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{product.seller.username}</h4>
                <p className="text-xs text-gray-500">
                  ★ <strong className="text-amber-600">{product.seller.rating}</strong> ({product.seller.reviewCount} {t("product.reviews")}) • {product.seller.successfulSales} {t("product.completedSales")}
                </p>
              </div>
            </div>
            <a
              href={`/seller/${product.seller.walletAddress}`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {t("product.viewProfile")}
            </a>
          </div>

          {/* Blockchain & NFT Verification Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">{t("product.verificationDetails")}</h3>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>{t("product.contractAddress")}</span>
                <span className="font-mono text-gray-800 truncate max-w-[150px]">{product.nft.contractAddress}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("product.tokenId")}</span>
                <span className="font-mono text-gray-800">{product.nft.tokenId}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("product.tokenStandard")}</span>
                <span>{product.nft.standard}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("product.network")}</span>
                <span>{product.nft.network}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
