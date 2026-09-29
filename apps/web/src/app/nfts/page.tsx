"use client";

import React from "react";

export default function UserNFTVaultPage() {
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
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Your Physical NFT Certificates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cryptographic digital product passports transferred to your wallet upon physical delivery confirmation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ownedNFTs.map((item) => (
          <div
            key={item.tokenId}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs space-y-4"
          >
            <div className="aspect-square bg-gray-100 overflow-hidden relative">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                NFT #{item.tokenId}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs text-gray-400 block font-medium uppercase">{item.category}</span>
                <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Delivered on {item.acquiredDate} via Order #{item.orderId}
                </p>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {item.attributes.map((a) => (
                  <div key={a.trait} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">{a.trait}</span>
                    <strong className="text-gray-900">{a.value}</strong>
                  </div>
                ))}
              </div>

              {/* On-Chain Specs */}
              <div className="pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Contract:</span>
                  <span className="font-mono text-gray-800 truncate max-w-[150px]">{item.contractAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span>Product Hash:</span>
                  <span className="font-mono text-gray-800 truncate max-w-[150px]">{item.productHash}</span>
                </div>
              </div>

              <a
                href={`/orders/${item.orderId}`}
                className="block text-center w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-2.5 rounded-xl transition"
              >
                View Order & Provenance →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

