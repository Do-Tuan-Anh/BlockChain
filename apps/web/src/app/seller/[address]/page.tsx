"use client";

import React from "react";
import { ProductCard } from "../../../components/ProductCard";

export default function SellerProfilePage({ params }: { params: { address: string } }) {
  const seller = {
    username: "alice_collector",
    walletAddress: params.address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    rating: "5.0",
    reviewCount: 42,
    successfulSales: 38,
    completionRate: "98.7%",
    avgDispatchTime: "< 24 Hours",
    bio: "Passionate vintage sneaker and streetwear archivist. All items are verified and shipped with tamper-evident packaging.",
    memberSince: "January 2025",
    isVerified: true
  };

  const sellerListings = [
    {
      id: "prod-001",
      title: "Nike Air Max 1 '86 OG Big Bubble",
      category: "Sneakers",
      condition: "New in Box",
      price: "0.50",
      currency: "ETH",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
      sellerUsername: seller.username,
      sellerRating: seller.rating,
      nftTokenId: "1",
    }
  ];

  const recentReviews = [
    {
      id: "rev-1",
      buyer: "0x3C44...93BC",
      rating: 5,
      date: "2 days ago",
      comment: "Sneakers arrived in pristine condition, exactly as described in the NFT metadata. Immediate dispatch!"
    },
    {
      id: "rev-2",
      buyer: "0x15d3...6A65",
      rating: 5,
      date: "1 week ago",
      comment: "Very communicative seller. Escrow release was smooth and delivery was tracked with FedEx."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Seller Header Profile Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-sm">
              {seller.username[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">{seller.username}</h1>
                {seller.isVerified && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    ✓ Verified Seller
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-gray-400 mt-0.5">{seller.walletAddress}</p>
              <p className="text-xs text-gray-500 mt-2 max-w-xl">{seller.bio}</p>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-3 gap-4 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6 text-center w-full sm:w-auto">
            <div>
              <span className="text-xs text-gray-400 block uppercase font-medium">Rating</span>
              <span className="text-lg font-bold text-amber-600">★ {seller.rating}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block uppercase font-medium">Success Rate</span>
              <span className="text-lg font-bold text-emerald-600">{seller.completionRate}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block uppercase font-medium">Sales</span>
              <span className="text-lg font-bold text-gray-900">{seller.successfulSales}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Listings */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Active Listings from {seller.username}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sellerListings.map((prod) => (
            <ProductCard key={prod.id} {...prod} />
          ))}
        </div>
      </div>

      {/* Transaction-Verified Reviews */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Verified Customer Reviews ({seller.reviewCount})</h2>
          <p className="text-xs text-gray-500">Only buyers who completed physical delivery and escrow settlement can review.</p>
        </div>

        <div className="divide-y divide-gray-100">
          {recentReviews.map((rev) => (
            <div key={rev.id} className="py-4 space-y-1.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-gray-600 font-semibold">{rev.buyer}</span>
                <span className="text-gray-400">{rev.date}</span>
              </div>
              <div className="text-amber-500 text-sm">
                {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

