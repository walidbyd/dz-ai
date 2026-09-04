"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Zap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/studio`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تسجيل الدخول");
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
        
        <div className="space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
            DZ
          </div>
          <h1 className="text-xl font-black text-slate-900">Algeria UGC Studio</h1>
          <p className="text-xs text-slate-500 font-medium">
            أنشئ إعلانات فيديو UGC بدارجة عاصمية نقية في ثوانٍ
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-right">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-900">3 كريدي مجاناً</div>
            <div className="text-[11px] text-emerald-700">لكل حساب جديد لتجربة المنصة فوراً</div>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full min-h-[48px] py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-3 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>تسجيل الدخول باستخدام Google</span>
            </>
          )}
        </button>

        <div className="text-[10px] text-slate-400">
          بالتسجيل فإنك توافق على شروط الخدمة وسياسة الخصوصية
        </div>
      </div>
    </div>
  );
}