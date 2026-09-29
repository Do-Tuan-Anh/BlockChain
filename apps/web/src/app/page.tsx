import React from "react";
import { ProductCard } from "../components/ProductCard";
import { EscrowTimeline } from "../components/EscrowTimeline";

export default function HomePage() {
  const featuredProducts = [
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-200">
            <span>🛡️ Trust-Minimized P2P Commerce</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Physical E-Commerce Protected by Smart-Contract Escrow.
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Every product is backed by an on-chain NFT certificate. Payments remain locked in escrow until the buyer confirms physical receipt. Zero fraud, zero chargebacks, zero on-chain personal data.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="/explore"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-lg transition"
            >
              Browse Catalog
            </a>
            <a
              href="/create-listing"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm px-6 py-3 rounded-lg transition"
            >
              Start Selling
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Trust & Escrow Architecture Visualizer */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">How VeriMarket Protects Both Sides</h2>
            <p className="text-xs text-gray-500">Live demonstration of our 4-stage smart contract settlement lifecycle.</p>
          </div>
          <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
            Active Contract: Escrow.sol (0.8.28)
          </span>
        </div>
        <EscrowTimeline currentStatus="SHIPPED" />
      </section>

      {/* Featured Products Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Featured NFT-Backed Listings</h2>
            <p className="text-sm text-gray-500">Verified physical items with decentralized IPFS metadata.</p>
          </div>
          <a href="/explore" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            View All Listings →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((prod) => (
            <ProductCard key={prod.id} {...prod} />
          ))}
        </div>
      </section>

      {/* Architectural Principles Callout */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-3">
            🔒
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Smart Contract Escrow</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Buyer funds are held autonomously in the <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">Escrow.sol</code> contract until delivery confirmation. Sellers cannot run with funds; buyers cannot falsely claim non-receipt.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg mb-3">
            📜
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Verifiable NFT Passport</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Each item carries an immutable ERC-721 token on Ethereum. When delivery completes, token ownership automatically transfers to the buyer as permanent proof of authenticity.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg mb-3">
            🛡️
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Zero On-Chain PII</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Personal data—names, home delivery addresses, and private tracking codes—remain strictly off-chain in PostgreSQL. The public blockchain only handles financial settlement.
          </p>
        </div>
      </section>
    </div>
  );
}

