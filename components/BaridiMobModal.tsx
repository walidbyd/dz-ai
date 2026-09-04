"use client";

import { useState } from "react";
import { X, Copy, Check, ShieldCheck, Send } from "lucide-react";

interface BaridiMobModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackAmount?: string;
}

export function BaridiMobModal({
  isOpen,
  onClose,
  selectedPackAmount = "3,900",
}: BaridiMobModalProps) {
  const [copiedRip, setCopiedRip] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const RIP_NUMBER = "00799999002345678912"; // Your BaridiMob RIP / Account number

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(RIP_NUMBER);
    setCopiedRip(true);
    setTimeout(() => setCopiedRip(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) return;
    setSubmitted(true);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-right space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>الدفع عبر بريدي موب / CCP</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">شحن رصيد الكريدي</h2>
          <p className="text-xs text-slate-500">
            المبلغ المطلوب:{" "}
            <span className="font-bold text-slate-900">{selectedPackAmount} دج</span>
          </p>
        </div>

        {/* RIP Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold text-slate-500 block">
            رقم الحساب (RIP) لتحويل بريدي موب:
          </span>
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
              {RIP_NUMBER}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 active:scale-95 transition-transform"
            >
              {copiedRip ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transaction confirmation form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                رقم العملية أو اسم المرسل (بعد إتمام التحويل):
              </label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="مثال: N° 12345678 أو اسم الحساب"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 focus:bg-white text-right"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Send className="w-3.5 h-3.5 rotate-180" />
              <span>تأكيد إرسال الدفع</span>
            </button>
          </form>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1 text-emerald-800">
            <div className="text-sm font-bold">تم استلام طلب التحقق بنجاح!</div>
            <p className="text-xs text-emerald-600">
              سيتم تفعيل الكريدي في حسابك خلال دقائق بعد التأكد من العملية.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export default as fallback for default imports
export default BaridiMobModal;