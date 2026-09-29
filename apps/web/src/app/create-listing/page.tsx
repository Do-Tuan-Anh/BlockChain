"use client";

import React, { useState } from "react";

export default function CreateListingPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Sneakers");
  const [condition, setCondition] = useState("New in Box");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [step, setStep] = useState<"form" | "minting" | "listing" | "completed">("form");
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);

  const categories = ["Sneakers", "Electronics", "Watches", "Gaming", "Collectibles", "Fashion"];
  const conditions = ["New in Box", "Like New", "Good", "Fair", "Pristine"];

  const handleMintAndList = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("minting");

    // Simulate Step 1: Minting NFT on-chain
    setTimeout(() => {
      setMintedTokenId("5");
      setStep("listing");

      // Simulate Step 2: Creating Listing in Marketplace.sol
      setTimeout(() => {
        setStep("completed");
      }, 1500);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">List an Item for Sale</h1>
        <p className="text-sm text-gray-500 mt-1">
          Mint a verifiable on-chain NFT certificate for your physical product and list it on the escrow marketplace.
        </p>
      </div>

      {step === "completed" ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-gray-900">Product Successfully Listed!</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Your physical item is now represented by <strong>NFT #{mintedTokenId}</strong> and is live on the marketplace for <strong>{price} ETH</strong>.
          </p>
          <div className="pt-4 flex justify-center space-x-4">
            <a
              href="/explore"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition"
            >
              View in Marketplace
            </a>
            <button
              onClick={() => {
                setStep("form");
                setTitle("");
                setPrice("");
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm px-6 py-2.5 rounded-xl transition"
            >
              List Another Item
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleMintAndList} className="space-y-6">
          {/* Main Form Fields */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              1. Physical Product Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nike Air Max 1 '86 OG Big Bubble"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Condition *</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {conditions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Nike, Apple, Sony"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Model / Serial</label>
                  <input
                    type="text"
                    placeholder="e.g. Air Max 1, PS5"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide honest, detailed condition notes. Mention all accessories, packaging, and cosmetic details."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Listing Price (ETH) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-gray-500">ETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & IPFS Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">⚠️ Privacy Protection Policy:</p>
            <p>
              Your personal information (real name, home address, phone number) is never written to IPFS or the blockchain. Only non-sensitive product traits (Brand, Model, Condition, Product Hash) are stored in the public NFT metadata.
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={step !== "form"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition text-sm disabled:opacity-50"
          >
            {step === "minting" && "Step 1/2: Minting NFT Certificate on Blockchain..."}
            {step === "listing" && "Step 2/2: Approving & Listing on Marketplace.sol..."}
            {step === "form" && "Mint NFT & List on Marketplace"}
          </button>
        </form>
      )}
    </div>
  );
}

