// app/api/generate-script/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateElevenLabsSFX } from "@/lib/audio";
import { LOCKED_SYSTEM_PROMPT } from "@/constants/prompts";
import crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// In-memory cache for processed images: { [hash]: { inlineData: { data, mimeType } } }
const imagePartCache = new Map<string, { inlineData: { data: string; mimeType: string } }>();

function getImageHash(urlOrBase64: string): string {
  return crypto.createHash("sha256").update(urlOrBase64).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      voice,
      videoMode = "LIPSYNC",
      onlyAudio,
      script,
      sfxPrompt,
      productImage,
      avatarImage,
    } = body;

    // =========================================================================
    // 1. ELEVENLABS V3 AUDIO + SFX PREVIEW
    // =========================================================================
    if (onlyAudio) {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "ELEVENLABS_API_KEY is missing" }, { status: 400 });
      }

      const voiceId =
        voice === "walid"
          ? process.env.MY_CUSTOM_VOICE_ID || "QnyUxHTDyrsvn6iC7qBT"
          : process.env.SARAH_VOICE_ID || "a8ByD1LhCNBSMqQ7xAvI";

      const formattedScript = script.trim().startsWith("[")
        ? script.trim()
        : `[excited, fast, cheerful] ${script.trim()}`;

      console.log("🎙️ 1. Generating ElevenLabs Speech for:", voiceId);
      const ttsPromise = fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: formattedScript,
          model_id: "eleven_v3",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`TTS Error: ${err}`);
        }
        return Buffer.from(await res.arrayBuffer());
      });

      // 2. Generate SFX using sanitized prompt
      let sfxErrorMessage: string | null = null;
      const rawPrompt =
        sfxPrompt || "Crisp potato chips snack bag opening rip, loud satisfying crunchy bites";
      const sfxPromise = generateElevenLabsSFX(rawPrompt, 4).catch((err: any) => {
        sfxErrorMessage = err.message || "SFX Generation failed";
        console.error("⚠️ SFX Generation Error Caught:", sfxErrorMessage);
        return null;
      });

      const [voiceBuffer, sfxBuffer] = await Promise.all([ttsPromise, sfxPromise]);

      const base64Voice = voiceBuffer.toString("base64");
      const base64Sfx = sfxBuffer ? sfxBuffer.toString("base64") : null;

      return NextResponse.json({
        success: true,
        audioUrl: `data:audio/mpeg;base64,${base64Voice}`,
        sfxUrl: base64Sfx ? `data:audio/mpeg;base64,${base64Sfx}` : null,
        sfxError: sfxErrorMessage,
      });
    }

    if (!productImage) {
      return NextResponse.json({
        success: true,
        needsImages: true,
        reply: "يرجى رفع صورة السلعة أولاً لتوليد السكريبت.",
      });
    }

    // Cached image converter
    async function urlToGenerativePartCached(url: string) {
      const hash = getImageHash(url);
      if (imagePartCache.has(hash)) {
        console.log("⚡ [Cache Hit] Reusing cached image part for hash:", hash.substring(0, 10));
        return imagePartCache.get(hash)!;
      }

      console.log("📦 [Cache Miss] Processing new image part...");
      let part: { inlineData: { data: string; mimeType: string } };

      if (url.startsWith("data:")) {
        const [header, base64Data] = url.split(",");
        const mimeType = header.split(";")[0].replace("data:", "");
        part = { inlineData: { data: base64Data, mimeType } };
      } else {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        part = {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString("base64"),
            mimeType: response.headers.get("content-type") || "image/jpeg",
          },
        };
      }

      imagePartCache.set(hash, part);
      return part;
    }

    // Pass the isolated, permanently locked system prompt
    const promptParts: any[] = [LOCKED_SYSTEM_PROMPT];
    promptParts.push(await urlToGenerativePartCached(productImage));
    if (avatarImage) {
      promptParts.push(await urlToGenerativePartCached(avatarImage));
    }

    const rawList = (messages || []).filter((m: any) => m.content && m.content.trim().length > 0);
    if (rawList.length > 0) {
      promptParts.push({ text: `تفاصيل المستخدم: ${JSON.stringify(rawList)}` });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(promptParts);

    let resText = result.response.text().trim();
    if (resText.startsWith("```json")) {
      resText = resText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (resText.startsWith("```")) {
      resText = resText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(resText);

    return NextResponse.json({
      success: true,
      script: parsed.script,
      visualPromptAr: parsed.visualPromptAr,
      visualPromptEn: parsed.visualPromptEn,
      sfxPrompt: parsed.sfxPrompt || "Crisp potato chips snack bag opening rip, loud satisfying crunchy bites",
    });
  } catch (error: any) {
    console.error("Script generation error:", error);
    return NextResponse.json({ error: error.message || "فشل توليد السكريبت" }, { status: 500 });
  }
}