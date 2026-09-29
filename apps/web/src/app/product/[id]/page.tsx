"use client";

import React, { useState } from "react";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
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

    // Simulate smart contract buyItem() invocation
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
              ✓ Verified Physical NFT #{product.nft.tokenId}
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
                <span className="text-xs text-gray-400 block font-medium uppercase">Price</span>
                <span className="text-3xl font-black text-gray-900">
                  {product.price}{" "}
                  <span className="text-lg font-medium text-gray-600">{product.currency}</span>
                </span>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
                🔒 Escrow Protected
              </span>
            </div>

            <div className="text-xs text-gray-500 space-y-1.5">
              <p className="flex items-center">
                <span className="text-emerald-600 mr-2">✔</span> Payment is held in smart contract until you inspect the parcel.
              </p>
              <p className="flex items-center">
                <span className="text-emerald-600 mr-2">✔</span> NFT certificate transfers automatically upon delivery confirmation.
              </p>
              <p className="flex items-center">
                <span className="text-emerald-600 mr-2">✔</span> Inspection Window: {product.escrowTerms.inspectionWindow}.
              </p>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition shadow-xs text-sm"
            >
              Buy Now with Escrow
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
                  ★ <strong className="text-amber-600">{product.seller.rating}</strong> ({product.seller.reviewCount} reviews) • {product.seller.successfulSales} completed sales
                </p>
              </div>
            </div>
            <a
              href={`/seller/${product.seller.walletAddress}`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View Profile →
            </a>
          </div>

          {/* Blockchain & NFT Verification Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Blockchain & NFT Certificate Specs
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-gray-500">Token ID:</span>
              <span className="font-mono text-gray-900">#{product.nft.tokenId}</span>

              <span className="text-gray-500">Contract:</span>
              <span className="font-mono text-gray-900 truncate">{product.nft.contractAddress}</span>

              <span className="text-gray-500">Metadata (IPFS):</span>
              <a
                href="https://ipfs.io"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 truncate hover:underline"
              >
                {product.nft.metadataUri}
              </a>

              <span className="text-gray-500">Product Hash:</span>
              <span className="font-mono text-gray-900 truncate">{product.nft.productHash}</span>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <a
                href={`/verify/${product.nft.tokenId}`}
                className="inline-flex items-center justify-center w-full gap-2 bg-white hover:bg-gray-100 text-blue-700 border border-blue-200 py-2 rounded-lg text-xs font-semibold transition"
              >
                <span>🔍 Scan QR / View Provenance History</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal Simulation */}
      {isPurchasing && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Smart Contract Escrow Checkout</h3>

            {purchaseStep === "wallet" && (
              <div className="text-center py-6 space-y-3">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-sm font-semibold text-gray-800">Waiting for Wallet Confirmation...</p>
                <p className="text-xs text-gray-500">Please approve the 0.50 ETH transaction in MetaMask.</p>
              </div>
            )}

            {purchaseStep === "confirming" && (
              <div className="text-center py-6 space-y-3">
                <div className="animate-pulse w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 text-lg font-bold">
                  ⛓
                </div>
                <p className="text-sm font-semibold text-gray-800">Locking Funds in Escrow Contract...</p>
                <p className="text-xs text-gray-500">Awaiting block confirmation on EVM network.</p>
              </div>
            )}

            {purchaseStep === "success" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">Payment Successfully Escrowed!</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Order #1 created. The seller has been notified to ship the item.
                  </p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg text-left text-xs font-mono text-gray-600 break-all">
                  Tx Hash: {txHash}
                </div>
                <a
                  href="/orders/1"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-sm text-center"
                >
                  Track Order in Dashboard →
                </a>
              </div>
            )}

            {purchaseStep !== "success" && (
              <button
                onClick={() => setIsPurchasing(false)}
                className="w-full text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

