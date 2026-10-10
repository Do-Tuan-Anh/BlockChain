"use client";

import React, { useState } from "react";
import { ArrowUpRight, Package } from 'lucide-react';
import { useTranslation } from "../contexts/LanguageContext";

export interface ProductCardProps {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: string;
  currency: string;
  imageUrl: string;
  sellerUsername: string;
  sellerId?: string;
  sellerRating?: string;
  nftTokenId?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  category,
  condition,
  price,
  currency,
  imageUrl,
  sellerUsername,
  sellerId,
  sellerRating,
  nftTokenId,
}) => {
  const { t, locale } = useTranslation();
  const [failedImage, setFailedImage] = useState<string | null>(null);

  return (
    <div className="product-card">
      <div className="product-media group">
        {imageUrl && failedImage !== imageUrl ? <img
          src={imageUrl}
          alt={title}
          className="object-cover w-full h-full"
          onError={() => setFailedImage(imageUrl)}
        /> : <div className="product-placeholder" aria-label={title}><Package size={48} strokeWidth={1} /></div>}
        {nftTokenId && (
          <div className="absolute top-3 right-3 bg-surface/90 backdrop-blur-sm border border-accent/30 text-accent-soft text-xs font-semibold px-2.5 py-1 rounded-full flex items-center shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
            NFT #{nftTokenId}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted mb-3">
            <span>{t(`categories.${category}`) !== `categories.${category}` ? t(`categories.${category}`) : category}</span>
            <span className="bg-elevated px-2 py-0.5 rounded text-secondary font-medium">
              {t(`conditions.${condition}`) !== `conditions.${condition}` ? t(`conditions.${condition}`) : condition}
            </span>
          </div>
          <h3 className="font-semibold text-ink line-clamp-2 text-base leading-6" title={title}>{title}</h3>
          
          <div className="flex items-center text-xs text-secondary mt-2">
            <span>{t("product.by")} {sellerId ? <a href={`/${locale}/seller/${encodeURIComponent(sellerId)}`} className="font-semibold text-accent-soft hover:underline">{sellerUsername}</a> : <strong className="text-ink">{sellerUsername}</strong>}</span>
            {sellerRating && <span className="text-warning font-medium ml-2">★ {sellerRating}</span>}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs text-muted block">{t("product.price")}</span>
            <span className="break-all text-xl font-bold tracking-tight text-ink">
              {price} <span className="text-sm font-medium text-secondary">{currency}</span>
            </span>
          </div>
          <a
            href={`/${locale}/product/${encodeURIComponent(id)}`}
            className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-elevated px-3 py-3 text-xs font-semibold text-ink transition hover:border-accent/50 hover:text-accent-soft"
          >
            {t("createListing.viewProduct")}<ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
};
