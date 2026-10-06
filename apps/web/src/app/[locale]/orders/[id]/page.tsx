"use client";

import { useParams } from "next/navigation";

import React, { useState } from "react";
import { EscrowTimeline, EscrowMilestone } from "../../../../components/EscrowTimeline";
import { useTranslation } from "../../../../contexts/LanguageContext";

export default function OrderDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const { t, locale } = useTranslation();
  const [orderStatus, setOrderStatus] = useState<EscrowMilestone>("SHIPPED");
  const [isConfirming, setIsConfirming] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const order = {
    id: params.id || "1",
    product: {
      title: "Nike Air Max 1 '86 OG Big Bubble",
      price: "0.50",
      currency: "ETH",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
      nftTokenId: "1",
    },
    buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    createdAt: "2026-09-22T14:30:00Z",
    escrow: {
      contractAddress: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      lockedAmount: "0.50 ETH",
      netSellerProceeds: "0.4875 ETH",
      protocolFee: "0.0125 ETH (2.5%)"
    },
    shipment: {
      carrier: "FedEx Express",
      trackingNumber: "FX-99281-7729-US",
      shippedAt: "2026-09-22T16:00:00Z",
      status: "In Transit - Out for Delivery"
    }
  };

  const handleConfirmDelivery = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setOrderStatus("COMPLETED");
      setIsConfirming(false);
      setShowReviewModal(true);
    }, 1500);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
    setTimeout(() => {
      setShowReviewModal(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">{t("orders.title")}{order.id}</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
              Escrow {orderStatus}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t("orders.placedOn")} {new Date(order.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
              timeZone: "Asia/Ho_Chi_Minh",
              day: "numeric",
              month: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <a
          href={`/${locale}/explore`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("orders.returnToMarket")}
        </a>
      </div>

      {/* Visual Stepper */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-gray-900 mb-2">{t("orders.escrowProgress")}</h2>
        <EscrowTimeline currentStatus={orderStatus} />
      </div>

      {/* Grid: Order Summary & Physical Logistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product & Payment Summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            {t("orders.itemDetails")}
          </h2>
          <div className="flex space-x-4">
            <img
              src={order.product.imageUrl}
              alt={order.product.title}
              className="w-20 h-20 rounded-xl object-cover border border-gray-100"
            />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900">{order.product.title}</h3>
              <p className="text-xs text-blue-600 font-medium">{t("orders.nftCertificate")}{order.product.nftTokenId}</p>
              <p className="text-base font-bold text-gray-900">
                {order.product.price} {order.product.currency}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>{t("orders.totalPayment")}</span>
              <strong className="text-gray-900">{order.escrow.lockedAmount}</strong>
            </div>
            <div className="flex justify-between">
              <span>{t("orders.sellerProceeds")}</span>
              <span>{order.escrow.netSellerProceeds}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("orders.marketplaceFee")}</span>
              <span>{order.escrow.protocolFee}</span>
            </div>
          </div>
        </div>

        {/* Physical Shipping Information (Off-chain) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            {t("orders.shipmentTracking")}
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gray-400 block font-medium uppercase">{t("orders.logisticsCarrier")}</span>
              <span className="text-sm font-semibold text-gray-900">{order.shipment.carrier}</span>
            </div>

            <div>
              <span className="text-gray-400 block font-medium uppercase">{t("orders.carrierTrackingId")}</span>
              <span className="text-sm font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
                {order.shipment.trackingNumber}
              </span>
            </div>

            <div>
              <span className="text-gray-400 block font-medium uppercase">{t("orders.deliveryStatus")}</span>
              <span className="text-sm font-medium text-emerald-700">
                ● {order.shipment.status}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 bg-gray-50 p-2.5 rounded-lg">
            ℹ️ {t("orders.privacyNote")}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            {orderStatus === "COMPLETED" ? t("orders.fullySettled") : t("orders.haveYouReceived")}
          </h3>
          <p className="text-xs text-gray-500">
            {orderStatus === "COMPLETED"
              ? t("orders.settledDesc")
              : t("orders.pendingDesc")}
          </p>
        </div>

        {orderStatus !== "COMPLETED" ? (
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              onClick={() => alert(t("orders.disputeAlert"))}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition"
            >
              {t("orders.reportIssue")}
            </button>
            <button
              onClick={handleConfirmDelivery}
              disabled={isConfirming}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs disabled:opacity-50"
            >
              {isConfirming ? t("orders.confirming") : t("orders.confirmDelivery")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowReviewModal(true)}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
          >
            {t("orders.leaveReview")}
          </button>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">{t("orders.reviewSeller")}</h3>
            <p className="text-xs text-gray-500">
              {t("orders.reviewNote")}
            </p>

            {reviewSubmitted ? (
              <div className="text-center py-6 text-emerald-600 font-semibold text-sm">
                {t("orders.reviewSuccess")}
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("orders.rating")}</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-2xl ${star <= reviewRating ? "text-amber-500" : "text-gray-300"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("orders.feedback")}</label>
                  <textarea
                    required
                    rows={3}
                    placeholder={t("orders.feedbackPlaceholder")}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="text-xs text-gray-500 px-3 py-2"
                  >
                    {t("orders.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    {t("orders.submitReview")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
