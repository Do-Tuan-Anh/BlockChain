"use client";

import React, { useState } from "react";
import { Scale } from 'lucide-react';
import { useTranslation } from "../../../contexts/LanguageContext";

export default function AdminConsolePage() {
  const { t } = useTranslation();
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
      `${t("common.dispute")} #${orderId} ${t("admin.resolved")} ${
        refundToBuyer ? t("admin.refunded") : t("admin.released")
      }`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="page-heading">
        <p className="eyebrow"><Scale size={15} />ARBITRATION CONSOLE</p>
        <h1 className="text-3xl font-extrabold text-ink">{t("admin.title")}</h1>
        <p className="text-sm text-muted mt-1">{t("admin.subtitle")}</p>
      </div>

      {notification && (
        <div role="status" className="bg-positive/10 border border-positive/25 text-positive text-xs font-semibold p-4 rounded-xl shadow-xs">
          ✓ {notification}
        </div>
      )}

      {/* Protocol Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-xs">
          <span className="text-xs text-muted block uppercase font-medium">{t("admin.totalVolume")}</span>
          <span className="text-2xl font-black text-ink mt-1 block">142.80 ETH</span>
          <span className="text-xs text-positive font-medium">▲ +12% {t("admin.thisWeek")}</span>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-xs">
          <span className="text-xs text-muted block uppercase font-medium">{t("admin.currentEscrow")}</span>
          <span className="text-2xl font-black text-accent-soft mt-1 block">18.45 ETH</span>
          <span className="text-xs text-muted font-medium">24 {t("admin.activeShipments")}</span>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-xs">
          <span className="text-xs text-muted block uppercase font-medium">{t("admin.protocolTreasury")}</span>
          <span className="text-2xl font-black text-positive mt-1 block">3.57 ETH</span>
          <span className="text-xs text-muted font-medium">FeeManager.sol</span>
        </div>
      </div>

      {/* Contested Orders (Disputes) */}
      <div className="bg-surface border border-line rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-ink">{t("admin.disputesTitle")}</h2>
          <p className="text-xs text-muted">{t("admin.disputesDesc")}</p>
        </div>

        {disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map((d) => (
              <div
                key={d.orderId}
                className="border border-warning/25 bg-warning/10 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warning/25 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-ink">
                      {t("common.dispute")} #{d.orderId} — {d.productTitle}
                    </h3>
                    <p className="text-xs text-muted">
                      {t("admin.lockedAmount")} <strong className="text-ink">{d.amount}</strong> • {t("admin.buyer")}{" "}
                      <span className="font-mono">{d.buyer}</span> • {t("admin.seller")}{" "}
                      <span className="font-mono">{d.seller}</span>
                    </p>
                  </div>
                  <span className="text-xs bg-warning/10 text-warning font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto">
                    {t("admin.awaitingRuling")}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-secondary">{t("admin.buyerComplaint")}</span>
                    <p className="text-secondary mt-0.5 bg-surface p-2.5 rounded-lg border border-warning/25">
                      "{d.reason}"
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-secondary">{t("admin.evidence")}</span>
                    <a
                      href="#"
                      className="block text-accent-soft hover:underline mt-0.5 font-mono"
                    >
                      {d.evidenceUris[0]}
                    </a>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleResolve(d.orderId, true)}
                    className="bg-emerald-700 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs"
                  >
                    {t("admin.ruleForBuyer")}
                  </button>
                  <button
                    onClick={() => handleResolve(d.orderId, false)}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs"
                  >
                    {t("admin.ruleForSeller")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-inset rounded-xl border border-line">
            <p className="text-muted text-sm">{t("admin.noDisputes")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
