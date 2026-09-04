"use client";

import { useState } from "react";
import { BaridiMobModal } from "@/components/BaridiMobModal";

export default function StudioPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState("3,900");

  const handleOpenPayment = (amount: string) => {
    setSelectedAmount(amount);
    setShowPaymentModal(true);
  };

  return (
    <div>
      {/* Example button that opens the popup */}
      <button
        onClick={() => handleOpenPayment("3,900")}
        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl"
      >
        شحن الرصيد (3,900 دج)
      </button>

      {/* The Popup Component */}
      <BaridiMobModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        selectedPackAmount={selectedAmount}
      />
    </div>
  );
}