"use client";

import React, { useState } from "react";
import { ProductCard } from "../../components/ProductCard";

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");

  const categories = ["All", "Sneakers", "Electronics", "Watches", "Gaming", "Collectibles"];
  const conditions = ["All", "New in Box", "Like New", "Good", "Pristine"];

  const allProducts = [
    {
      id: "prod-001",
      title: "Nike Air Max 1 '86 OG Big Bubble",
      category: "Sneakers",
      condition: "New in Box",
      price: "0.50",
      currency: "ETH",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
      sellerUsername: "alice_collector",
      sellerRating: "5.0",
      nftTokenId: "1",
    },
    {
      id: "prod-002",
      title: "Apple MacBook Pro 16\" M3 Max (36GB / 1TB)",
      category: "Electronics",
      condition: "Like New",
      price: "1.25",
      currency: "ETH",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
      sellerUsername: "tech_vault",
      sellerRating: "4.9",
      nftTokenId: "2",
    },
    {
      id: "prod-003",
      title: "Omega Speedmaster Professional Moonwatch",
      category: "Watches",
      condition: "Pristine",
      price: "2.80",
      currency: "ETH",
      imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80",
      sellerUsername: "horology_prime",
      sellerRating: "5.0",
      nftTokenId: "3",
    },
    {
      id: "prod-004",
      title: "Sony PlayStation 5 Disc Edition + 2 Controllers",
      category: "Gaming",
      condition: "Good",
      price: "0.22",
      currency: "ETH",
      imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80",
      sellerUsername: "gamer_exchange",
      sellerRating: "4.8",
      nftTokenId: "4",
    },
  ];

  const filtered = allProducts.filter((p) => {
    const matchCat = selectedCategory === "All" || p.category === selectedCategory;
    const matchCond = selectedCondition === "All" || p.condition === selectedCondition;
    return matchCat && matchCond;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Explore Marketplace</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse authentic physical products secured by blockchain escrow.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
        {/* Categories */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Condition Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Condition:</span>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {conditions.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((prod) => (
            <ProductCard key={prod.id} {...prod} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">No products found matching the selected filters.</p>
        </div>
      )}
    </div>
  );
}

