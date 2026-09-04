"use client";

import { useState } from "react";
import { Upload, X, Play, RefreshCw, Film, UserCheck } from "lucide-react";

export function UgcForm() {
  const [images, setImages] = useState<string[]>([]);
  const [gender, setGender] = useState<"Female" | "Male">("Female");
  const [videoType, setVideoType] = useState<"avatar" | "showcase">("avatar");
  const [description, setDescription] = useState("");
  const [coreOffer, setCoreOffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    spokenScript: string;
    spokenScriptWithTags?: string;
    klingVisualPrompt: string;
    audioUrl?: string;
  } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 2 - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: description,
          coreOffer,
          gender,
          videoType,
          productImages: images,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to local server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-white shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* IMAGE UPLOAD */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Product Images (Max 2)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {images.map((imgSrc, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950"
              >
                <img
                  src={imgSrc}
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 p-1 bg-slate-950/80 hover:bg-red-500 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {images.length < 2 && (
              <label className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/50 p-2">
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-400">
                  {images.length === 0 ? "Upload 1st Image" : "Upload 2nd Image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={images.length >= 2}
                />
              </label>
            )}
          </div>
        </div>

        {/* VIDEO FORMAT SELECTION */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Video Branch Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVideoType("avatar")}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                videoType === "avatar"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Talking Avatar (Lip-Sync)
            </button>

            <button
              type="button"
              onClick={() => setVideoType("showcase")}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                videoType === "showcase"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Film className="w-4 h-4" />
              Product B-Roll Only
            </button>
          </div>
        </div>

        {/* VOICE GENDER SELECTION */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Voice Actor
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender("Female")}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                gender === "Female"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              Woman Voice
            </button>

            <button
              type="button"
              onClick={() => setGender("Male")}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                gender === "Male"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              Man Voice
            </button>
          </div>
        </div>

        {/* PRODUCT & HOOK DETAILS */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Product Description
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Luxury leather wallet with RFID blocking and coin pocket..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Commercial Hook / Offer (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. توصيل مجاني ل 58 ولاية + تخفيض 30% لليوم فقط"
              value={coreOffer}
              onChange={(e) => setCoreOffer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Generating Script & Algerian Audio...
            </>
          ) : (
            "Generate Script & Voice"
          )}
        </button>
      </form>

      {/* GENERATED PREVIEWS */}
      {result && (
        <div className="pt-6 border-t border-slate-800 space-y-5">
          {/* AUDIO PLAYER (STEP 4 PREVIEW) */}
          {result.audioUrl && (
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block mb-2">
                ElevenLabs Spoken Audio Preview:
              </span>
              <audio controls className="w-full h-10" src={result.audioUrl}>
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {/* SCRIPT (EDITABLE) */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Editable Algerian Darja Script:
            </span>
            <textarea
              rows={3}
              dir="rtl"
              value={result.spokenScript}
              onChange={(e) =>
                setResult({ ...result, spokenScript: e.target.value })
              }
              className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-300 text-right font-sans text-base focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* VISUAL PROMPT */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Kling Visual Prompt:
            </span>
            <textarea
              rows={3}
              value={result.klingVisualPrompt}
              onChange={(e) =>
                setResult({ ...result, klingVisualPrompt: e.target.value })
              }
              className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}