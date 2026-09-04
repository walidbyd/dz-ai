// components/AudioUploader.tsx
"use client";

import { useState, useRef } from "react";
import { Mic, Square, UploadCloud, Play, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  onAudioReady: (url: string) => void;
}

export default function AudioUploader({ onAudioReady }: Props) {
  const [mode, setMode] = useState<"RECORD" | "UPLOAD">("RECORD");
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Live Mic Recording with Browser Permissions
  const startRecording = async () => {
    setErrorMsg("");
    setAudioUrl(null);

    try {
      // Requests microphone permission from the user
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await uploadAudioBlob(audioBlob, "recorded_voice.webm");
        // Stop all audio hardware tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 10) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح.");
      } else {
        setErrorMsg("تعذر تشغيل الميكروفون على هذا الجهاز.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // 2. Upload MP3 file directly
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("audio") && !file.name.endsWith(".mp3")) {
      setErrorMsg("يرجى اختيار ملف صوتي بصيغة MP3 أو WAV.");
      return;
    }

    await uploadAudioBlob(file, file.name);
  };

  // 3. Send audio to /api/upload-audio
  const uploadAudioBlob = async (blobOrFile: Blob | File, filename: string) => {
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("audio", blobOrFile, filename);

    try {
      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setAudioUrl(data.audioUrl);
        onAudioReady(data.audioUrl);
      } else {
        setErrorMsg(data.error || "فشل رفع الصوت");
      }
    } catch {
      setErrorMsg("خطأ أثناء رفع الملف الصوتي");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white space-y-4" dir="rtl">
      {/* Mode Selector */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setMode("RECORD")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === "RECORD" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400"
          }`}
        >
          <Mic className="w-3.5 h-3.5" /> سجل بصوتك (10 ثوانٍ)
        </button>
        <button
          type="button"
          onClick={() => setMode("UPLOAD")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === "UPLOAD" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" /> رفع ملف MP3
        </button>
      </div>

      {/* Permission / General Error */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mic Recording Mode */}
      {mode === "RECORD" && (
        <div className="flex flex-col items-center justify-center py-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={loading}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              <Mic className="w-7 h-7" />
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center animate-pulse shadow-lg"
            >
              <Square className="w-6 h-6" />
            </button>
          )}

          <div className="mt-3 text-center">
            <span className="text-xs text-slate-400 block font-mono font-bold">
              {recording ? `جاري التسجيل: ${recordingTime} / 10s` : "إضغط على الميكروفون للتسجيل"}
            </span>
          </div>
        </div>
      )}

      {/* File Upload Mode */}
      {mode === "UPLOAD" && (
        <label className="flex flex-col items-center justify-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/50 cursor-pointer hover:border-emerald-500/50 transition-colors">
          <UploadCloud className="w-8 h-8 text-emerald-400 mb-2" />
          <span className="text-xs font-bold text-slate-300">إختر ملف صوتي (MP3 أو WAV)</span>
          <span className="text-[10px] text-slate-500 mt-0.5">الحد الأقصى للمدة: 10 ثوانٍ</span>
          <input
            type="file"
            accept="audio/mp3,audio/wav,audio/m4a,audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      )}

      {/* Audio Playback & Ready State */}
      {audioUrl && (
        <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم تجهيز التسجيل بنجاح</span>
          </div>
          <audio controls src={audioUrl} className="h-8 w-44" />
        </div>
      )}
    </div>
  );
}