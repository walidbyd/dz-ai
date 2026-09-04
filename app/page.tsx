"use client";

import { useState } from "react";
import { Play, CheckCircle2, Sparkles, ArrowLeft, Video, Zap } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const sampleVideos = [
    {
      title: "إعلان ملابس وحقائب",
      niche: "ألبسة / كوسميتيك",
      duration: "00:10",
      hook: "سيروم طبيعي 100% يرجع لبشرتك النضارة من أول أسبوع!",
      creator: "صوت سارة (أفاتار)",
      bgGradient: "from-amber-700 to-rose-950",
    },
    {
      title: "ساعات ذكية وإلكترونيات",
      niche: "إلكترونيات",
      duration: "00:10",
      hook: "الساعة الذكية لي كامل راهم يحوسو عليها مع توصيل مجاني!",
      creator: "صوت وليد (أفاتار)",
      bgGradient: "from-blue-800 to-slate-950",
    },
    {
      title: "برغر وماكلة خفيفة",
      niche: "مطاعم / فاست فود",
      duration: "00:10",
      hook: "أبن برغر في العاصمة، جرب وما تندمش!",
      creator: "فيديو السلعة (Voiceover B-roll)",
      bgGradient: "from-orange-800 to-amber-950",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "طلّع تصويرة السلعة والموديل",
      desc: "حط صورة المنتج ديالك مباشرة مع الموديل لي يعجبك.",
    },
    {
      num: "02",
      title: "الذكاء الاصطناعي يكتب السكريبت والمؤثرات",
      desc: "السيستام يكتبلك نص بيعي بالدارجة العاصمية مع هندسة الصوت المحيطي.",
    },
    {
      num: "03",
      title: "خيّر طريقة الإخراج وخرج الفيديو",
      desc: "موديل يتكلم بالشفاه (Lip-sync) أو صوت تعليقي فوق المنتج (Voiceover) بجودة عالية.",
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            DZ
          </div>
          <span className="font-black text-sm md:text-base tracking-tight text-slate-900">
            ستوديو DZ Reel
          </span>
        </div>
        <Link
          href="/studio"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          الدخول إلى الاستوديو
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-16 md:space-y-24">
        {/* HERO SECTION */}
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-[11px] md:text-xs font-bold">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            مخدوم خصيصاً للتجارة الإلكترونية في الجزائر
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            رجّع تصاور منتجاتك لـ{" "}
            <span className="text-emerald-600 underline decoration-emerald-300">
              فيديوهات إعلانية بالدارجة
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            اخدم إعلانات تيكتوك وريلز بالدارجة العاصمية، بصوت بشري ومؤثرات صوتية محيطية بالذكاء الاصطناعي في دقائق معدودة.
          </p>
          <div className="pt-4 flex flex-col items-center justify-center">
            <Link
              href="/studio"
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm md:text-base shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              افتح الاستوديو وجرّب مباشرة
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <p className="text-[10px] md:text-xs text-slate-400 mt-3">
              استخدام فوري مباشر • بدون تسجيل مسبق
            </p>
          </div>
        </section>

        {/* SHOWCASE SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-4 md:p-8 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">
              أمثلة على الفيديوهات لي تقدر تخدمها
            </h2>
            <p className="text-sm text-slate-500">
              فيديوهات عمودية (9:16) واجدة مباشرة للنشر في تيكتوك وفيسبوك ريلز.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {sampleVideos.map((vid, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveVideoIndex(idx)}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                    activeVideoIndex === idx
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <h3 className={`text-sm font-bold ${activeVideoIndex === idx ? "text-emerald-800" : "text-slate-700"}`}>
                      {vid.niche}
                    </h3>
                    <p className="text-[11px] text-slate-500">{vid.creator}</p>
                  </div>
                  {activeVideoIndex === idx && <Play className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto md:mr-auto rounded-3xl overflow-hidden border-4 border-slate-900 bg-slate-950 shadow-2xl flex flex-col justify-between p-4">
            <div className={`absolute inset-0 bg-gradient-to-b ${sampleVideos[activeVideoIndex].bgGradient} opacity-70`} />
            
            <div className="relative z-10 flex justify-between items-center text-[10px] text-white/80 font-mono">
              <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {sampleVideos[activeVideoIndex].duration}
              </span>
              <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                UGC Ad
              </span>
            </div>

            <div className="relative z-10 text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-105 transition-transform">
                <Play className="w-6 h-6 fill-white ml-1" />
              </div>
            </div>

            <div className="relative z-10 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[9px] font-bold text-emerald-400 block mb-1 font-mono uppercase">
                السكريبت (الدارجة):
              </span>
              <p className="text-xs text-white font-bold leading-relaxed">
                "{sampleVideos[activeVideoIndex].hook}"
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">كيفاش تخدم؟</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {steps.map((st, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 text-center shadow-sm">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg mb-4">
                  {st.num}
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-900 mb-2">{st.title}</h3>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING (Updated with Cost Multiplier Architecture) */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">باقات الكريدي</h2>
            <p className="text-sm text-slate-500">أشري على حساب واش تسحق، بلا اشتراك شهري.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Pack 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
              <span className="text-xs font-bold text-slate-500 mb-1">باقة التجربة</span>
              <h3 className="text-xl font-black text-slate-900 mb-2">3 فيديوهات</h3>
              <div className="mb-4">
                <span className="text-3xl font-black text-slate-900">3,900 دج</span>
                <span className="text-xs text-slate-400 block mt-1">1,300 دج للفيديو</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2.5 mb-6 flex-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> سكريبت دارجة عاصمية احترافي</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> تعليق صوتي بشري (سارة/وليد)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> مؤثرات Foley وخلفية بيئية</li>
              </ul>
              <Link href="/studio" className="w-full text-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs transition-colors">
                ابدأ الاستخدام
              </Link>
            </div>

            {/* Pack 10 */}
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 flex flex-col relative shadow-md">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white font-bold text-[10px] px-3 py-1 rounded-bl-xl">الأكثر طلباً</div>
              <span className="text-xs font-bold text-emerald-700 mb-1 mt-1">باقة النمو</span>
              <h3 className="text-xl font-black text-slate-900 mb-2">10 فيديوهات</h3>
              <div className="mb-4">
                <span className="text-3xl font-black text-emerald-700">9,600 دج</span>
                <span className="text-xs text-emerald-600 font-medium block mt-1">960 دج للفيديو فقط</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2.5 mb-6 flex-1 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> 10 إعلانات جاهزة للحملات</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> دعم الموديل المتحدث (Lip-Sync)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> دمج صوتي متطور بمؤثرات SFX</li>
              </ul>
              <Link href="/studio" className="w-full text-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm">
                ابدأ الاستخدام
              </Link>
            </div>

            {/* Pack 20 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
              <span className="text-xs font-bold text-slate-500 mb-1">باقة التوسع والتجارة الكبرى</span>
              <h3 className="text-xl font-black text-slate-900 mb-2">20 فيديو</h3>
              <div className="mb-4">
                <span className="text-3xl font-black text-slate-900">12,800 دج</span>
                <span className="text-xs text-slate-400 block mt-1">640 دج للفيديو فقط</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2.5 mb-6 flex-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> تكلفة إنتاج منخفضة بنسبة 50%</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> أولوية في المعالجة والتوليد</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> جودة عالية 720p HD للريلز</li>
              </ul>
              <Link href="/studio" className="w-full text-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs transition-colors">
                ابدأ الاستخدام
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}