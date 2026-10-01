"use client";

import React from "react";
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
  sellerRating: string;
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
  sellerRating,
  nftTokenId,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col">
      <div className="relative aspect-square w-full bg-gray-50 overflow-hidden group">
        <img
          src={imageUrl}
          alt={title}
          className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80";
          }}
        />
        {nftTokenId && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></span>
            NFT #{nftTokenId}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{t(`categories.${category}`) !== `categories.${category}` ? t(`categories.${category}`) : category}</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">
              {t(`conditions.${condition}`) !== `conditions.${condition}` ? t(`conditions.${condition}`) : condition}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 line-clamp-1 text-base">{title}</h3>
          
          <div className="flex items-center text-xs text-gray-600 mt-2">
            <span>{t("product.by")} <strong className="text-gray-900">{sellerUsername}</strong></span>
            <span className="mx-1.5">•</span>
            <span className="text-amber-600 font-medium">★ {sellerRating}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 block">{t("product.price")}</span>
            <span className="text-lg font-bold text-gray-900">
              {price} <span className="text-sm font-medium text-gray-600">{currency}</span>
            </span>
          </div>
          <a
            href={`/product/${id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {t("product.buyNow")}
          </a>
        </div>
      </div>
    </div>
  );
};
