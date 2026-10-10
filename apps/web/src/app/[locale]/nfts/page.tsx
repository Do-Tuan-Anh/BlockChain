"use client";

import React from "react";
import { Layers3 } from 'lucide-react';
import { useTranslation } from "../../../contexts/LanguageContext";

export default function UserNFTVaultPage() {
  const { t, locale } = useTranslation();

  const ownedNFTs = [
    {
      tokenId: "1",
      title: "Nike Air Max 1 '86 OG Big Bubble",
      category: "Footwear / Sneakers",
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      metadataUri: "ipfs://QmMetadataCid123456789/product.json",
      productHash: "0xe4e6ab734223a3b4811eeebb233a52f21c9fff0fcca3bf01d1be8df429e85b79",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
      acquiredDate: "2026-09-22",
      orderId: "1",
      seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      attributes: [
        { trait: "Brand", value: "Nike" },
        { trait: "Condition", value: "New in Box" },
        { trait: "Size", value: "US 10 / EU 44" },
        { trait: "Colorway", value: "Sport Red / White" }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="page-heading">
        <p className="eyebrow"><Layers3 size={15} />DIGITAL PASSPORTS</p>
        <h1 className="text-3xl font-extrabold text-ink">{t("nfts.title")}</h1>
        <p className="text-sm text-muted mt-1">{t("nfts.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ownedNFTs.map((item) => (
          <div
            key={item.tokenId}
            className="product-card space-y-4"
          >
            <div className="product-media">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 right-3 bg-surface/90 backdrop-blur-xs border border-accent/30 text-accent-soft text-xs font-semibold px-2.5 py-1 rounded-full">
                NFT #{item.tokenId}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs text-muted block font-medium uppercase">{item.category}</span>
                <h3 className="text-base font-bold text-ink">{item.title}</h3>
                <p className="text-xs text-muted mt-0.5">
                  {t("nfts.deliveredOn")} {item.acquiredDate} {t("nfts.viaOrder")} #{item.orderId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {item.attributes.map((a) => (
                  <div key={a.trait} className="bg-inset p-2 rounded-lg border border-line">
                    <span className="text-muted block text-[10px] uppercase font-semibold">{a.trait}</span>
                    <strong className="text-ink">{a.value}</strong>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-line space-y-1 text-xs text-muted">
                <div className="flex justify-between">
                  <span>{t("nfts.contract")}</span>
                  <span className="font-mono text-ink truncate max-w-[150px]">{item.contractAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("nfts.productHash")}</span>
                  <span className="font-mono text-ink truncate max-w-[150px]">{item.productHash}</span>
                </div>
              </div>

              <a
                href={`/${locale}/orders/${item.orderId}`}
                className="block text-center w-full bg-elevated hover:bg-line text-ink text-xs font-semibold py-2.5 rounded-xl transition"
              >
                {t("nfts.viewOrder")}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
