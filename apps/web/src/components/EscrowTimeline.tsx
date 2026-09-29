import React from "react";

export type EscrowMilestone = "PAID" | "SHIPPED" | "DELIVERED" | "COMPLETED";

export interface EscrowTimelineProps {
  currentStatus: EscrowMilestone;
}

export const EscrowTimeline: React.FC<EscrowTimelineProps> = ({ currentStatus }) => {
  const steps = [
    { key: "PAID", label: "Payment Escrowed", desc: "Funds locked in smart contract" },
    { key: "SHIPPED", label: "Item Shipped", desc: "Carrier tracking active" },
    { key: "DELIVERED", label: "Delivery Confirmed", desc: "Physical parcel received" },
    { key: "COMPLETED", label: "Payment Released", desc: "NFT & funds settled" },
  ];

  const getStepIndex = (status: EscrowMilestone) => {
    switch (status) {
      case "PAID": return 0;
      case "SHIPPED": return 1;
      case "DELIVERED": return 2;
      case "COMPLETED": return 3;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
        
        {/* Active Progress Bar */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-200 border-2 ${
                  isCompleted
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                } ${isCurrent ? "ring-4 ring-blue-100" : ""}`}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <div className="mt-2 text-center">
                <p className={`text-xs font-semibold ${isCompleted ? "text-blue-900" : "text-gray-500"}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-400 hidden sm:block">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

