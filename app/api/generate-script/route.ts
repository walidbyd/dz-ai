// app/api/generate-script/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateElevenLabsSFX } from "@/lib/audio";
import { LOCKED_SYSTEM_PROMPT } from "@/constants/prompts";
import crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const imagePartCache = new Map<string, { inlineData: { data: string; mimeType: string } }>();

function getImageHash(urlOrBase64: string): string {
  return crypto.createHash("sha256").update(urlOrBase64).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      voice = "sarah",
      onlyAudio,
      script,
      sfxPrompt,
      productImage,
    } = body;

    // 1. ELEVENLABS AUDIO + SFX
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

      console.log("🎙️ Generating ElevenLabs Speech for:", voiceId);
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

      let sfxErrorMessage: string | null = null;
      const rawPrompt =
        sfxPrompt || "Crisp product package unboxing, satisfying subtle whoosh and sparkle ding";
      const sfxPromise = generateElevenLabsSFX(rawPrompt, 4).catch((err: any) => {
        sfxErrorMessage = err.message || "SFX Generation failed";
        return null;
      });

      const [voiceBuffer, sfxBuffer] = await Promise.all([ttsPromise, sfxPromise]);

      return NextResponse.json({
        success: true,
        audioUrl: `data:audio/mpeg;base64,${voiceBuffer.toString("base64")}`,
        sfxUrl: sfxBuffer ? `data:audio/mpeg;base64,${sfxBuffer.toString("base64")}` : null,
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

    async function urlToGenerativePartCached(url: string) {
      const hash = getImageHash(url);
      if (imagePartCache.has(hash)) {
        return imagePartCache.get(hash)!;
      }

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

    const voiceContext =
      voice === "sarah"
        ? "VOICE GENDER: FEMALE (Sarah). The script MUST be spoken by a sweet, vibrant Algerian woman to other women/customers. If an avatar/model appears in visualPromptEn, she MUST be an extremely beautiful Algerian woman with a spotless, clean face, and wearing modest, fully covered, respectful clothing (ساتر ومحترم)."
        : "VOICE GENDER: MALE (Walid). The script MUST be spoken by an energetic Algerian man. If an avatar/model appears, he MUST be a handsome, clean-shaven or neatly groomed man in respectful, stylish attire.";

    const promptParts: any[] = [
      LOCKED_SYSTEM_PROMPT,
      { text: voiceContext },
      await urlToGenerativePartCached(productImage),
    ];

    const rawList = (messages || []).filter((m: any) => m.content && m.content.trim().length > 0);
    if (rawList.length > 0) {
      promptParts.push({ text: `تفاصيل المستخدم: ${JSON.stringify(rawList)}` });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
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
      sfxPrompt: parsed.sfxPrompt || "Crisp satisfying clean click and sparkle bell",
    });
  } catch (error: any) {
    console.error("Script generation error:", error);
    return NextResponse.json({ error: error.message || "فشل توليد السكريبت" }, { status: 500 });
  }
}
