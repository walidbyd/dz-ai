"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Video,
  Volume2,
  UserCheck,
  Sparkles,
  Play,
  Pause,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Send,
  Zap,
  Heart,
  MessageCircle,
  Share2,
  Music,
  SlidersHorizontal,
  FileText,
  Smartphone,
  Upload,
  Square,
  Radio,
  Plus,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { BaridiMobModal } from "@/components/BaridiMobModal";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function StudioPage() {
  const router = useRouter();

  // Authentication & Profile states
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(3);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Studio UI states
  const [activeTab, setActiveTab] = useState<"preview" | "script" | "settings">("settings");

  // Multi-Image & Model states (Horizontal Grid up to 4 images)
  const [productImages, setProductImages] = useState<string[]>([]);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<"LIPSYNC" | "VOICEOVER">("LIPSYNC");

  // Voice Selection State
  const [voiceCategory, setVoiceCategory] = useState<"ai" | "custom">("ai");
  const [voice, setVoice] = useState<"sarah" | "walid" | "custom">("sarah");
  const [customAudioName, setCustomAudioName] = useState<string | null>(null);

  // Microphone Live Recording states
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Script & Interactive Gemini Chat
  const [inputPrompt, setInputPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptData, setScriptData] = useState<{
    script: string;
    visualPromptAr: string;
    visualPromptEn: string;
    sfxPrompt?: string;
  } | null>(null);

  // Audio Preview Limits & State (Capped at 2)
  const [audioPreviewCount, setAudioPreviewCount] = useState<number>(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewSfxUrl, setPreviewSfxUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);

  // Rendering, Polling & Paywall Modal
  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string>("جاري تحضير الفيديو...");
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState<boolean>(false);

  // Fetch real user session & credits on initial mount
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const res = await fetch("/api/user", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        if (!data || !data.authenticated) {
          window.location.href = "/login";
          return;
        }
        setCredits(data.credits ?? 0);
        if (data.user?.name) setUserName(data.user.name);
        if (data.user?.avatar) setUserAvatar(data.user.avatar);
      } catch (err) {
        console.error("Failed to load user profile:", err);
        window.location.href = "/login";
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUserProfile();
  }, []);

  // Multi-image file uploader (Max 4)
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 4 - productImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImages((prev) => {
          if (prev.length >= 4) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeProductImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Custom Audio File Upload Handler
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomAudioName(file.name);
      setVoice("custom");
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAudioUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Direct In-Browser Microphone Recording
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setPreviewAudioUrl(base64Audio);
          setCustomAudioName("تسجيل صوتي مباشر (Mic)");
          setVoice("custom");
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingMic(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMsg("تعذر الوصول إلى الميكروفون. يرجى منح الإذن من إعدادات المتصفح.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      setIsRecordingMic(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  // Generate / Chat with Gemini to adjust the script
  const handleGenerateScript = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (productImages.length === 0 && chatMessages.length === 0) {
      setErrorMsg("يرجى رفع صورة واحدة على الأقل للمنتج.");
      setActiveTab("settings");
      return;
    }
    setErrorMsg(null);
    setLoadingScript(true);

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      ...(textToSend ? [{ role: "user" as const, content: textToSend }] : []),
    ];

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          voice: voice === "custom" ? "walid" : voice,
          videoMode,
          productImage: productImages[0],
          avatarImage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل توليد السكريبت");

      setScriptData({
        script: data.script,
        visualPromptAr: data.visualPromptAr,
        visualPromptEn: data.visualPromptEn,
        sfxPrompt: data.sfxPrompt,
      });

      if (voice !== "custom") {
        setPreviewAudioUrl(null);
      }
      setPreviewSfxUrl(null);

      setChatMessages([...newMessages, { role: "assistant", content: data.script }]);
      setInputPrompt("");
      setActiveTab("script");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingScript(false);
    }
  };

  // Generate Mixed Audio (Voice + SFX) - Enforcing 2 Previews Limit
  const handleGenerateAudio = async () => {
    if (audioPreviewCount >= 2) {
      setErrorMsg("لقد استنفدت الحد الأقصى للمعاينة الصوتية (2/2). يمكنك الآن الانتقال لتوليد الفيديو.");
      return;
    }
    if (!scriptData?.script && voice !== "custom") return;

    setLoadingAudio(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onlyAudio: true,
          voice: voice === "custom" ? "walid" : voice,
          script: scriptData?.script || "إعلان ترويجي",
          sfxPrompt: scriptData?.sfxPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل توليد الصوت");

      if (voice !== "custom") {
        setPreviewAudioUrl(data.audioUrl);
      }
      setPreviewSfxUrl(data.sfxUrl);
      setAudioPreviewCount((prev) => prev + 1);

      setTimeout(() => {
        playMixedAudio();
      }, 150);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingAudio(false);
    }
  };

  const playMixedAudio = () => {
    if (!voiceAudioRef.current) return;

    if (isPlayingAudio) {
      voiceAudioRef.current.pause();
      sfxAudioRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current.volume = 1.0;
      voiceAudioRef.current.play().catch(console.error);

      if (sfxAudioRef.current) {
        sfxAudioRef.current.currentTime = 0;
        sfxAudioRef.current.volume = 0.85;
        sfxAudioRef.current.play().catch(console.error);
      }

      setIsPlayingAudio(true);
    }
  };

  // Video Rendering using Kling - Triggers Paywall if credits <= 0
  const handleRenderFinalVideo = async () => {
    if (!previewAudioUrl) {
      setErrorMsg("يرجى اختيار، تسجيل أو رفع الصوت أولاً!");
      return;
    }

    // Paywall trigger: No credits -> Prompt commercial offer modal
    if (credits <= 0) {
      setShowPaywallModal(true);
      return;
    }

    setIsRendering(true);
    setErrorMsg(null);
    setRenderStatus("جارٍ رفع الملفات وإطلاق مهمة الفيديو...");

    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: previewAudioUrl,
          visualPromptEn:
            scriptData?.visualPromptEn || "Dynamic Algerian UGC creator product showcase, 9:16 vertical video",
          productImageUrl: productImages[0],
          avatarImageUrl: avatarImage,
          videoMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskId) throw new Error(data.error || "فشل إطلاق عملية الرندر");

      const taskId = data.taskId;
      setRenderStatus("تم إرسال الطلب  ! جاري توليد وتحريك الفيديو (1-2 دقيقة)...");

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/render-video?taskId=${taskId}&type=image2video`);
          const pollData = await pollRes.json();

          if (pollData.status === "succeed") {
            clearInterval(pollInterval);
            setFinalVideoUrl(pollData.videoUrl);
            setCredits((prev) => Math.max(0, prev - 1));
            setIsRendering(false);
            setRenderStatus("");
            setActiveTab("preview");
          } else if (pollData.status === "failed") {
            clearInterval(pollInterval);
            setIsRendering(false);
            setErrorMsg(`فشل التوليد: ${pollData.error || "خطأ غير معروف"}`);
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 5000);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsRendering(false);
      setRenderStatus("");
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased flex flex-col pb-28 lg:pb-8">
      {/* Hidden Audio Elements */}
      {previewAudioUrl && (
        <audio
          ref={voiceAudioRef}
          src={previewAudioUrl}
          onEnded={() => {
            setIsPlayingAudio(false);
            sfxAudioRef.current?.pause();
          }}
        />
      )}
      {previewSfxUrl && <audio ref={sfxAudioRef} src={previewSfxUrl} />}

      {/* Header */}
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 md:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-600 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setShowPaywallModal(true)}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span>{loadingUser ? "..." : `${credits} كريدي`}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <h1 className="text-xs font-bold text-slate-900 leading-none">
              {userName || "مساعد الإعلانات الذكي"}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">UGC Reels 9:16</span>
          </div>
          {userAvatar ? (
            <img src={userAvatar} alt="Profile" className="w-8 h-8 rounded-full border border-emerald-500 object-cover shadow-xs" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              DZ
            </div>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {errorMsg && (
        <div className="mx-3 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium flex-1">{errorMsg}</span>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        
        {/* 1. LEFT COLUMN: Setup & Uploads */}
        <section className={`lg:col-span-3 space-y-3.5 ${activeTab === "settings" ? "block" : "hidden lg:block"}`}>
          
          {/* Voice Hierarchy: 1) Sarah / Walid, 2) Your Voice (Expands to Mic / Upload) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-600" />
                المعلق الصوتي:
              </span>
              <span className="text-[10px] text-slate-400 font-medium">دارجة  V3</span>
            </label>

            {/* Top 2 AI Voices */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVoiceCategory("ai");
                  setVoice("sarah");
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                  voiceCategory === "ai" && voice === "sarah"
                    ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                    : "border-slate-200 bg-white active:bg-slate-50"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">سارة (Sarah)</div>
                  <div className="text-[10px] text-slate-500">صوت أنثوي حيوي</div>
                </div>
                {voiceCategory === "ai" && voice === "sarah" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setVoiceCategory("ai");
                  setVoice("walid");
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                  voiceCategory === "ai" && voice === "walid"
                    ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                    : "border-slate-200 bg-white active:bg-slate-50"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">وليد (Walid)</div>
                  <div className="text-[10px] text-slate-500">صوت رجالي إعلاني</div>
                </div>
                {voiceCategory === "ai" && voice === "walid" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </button>
            </div>

            {/* Dedicated "Your Voice" expandable toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setVoiceCategory("custom");
                  setVoice("custom");
                }}
                className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                  voiceCategory === "custom"
                    ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                    : "border-slate-200 bg-slate-50/70 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">صوتك الخاص (تسجيل أو رفع)</div>
                    <div className="text-[10px] text-slate-500">استعمل نبرتك الحقيقية في الفيديو</div>
                  </div>
                </div>
                {voiceCategory === "custom" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>

              {/* Sub-options for custom voice: Record OR Upload */}
              {voiceCategory === "custom" && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  {!isRecordingMic ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full min-h-[40px] py-2 px-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <Mic className="w-3.5 h-3.5 animate-pulse" />
                      <span>تسجيل مباشر بالميكروفون</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-full min-h-[40px] py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all animate-pulse shadow-md"
                    >
                      <Square className="w-3 h-3 fill-red-500 text-red-500" />
                      <span>إيقاف وحفظ ({recordDuration} ثانية)</span>
                    </button>
                  )}

                  <label className="w-full min-h-[38px] py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>رفع ملف صوتي جاهز</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={handleCustomAudioUpload} />
                  </label>

                  {customAudioName && (
                    <div className="text-[10px] text-emerald-700 font-bold bg-white p-2 rounded-lg border border-emerald-200 text-center truncate">
                      ✅ {customAudioName}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Presentation Mode */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Video className="w-4 h-4 text-emerald-600" />
              طريقة الإخراج:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVideoMode("LIPSYNC")}
                className={`min-h-[40px] p-2 rounded-xl border text-right transition-all flex items-center justify-center ${
                  videoMode === "LIPSYNC" ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500" : "border-slate-200 active:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Lip-Sync (موديل)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVideoMode("VOICEOVER")}
                className={`min-h-[40px] p-2 rounded-xl border text-right transition-all flex items-center justify-center ${
                  videoMode === "VOICEOVER" ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500" : "border-slate-200 active:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>B-roll (صوت فقط)</span>
                </div>
              </button>
            </div>
          </div>

          {/* Compact Horizontal Grid for Product Images (Up to 4) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                صور السلعة ({productImages.length}/4):
              </span>
              <span className="text-[10px] text-slate-400">اسحب أو أضف</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {productImages.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeProductImage(idx)}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}

              {productImages.length < 4 && (
                <label className="w-16 h-16 shrink-0 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-emerald-600">
                  <Plus className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-0.5">إضافة</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleProductImageUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Dedicated Model/Avatar Image Slot */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">صورة الموديل (Lip-Sync):</div>
              <div className="text-[10px] text-slate-400">وجه الموديل للتحدث بالفيديو</div>
            </div>

            <label className="w-14 h-14 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors shrink-0">
              {avatarImage ? (
                <img src={avatarImage} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UploadCloud className="w-5 h-5 text-slate-400" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
        </section>

        {/* 2. CENTER COLUMN: Script & Audio Mix with 2-Preview Capping */}
        <section className={`lg:col-span-5 flex flex-col space-y-3.5 ${activeTab === "script" ? "flex" : "hidden lg:flex"}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-5 flex flex-col justify-between min-h-[460px] lg:min-h-[520px]">
            <div className="space-y-3 overflow-y-auto max-h-[60vh] lg:max-h-[460px] pl-1">
              {scriptData || previewAudioUrl ? (
                <div className="space-y-3">
                  {scriptData && (
                    <>
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                          <span className="flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                            السكريبت الإعلاني (7-9 ثوانٍ):
                          </span>
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-300 font-semibold">
                            تجاري
                          </span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed text-slate-900">{scriptData.script}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-slate-500" />
                          المشهد وحركة الكاميرا:
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">{scriptData.visualPromptAr}</p>
                      </div>

                      {scriptData.sfxPrompt && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                          <Music className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate font-medium">المؤثر الصوتي: {scriptData.sfxPrompt}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Audio Generation with 2-Preview Enforcement */}
                  {!previewAudioUrl ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled={loadingAudio || audioPreviewCount >= 2}
                        onClick={handleGenerateAudio}
                        className="w-full min-h-[46px] py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                      >
                        {loadingAudio ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري توليد ودمج الصوت...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            <span>توليد ومعاينة الصوت (متبقي {2 - audioPreviewCount} من 2) 🎧</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-emerald-600" />
                          معاينة الصوت الكامل ({audioPreviewCount}/2 معاينات مستهلكة):
                        </span>
                        {audioPreviewCount < 2 && (
                          <button
                            type="button"
                            onClick={handleGenerateAudio}
                            disabled={loadingAudio}
                            className="text-[10px] text-emerald-700 underline hover:text-emerald-900 font-bold"
                          >
                            إعادة توليد (متبقي 1)
                          </button>
                        )}
                      </div>
                      
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={playMixedAudio}
                          className="w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                        >
                          {isPlayingAudio ? (
                            <>
                              <Pause className="w-4 h-4 fill-white" />
                              <span>إيقاف مؤقت</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-white" />
                              <span>استماع للصوت والمؤثرات معاً</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Render Final Video Button */}
                  <button
                    type="button"
                    disabled={isRendering || !previewAudioUrl}
                    onClick={handleRenderFinalVideo}
                    className="w-full min-h-[48px] py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isRendering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="truncate">{renderStatus || "جاري إنتاج الفيديو  ..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>تأكيد وبدء توليد الفيديو النهائي (1 كريدي)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-64 sm:h-72 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-4 sm:p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">الاستوديو جاهز للبدء</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    ارفع صور السلعة من قسم الإعدادات، واكتب وصف العرض بالأسفل لإنشاء السكريبت ومعاينة الصوت مجاناً.
                  </p>
                </div>
              )}
            </div>

            {/* Input / Chat with Gemini */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerateScript()}
                placeholder={
                  scriptData
                    ? "ناقش أو عدّل السكريبت مع Gemini..."
                    : "اكتب تفاصيل السلعة (مثال: شيبس كرانشي قرمشة بنينة)..."
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 focus:bg-white text-right"
              />
              <button
                type="button"
                disabled={loadingScript}
                onClick={() => handleGenerateScript()}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0 shadow-xs"
              >
                {loadingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
              </button>
            </div>
          </div>
        </section>

        {/* 3. RIGHT COLUMN: Phone Mockup Preview */}
        <section className={`lg:col-span-4 flex flex-col items-center justify-center ${activeTab === "preview" ? "flex" : "hidden lg:flex"}`}>
          <div className="relative w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[310px] aspect-[9/18] max-h-[72vh] bg-black rounded-[38px] sm:rounded-[42px] p-2.5 shadow-2xl border-[4px] sm:border-[5px] border-slate-800 ring-1 ring-slate-900/40 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-slate-900 rounded-full z-30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-black/60 border border-slate-700 mr-1" />
            </div>

            <div className="relative w-full h-full rounded-[30px] sm:rounded-[32px] overflow-hidden bg-slate-950 flex flex-col justify-between">
              {finalVideoUrl ? (
                <video src={finalVideoUrl} controls autoPlay loop playsInline className="absolute inset-0 w-full h-full object-cover" />
              ) : productImages[0] ? (
                <div className="absolute inset-0 w-full h-full">
                  <img src={productImages[0]} alt="Preview Canvas" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <UploadCloud className="w-8 h-8 mb-2 opacity-30 text-white" />
                  <p className="text-xs font-bold text-slate-400">معاينة الهاتف (9:16)</p>
                  <p className="text-[10px] text-slate-600 mt-1">ستظهر صورة السلعة والفيديو هنا</p>
                </div>
              )}

              <div className="relative z-20 pt-4 px-3 flex items-center justify-between text-[10px] text-white/90">
                <span className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full font-mono text-[9px]">10s Preview</span>
                <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full text-[9px]">Reels</span>
              </div>

              <div className="relative z-20 self-end px-2 flex flex-col items-center gap-3 text-white pb-8">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 fill-white text-white" />
                  </div>
                  <span className="text-[8px] font-bold">14.8k</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold">512</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <Share2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold">مشاركة</span>
                </div>
              </div>

              <div className="relative z-20 p-3 text-white space-y-1">
                <span className="text-[11px] font-black block text-emerald-400">@ecommerce_dz</span>
                <p className="text-[10px] sm:text-[11px] text-white/95 line-clamp-2 leading-relaxed">
                  {scriptData?.script || (customAudioName ? `صوت خاص: ${customAudioName}` : "السكريبت سيظهر هنا مباشرة...")}
                </p>
                <div className="flex items-center gap-1.5 text-[9px] text-white/70">
                  <Music className="w-3 h-3 text-emerald-400 animate-spin" />
                  <span className="truncate">لهجة  • صوت طبيعي</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Commercial Zero-Credit Paywall Popup */}
      <BaridiMobModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        selectedPackAmount="3,900"
      />

      {/* Mobile Glassmorphic Bottom Tab Navigation */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-50 bg-white/95 backdrop-blur-lg border border-slate-200/80 rounded-2xl px-3 py-1.5 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all rounded-xl ${
            activeTab === "settings" ? "text-emerald-600 bg-emerald-50/80" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>الإعدادات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("script")}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all rounded-xl ${
            activeTab === "script" ? "text-emerald-600 bg-emerald-50/80" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>السكريبت</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all rounded-xl ${
            activeTab === "preview" ? "text-emerald-600 bg-emerald-50/80" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>الهاتف (9:16)</span>
        </button>
      </nav>
    </div>
  );
}