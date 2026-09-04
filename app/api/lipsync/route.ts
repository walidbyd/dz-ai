// app/api/generate-script/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, voice, onlyAudio, script, productImage, avatarImage } = body;

    // --- CASE 1: PREVIEW AUDIO (ElevenLabs v3 Settings: 0.5, 0.5, 0.0) ---
    if (onlyAudio) {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "API Key not configured" }, { status: 400 });
      }

      const voiceId =
        voice === "walid"
          ? process.env.MY_CUSTOM_VOICE_ID || "QnyUxHTDyrsvn6iC7qBT"
          : process.env.SARAH_VOICE_ID || "a8ByD1LhCNBSMqQ7xAvI";

      const textToSpeak =
        script ||
        "[excited] حَابْ la vidéo تَاعْ l'activité تَاعَكْ تْكُونْ شَابَّة وَغِيرْ بـ neuf cents dinars؟ الصَّحْ يَبْدَا مَن le montage. [cheerful] profitez مَن l'offre!";

      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: textToSpeak,
            model_id: "eleven_v3",
            voice_settings: {
              stability: 0.5,          // 0.5
              similarity_boost: 0.5,   // 0.5
              style: 0.0,              // 0.0
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        return NextResponse.json({ error: errText }, { status: 500 });
      }

      const audioBuffer = await ttsRes.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString("base64");
      return NextResponse.json({
        success: true,
        audioUrl: `data:audio/mp3;base64,${base64Audio}`,
      });
    }

    // --- CASE 2: STRICT IMAGE VERIFICATION ---
    if (!productImage || !avatarImage) {
      return NextResponse.json({
        success: true,
        needsImages: true,
        reply: "من فضلك طلّع صُورَة السِّلْعَة (Product) وصُورَة الأَفَاتَار (Model) من القائمة الجانبية أولاً باش نخدمولك السكريبت.",
        script: "",
        visualPromptAr: "",
        visualPromptEn: "",
      });
    }

    // --- CASE 3: MULTIMODAL SCRIPT CREATION (GEMINI 3.5 FLASH) ---
    const rawList = (messages || []).filter(
      (m: { role: string; content: string }) => m.content && m.content.trim().length > 0
    );
    const firstUserIdx = rawList.findIndex((m: any) => m.role === "user");
    const sanitizedHistory = firstUserIdx !== -1 ? rawList.slice(firstUserIdx) : [];

    const contents = sanitizedHistory.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    async function urlToGenerativePart(url: string) {
      if (url.startsWith("data:")) {
        const [header, base64Data] = url.split(",");
        const mimeType = header.split(";")[0].replace("data:", "");
        return {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        };
      }
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: response.headers.get("content-type") || "image/jpeg",
        },
      };
    }

    const promptParts: any[] = [
      `أنت كاتب إعلانات ومسوّق رقمي عاصمي (Strict Central Algérois / Alger Centre).
مهمتك كتابة سكريبت إعلاني (10 ثوانٍ) متقن ومضبوط صوتياً بنسبة 100% لمحرك ElevenLabs v3، ووصف مشهد بصري (Visual Prompt) بناءً على صور السلعة والأفاتار ووصف المستخدم.

قواعد صارمة:
1. الأسعار: بالفرنسية مسبوقة بـ "بـ" ومتبوعة بكلمة dinars (مثال: بـ neuf cents dinars). ممنوع العامية المعربة نهائياً.
2. منع كلمة "بَرْكْ" واستبدالها دائماً بـ "غِيرْ" قبل السعر.
3. منع كلمات التوقيت نهائياً (ممنوع دُرْكْ، دُرْكَا، دُوكْ، دُوكَا، الآن).
4. التشكيل الصارم للكلمات الحساسة: الصَّحْ، بْنِينَة، شَابَّة، شْبَابْ، تَاعْ، حَابْ.
5. بدون أي مقدمات ترحيبية أو كلام إضافي نهائياً.

أجب حصراً بصيغة JSON بدون أي نص إضافي:
{
  "script": "السكريبت العاصمي المشكول مع السعر بالفرنسية وبدون كلمات توقيت وبدون أي مقدمة",
  "visualPromptAr": "وصف المشهد البصري بالعربية يدمج الموديل والسلعة بدقة",
  "visualPromptEn": "Photorealistic 10-second vertical 9:16 UGC commercial prompt featuring the exact product and model from the provided images, realistic studio lighting, 4k"
}
`,
    ];

    promptParts.push(await urlToGenerativePart(productImage));
    promptParts.push(await urlToGenerativePart(avatarImage));

    if (contents.length > 0) {
      promptParts.push({ text: `User request: ${JSON.stringify(contents)}` });
    }

    // Using Gemini 3.5 Flash
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
      needsImages: false,
      script: parsed.script,
      visualPromptAr: parsed.visualPromptAr,
      visualPromptEn: parsed.visualPromptEn,
    });
  } catch (error: any) {
    console.error("Script Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate script" }, { status: 500 });
  }
}