"use client";

import React, { useState } from "react";

export default function AdminConsolePage() {
  const [disputes, setDisputes] = useState([
    {
      orderId: "7",
      buyer: "0x3C44...93BC",
      seller: "0x7099...79C8",
      productTitle: "Rolex Submariner Date 126610LN",
      amount: "4.50 ETH",
      reason: "Item arrived with cosmetic scratch on bezel not disclosed in NFT metadata.",
      evidenceUris: ["ipfs://QmScratchedBezelPhotoEvidence"],
      status: "OPEN"
    }
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  const handleResolve = (orderId: string, refundToBuyer: boolean) => {
    setDisputes((prev) => prev.filter((d) => d.orderId !== orderId));
    setNotification(
      `Dispute for Order #${orderId} resolved on-chain! ${
        refundToBuyer ? "Refunded 100% to Buyer." : "Released payment to Seller."
      }`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Administrator Console</h1>
        <p className="text-sm text-gray-500 mt-1">
          Marketplace operations, protocol fee treasury, and dispute arbitration center.
        </p>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-4 rounded-xl shadow-xs">
          ✓ {notification}
        </div>
      )}

      {/* Protocol Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <span className="text-xs text-gray-400 block uppercase font-medium">Total Escrow Volume</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">142.80 ETH</span>
          <span className="text-xs text-emerald-600 font-medium">▲ +12% this week</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <span className="text-xs text-gray-400 block uppercase font-medium">Funds Currently in Escrow</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">18.45 ETH</span>
          <span className="text-xs text-gray-500 font-medium">24 active shipments</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <span className="text-xs text-gray-400 block uppercase font-medium">Protocol Treasury (2.5% Take)</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">3.57 ETH</span>
          <span className="text-xs text-gray-500 font-medium">FeeManager.sol</span>
        </div>
      </div>

      {/* Contested Orders (Disputes) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Active Order Disputes Requiring Arbitration</h2>
          <p className="text-xs text-gray-500">
            Escrow funds are frozen. Review evidence and execute on-chain resolution via <code className="bg-gray-100 px-1 py-0.5 rounded">resolveDispute(orderId, refundToBuyer)</code>.
          </p>
        </div>

        {disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map((d) => (
              <div
                key={d.orderId}
                className="border border-amber-200 bg-amber-50/50 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Dispute on Order #{d.orderId} — {d.productTitle}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Locked Amount: <strong className="text-gray-900">{d.amount}</strong> • Buyer:{" "}
                      <span className="font-mono">{d.buyer}</span> • Seller:{" "}
                      <span className="font-mono">{d.seller}</span>
                    </p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto">
                    Awaiting Admin Ruling
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-gray-700">Buyer Complaint:</span>
                    <p className="text-gray-600 mt-0.5 bg-white p-2.5 rounded-lg border border-amber-100">
                      "{d.reason}"
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700">Submitted Evidence:</span>
                    <a
                      href="#"
                      className="block text-blue-600 hover:underline mt-0.5 font-mono"
                    >
                      {d.evidenceUris[0]}
                    </a>
                  </div>
                </div>

                {/* Arbitration Actions */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleResolve(d.orderId, true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs"
                  >
                    Rule for Buyer (Refund 100% ETH)
                  </button>
                  <button
                    onClick={() => handleResolve(d.orderId, false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs"
                  >
                    Rule for Seller (Release Payment & Transfer NFT)
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-sm">No open disputes. All escrows are proceeding nominally.</p>
          </div>
        )}
      </div>
    </div>
  );
}

