// app/studio/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Video,
  Volume2,
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
  Download,
  Flame,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { BaridiMobModal } from "@/components/BaridiMobModal";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function StudioPage() {
  const router = useRouter();

  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(3);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<"preview" | "script" | "settings">("settings");
  const [productImages, setProductImages] = useState<string[]>([]);

  const [voiceCategory, setVoiceCategory] = useState<"ai" | "custom">("ai");
  const [voice, setVoice] = useState<"sarah" | "walid" | "custom">("sarah");
  const [customAudioName, setCustomAudioName] = useState<string | null>(null);

  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [inputPrompt, setInputPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptData, setScriptData] = useState<{
    hook?: string;
    onScreenText?: string;
    script: string;
    visualPromptAr: string;
    visualPromptEn: string;
    sfxPrompt?: string;
  } | null>(null);

  const [audioPreviewCount, setAudioPreviewCount] = useState<number>(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewSfxUrl, setPreviewSfxUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string>("جاري تحضير الفيديو...");
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState<boolean>(false);
  const isSubmittingRef = useRef(false);

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

    const savedTaskId = localStorage.getItem("active_render_task_id");
    if (savedTaskId) {
      setIsRendering(true);
      setRenderStatus("جاري استرجاع ومعالجة الفيديو...");
      setActiveTab("preview");
      pollTask(savedTaskId);
    }
  }, []);

  const pollTask = (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/render-video?taskId=${taskId}`);
        const rawText = await pollRes.text();

        let pollData: any = {};
        try {
          pollData = rawText ? JSON.parse(rawText) : {};
        } catch {
          return;
        }

        if (pollData.status === "succeed" && pollData.videoUrl) {
          clearInterval(pollInterval);
          localStorage.removeItem("active_render_task_id");
          setFinalVideoUrl(pollData.videoUrl);
          setIsRendering(false);
          setRenderStatus("");
          setActiveTab("preview");
          setIsPlayingAudio(false);
        } else if (pollData.status === "failed") {
          clearInterval(pollInterval);
          localStorage.removeItem("active_render_task_id");
          setIsRendering(false);
          setErrorMsg(`فشل التوليد: ${pollData.error || "خطأ غير معروف"}`);
        }
      } catch (pollErr) {
        console.warn("Polling network blip, retrying next tick...", pollErr);
      }
    }, 5000);
  };

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
          voice: voice === "custom" ? "sarah" : voice,
          productImage: productImages[0],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل توليد السكريبت");

      setScriptData({
        hook: data.hook,
        onScreenText: data.onScreenText,
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
          voice: voice === "custom" ? "sarah" : voice,
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
      if (previewVideoRef.current) previewVideoRef.current.pause();
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

      if (previewVideoRef.current) {
        previewVideoRef.current.currentTime = 0;
        previewVideoRef.current.play().catch(console.error);
      }

      setIsPlayingAudio(true);
    }
  };

  const toggleVideoPlaybackWithAudio = () => {
    const vid = previewVideoRef.current;
    if (!vid) return;

    if (vid.paused) {
      vid.play().catch(console.error);
      if (voiceAudioRef.current) {
        voiceAudioRef.current.currentTime = vid.currentTime;
        voiceAudioRef.current.volume = 1.0;
        voiceAudioRef.current.play().catch(console.error);
      }
      if (sfxAudioRef.current) {
        sfxAudioRef.current.currentTime = vid.currentTime;
        sfxAudioRef.current.volume = 0.85;
        sfxAudioRef.current.play().catch(console.error);
      }
      setIsPlayingAudio(true);
    } else {
      vid.pause();
      voiceAudioRef.current?.pause();
      sfxAudioRef.current?.pause();
      setIsPlayingAudio(false);
    }
  };

  // Hard-burn Hook, Caption badge, and ElevenLabs audio directly into downloaded MP4
  const handleDownloadMergedVideo = async () => {
    if (!finalVideoUrl) return;

    setIsExportingVideo(true);
    try {
      const videoEl = document.createElement("video");
      videoEl.crossOrigin = "anonymous";
      videoEl.src = finalVideoUrl;
      videoEl.muted = true;

      let audioEl: HTMLAudioElement | null = null;
      if (previewAudioUrl) {
        audioEl = document.createElement("audio");
        audioEl.crossOrigin = "anonymous";
        audioEl.src = previewAudioUrl;
      }

      let sfxEl: HTMLAudioElement | null = null;
      if (previewSfxUrl) {
        sfxEl = document.createElement("audio");
        sfxEl.crossOrigin = "anonymous";
        sfxEl.src = previewSfxUrl;
      }

      const mediaPromises: Promise<any>[] = [
        new Promise((res) => (videoEl.onloadedmetadata = res)),
      ];
      if (audioEl) mediaPromises.push(new Promise((res) => (audioEl!.onloadedmetadata = res)));
      if (sfxEl) mediaPromises.push(new Promise((res) => (sfxEl!.onloadedmetadata = res)));
      await Promise.all(mediaPromises);

      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = actx.createMediaStreamDestination();

      if (audioEl) {
        const sourceAudio = actx.createMediaElementSource(audioEl);
        sourceAudio.connect(dest);
      }
      if (sfxEl) {
        const sourceSfxNode = actx.createMediaElementSource(sfxEl);
        sourceSfxNode.connect(dest);
      }

      const canvas = document.createElement("canvas");
      const width = videoEl.videoWidth || 720;
      const height = videoEl.videoHeight || 1280;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      const canvasStream = canvas.captureStream(30);
      const audioTracks = dest.stream.getAudioTracks();
      const combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        ...(audioTracks.length > 0 ? [audioTracks[0]] : []),
      ]);

      const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")
        ? "video/mp4;codecs=avc1,mp4a.40.2"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const downloadUrl = URL.createObjectURL(blob);
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `ugc-ad-dz-with-hook.${ext}`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
        setIsExportingVideo(false);
      };

      recorder.start();
      videoEl.play();
      audioEl?.play();
      sfxEl?.play();

      const hookText = scriptData?.hook || "";
      const captionText = scriptData?.onScreenText || "";

      // Helper function to draw rounded rectangles on HTML5 Canvas
      const roundRect = (
        c: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
      };

      const drawLoop = () => {
        if (!videoEl.paused && !videoEl.ended) {
          // 1. Draw current video frame
          ctx.drawImage(videoEl, 0, 0, width, height);

          // 2. Render Hook Badge (active during first 4 seconds)
          if (hookText && videoEl.currentTime <= 4.0) {
            ctx.save();
            const badgeW = width * 0.88;
            const badgeH = 95;
            const badgeX = (width - badgeW) / 2;
            const badgeY = height * 0.11;

            // Outer glowing border
            const grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
            grad.addColorStop(0, "#ef4444");
            grad.addColorStop(0.5, "#f43f5e");
            grad.addColorStop(1, "#f59e0b");

            ctx.shadowColor = "rgba(239, 68, 68, 0.75)";
            ctx.shadowBlur = 24;
            ctx.fillStyle = grad;
            roundRect(ctx, badgeX - 3, badgeY - 3, badgeW + 6, badgeH + 6, 26);
            ctx.fill();

            // Inner dark card container
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
            roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
            ctx.fill();

            // Hook typography
            ctx.direction = "rtl";
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.font = "900 32px 'Segoe UI', Tahoma, Arial, sans-serif";
            ctx.fillText(hookText, width / 2, badgeY + 58);
            ctx.restore();
          }

          // 3. Render Bottom On-Screen Caption Badge
          if (captionText) {
            ctx.save();
            const capW = width * 0.75;
            const capH = 55;
            const capX = (width - capW) / 2;
            const capY = height * 0.22;

            ctx.fillStyle = "#facc15";
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 14;
            roundRect(ctx, capX, capY, capW, capH, 28);
            ctx.fill();

            ctx.direction = "rtl";
            ctx.textAlign = "center";
            ctx.fillStyle = "#000000";
            ctx.font = "900 24px 'Segoe UI', Tahoma, Arial, sans-serif";
            ctx.fillText(captionText, width / 2, capY + 36);
            ctx.restore();
          }

          requestAnimationFrame(drawLoop);
        } else if (videoEl.ended) {
          recorder.stop();
          actx.close();
        }
      };

      drawLoop();
    } catch (err) {
      console.warn("Muxing error, fallback to raw video download:", err);
      const a = document.createElement("a");
      a.href = finalVideoUrl;
      a.download = "ugc-ad-dz-8s.mp4";
      a.target = "_blank";
      a.click();
      setIsExportingVideo(false);
    }
  };

  const handleRenderFinalVideo = async () => {
    if (isSubmittingRef.current || isRendering) return;

    if (!previewAudioUrl) {
      setErrorMsg("يرجى اختيار، تسجيل أو رفع الصوت أولاً!");
      return;
    }

    if (credits <= 0) {
      setShowPaywallModal(true);
      return;
    }

    isSubmittingRef.current = true;
    setIsRendering(true);
    setErrorMsg(null);
    setRenderStatus("جارٍ إطلاق مهمة الفيديو الإبداعية  (8 ثوانٍ)...");
    setActiveTab("preview");

    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualPromptEn:
            scriptData?.visualPromptEn || "Creative commercial product showcase, 9:16 vertical video",
          productImageUrl: productImages[0],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskId) throw new Error(data.error || "فشل إطلاق عملية الرندر");

      const taskId = data.taskId;
      localStorage.setItem("active_render_task_id", taskId);
      setCredits((prev) => Math.max(0, prev - 1));
      setRenderStatus("تم إرسال الطلب بنجاح! جاري تحريك المشهد الإعلاني (8 ثوانٍ)...");

      pollTask(taskId);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsRendering(false);
      setRenderStatus("");
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased flex flex-col pb-28 lg:pb-8">
      {previewAudioUrl && (
        <audio
          ref={voiceAudioRef}
          src={previewAudioUrl}
          preload="auto"
          onEnded={() => {
            setIsPlayingAudio(false);
            sfxAudioRef.current?.pause();
          }}
        />
      )}
      {previewSfxUrl && <audio ref={sfxAudioRef} src={previewSfxUrl} preload="auto" />}

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
            <span className="text-[10px] text-slate-400 font-medium">TikTok Reels 8.0s Ad Engine</span>
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
        
        {/* 1. LEFT COLUMN: Product & Voice Settings */}
        <section className={`lg:col-span-3 space-y-3.5 ${activeTab === "settings" ? "block" : "hidden lg:block"}`}>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-600" />
                المعلق الصوتي (اللهجة والأسلوب):
              </span>
              <span className="text-[10px] text-slate-400 font-medium">دارجة V3</span>
            </label>

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
                  <div className="text-[10px] text-slate-500">حيوية ومقنعة جداً</div>
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
                  <div className="text-[10px] text-slate-500">إعلاني حماسي وقوي</div>
                </div>
                {voiceCategory === "ai" && voice === "walid" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </button>
            </div>

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

              {voiceCategory === "custom" && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  {!isRecordingMic ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full min-h-[40px] py-2 px-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 animate-pulse" />
                      <span>تسجيل مباشر بالميكروفون</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-full min-h-[40px] py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all animate-pulse shadow-md cursor-pointer"
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
        </section>

        {/* 2. CENTER COLUMN: Hooks, Script & Audio Mix */}
        <section className={`lg:col-span-5 flex flex-col space-y-3.5 ${activeTab === "script" ? "flex" : "hidden lg:flex"}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-5 flex flex-col justify-between min-h-[460px] lg:min-h-[520px]">
            <div className="space-y-3 overflow-y-auto max-h-[60vh] lg:max-h-[460px] pl-1">
              {scriptData || previewAudioUrl ? (
                <div className="space-y-3">
                  {scriptData && (
                    <>
                      {/* Premium Animated Hook Presentation */}
                      {scriptData.hook && (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 border border-amber-500/30 p-3.5 shadow-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                              <Flame className="w-4 h-4 text-orange-600 fill-amber-500" />
                              <span>الهوك الافتتاحي الفيروسي (أول ثانيتين):</span>
                            </div>
                            <span className="text-[10px] bg-orange-600 text-white font-black px-2 py-0.5 rounded-full shadow-xs">
                              0:00 - 0:02
                            </span>
                          </div>
                          <p className="text-sm font-black text-slate-900 leading-snug">
                            "{scriptData.hook}"
                          </p>
                        </div>
                      )}

                      {/* Calibrated 8s Script */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                          <span className="flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                            السكريبت الإعلاني المضبوط (8 ثوانٍ فقط):
                          </span>
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            8.0s Max
                          </span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed text-slate-900">{scriptData.script}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-slate-500" />
                          المشهد البصري السينمائي:
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">{scriptData.visualPromptAr}</p>
                      </div>

                      {scriptData.onScreenText && (
                        <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-[11px] text-indigo-900 flex items-center gap-2">
                          <span className="font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[10px]">Caption</span>
                          <span className="truncate font-medium">{scriptData.onScreenText}</span>
                        </div>
                      )}
                    </>
                  )}

                  {!previewAudioUrl ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled={loadingAudio || audioPreviewCount >= 2}
                        onClick={handleGenerateAudio}
                        className="w-full min-h-[46px] py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {loadingAudio ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري توليد ودمج الصوت والمؤثرات (8s)...</span>
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
                          معاينة الصوت الكامل والمؤثرات:
                        </span>
                        {audioPreviewCount < 2 && (
                          <button
                            type="button"
                            onClick={handleGenerateAudio}
                            disabled={loadingAudio}
                            className="text-[10px] text-emerald-700 underline hover:text-emerald-900 font-bold cursor-pointer"
                          >
                            إعادة توليد (متبقي 1)
                          </button>
                        )}
                      </div>
                      
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={playMixedAudio}
                          className="w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
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

                  <button
                    type="button"
                    disabled={isRendering || !previewAudioUrl}
                    onClick={handleRenderFinalVideo}
                    className="w-full min-h-[48px] py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isRendering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="truncate">{renderStatus || "جاري إنتاج الفيديو الإعلاني..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>تأكيد وبدء توليد الفيديو النهائي 8s (1 كريدي)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-64 sm:h-72 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-4 sm:p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">محرك إعلانات 8 ثوانٍ الفيروسي</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    ارفع صور السلعة، واكتب تفاصيل العرض بالأسفل لإنشاء سكريبت وهوك إعلاني محسوب بدقة 8 ثوانٍ.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerateScript()}
                placeholder={
                  scriptData
                    ? "ناقش أو اطلب تغيير زاوية التصوير مع Gemini..."
                    : "اكتب السلعة (مثال: سيروم للوجه ترطيب ونضارة فائقة)..."
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 focus:bg-white text-right"
              />
              <button
                type="button"
                disabled={loadingScript}
                onClick={() => handleGenerateScript()}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0 shadow-xs cursor-pointer"
              >
                {loadingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
              </button>
            </div>
          </div>
        </section>

        {/* 3. RIGHT COLUMN: Phone Mockup Preview with Synchronized Video + Audio */}
        <section className={`lg:col-span-4 flex flex-col items-center justify-center ${activeTab === "preview" ? "flex" : "hidden lg:flex"}`}>
          <div className="relative w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[310px] aspect-[9/18] max-h-[72vh] bg-black rounded-[38px] sm:rounded-[42px] p-2.5 shadow-2xl border-[4px] sm:border-[5px] border-slate-800 ring-1 ring-slate-900/40 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-slate-900 rounded-full z-30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-black/60 border border-slate-700 mr-1" />
            </div>

            <div className="relative w-full h-full rounded-[30px] sm:rounded-[32px] overflow-hidden bg-slate-950 flex flex-col justify-between">
              {finalVideoUrl ? (
                <div 
                  className="absolute inset-0 w-full h-full cursor-pointer group"
                  onClick={toggleVideoPlaybackWithAudio}
                >
                  <video
                    ref={previewVideoRef}
                    src={finalVideoUrl}
                    loop
                    playsInline
                    onTimeUpdate={() => {
                      const vid = previewVideoRef.current;
                      if (!vid || !isPlayingAudio) return;

                      if (voiceAudioRef.current && Math.abs(voiceAudioRef.current.currentTime - vid.currentTime) > 0.3) {
                        voiceAudioRef.current.currentTime = vid.currentTime;
                      }
                      if (sfxAudioRef.current && Math.abs(sfxAudioRef.current.currentTime - vid.currentTime) > 0.3) {
                        sfxAudioRef.current.currentTime = vid.currentTime;
                      }
                    }}
                    onEnded={() => {
                      voiceAudioRef.current?.pause();
                      sfxAudioRef.current?.pause();
                      setIsPlayingAudio(false);
                    }}
                    className="w-full h-full object-cover"
                  />

                  {!isPlayingAudio && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg border border-white/20">
                        <Play className="w-7 h-7 fill-white translate-x-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              ) : isRendering ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-3 z-30">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="text-xs font-bold text-white">{renderStatus}</p>
                  <p className="text-[10px] text-slate-400">جاري الإخراج السينمائي للسلعة (8 ثوانٍ)...</p>
                </div>
              ) : productImages[0] ? (
                <div className="absolute inset-0 w-full h-full">
                  <img src={productImages[0]} alt="Preview Canvas" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <UploadCloud className="w-8 h-8 mb-2 opacity-30 text-white" />
                  <p className="text-xs font-bold text-slate-400">معاينة الهاتف (9:16)</p>
                  <p className="text-[10px] text-slate-600 mt-1">ستظهر لقطات الإعلان هنا</p>
                </div>
              )}

              {/* Dynamic Animated Hook Badge on Phone Preview */}
              {scriptData?.hook && (
                <div className="absolute top-14 inset-x-2.5 z-20 flex flex-col items-center pointer-events-none">
                  <div className="relative w-full max-w-[260px] bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-[1.5px] rounded-2xl shadow-2xl animate-pulse">
                    <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center justify-between gap-2 border border-white/10">
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-ping" />
                      <span className="text-[11px] font-black text-white text-center leading-tight truncate flex-1 drop-shadow-md">
                        {scriptData.hook}
                      </span>
                      <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    </div>
                  </div>
                </div>
              )}

              {/* On-Screen Caption Badge */}
              {scriptData?.onScreenText && (
                <div className="absolute top-28 inset-x-3 z-20 flex justify-center pointer-events-none">
                  <span className="bg-amber-400 text-black font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-lg border border-black/10 uppercase tracking-wide">
                    {scriptData.onScreenText}
                  </span>
                </div>
              )}

              <div className="relative z-20 pt-4 px-3 flex items-center justify-between text-[10px] text-white/90 pointer-events-none">
                <span className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full font-mono text-[9px] border border-white/10">8.0s Reel</span>
                <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full text-[9px]">UGC</span>
              </div>

              <div className="relative z-20 self-end px-2 flex flex-col items-center gap-3 text-white pb-8 pointer-events-none">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 fill-white text-white" />
                  </div>
                  <span className="text-[8px] font-bold">24.5k</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold">819</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                    <Share2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold">مشاركة</span>
                </div>
              </div>

              <div className="relative z-20 p-3 text-white space-y-1 pointer-events-none">
                <span className="text-[11px] font-black block text-emerald-400">@ecommerce_dz</span>
                <p className="text-[10px] sm:text-[11px] text-white/95 line-clamp-2 leading-relaxed">
                  {scriptData?.script || (customAudioName ? `صوت خاص: ${customAudioName}` : "السكريبت الإعلاني سيظهر هنا مباشرة...")}
                </p>
                <div className="flex items-center gap-1.5 text-[9px] text-white/70">
                  <Music className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span className="truncate">صوت إعلاني أصلي • دارجة</span>
                </div>
              </div>
            </div>
          </div>

          {/* Merged Video Download Button (Hardcoded Hook + Audio) */}
          {finalVideoUrl && (
            <button
              type="button"
              disabled={isExportingVideo}
              onClick={handleDownloadMergedVideo}
              className="mt-3 w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[310px] py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExportingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري حرق الهوك ودمج الصوت (MP4)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل الفيديو مدمج بالهوك والصوت (MP4)</span>
                </>
              )}
            </button>
          )}
        </section>
      </main>

      <BaridiMobModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        selectedPackAmount="3,900"
      />

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