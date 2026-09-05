import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable" },
        { status: 500 }
      );
    }

    const { productImageBase64, productName, productCategory } = await req.json();

    if (!productImageBase64) {
      return NextResponse.json(
        { error: "صورة المنتج مطلوبة لتحليل الإعلان" },
        { status: 400 }
      );
    }

    // Clean base64 string if it contains data prefix
    const base64Data = productImageBase64.replace(/^data:image\/\w+;base64,/, "");

    const genAI = new GoogleGenerativeAI(apiKey);
    // Using fast Flash Lite model for instant responses
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const systemPrompt = `
You are an elite Algerian UGC creative director specializing in viral TikTok & Reels e-commerce ads.
Your task is to analyze the uploaded product image and produce an ad script in natural Algerian Darija (العاصمية).

Rules:
1. The script MUST be written strictly in conversational Algerian Darija (دارجة جزائرية عاصمية). DO NOT use Modern Standard Arabic (فصحى).
2. The hook (first 0-2 seconds) must immediately stop scrolling using words like: "راك حاصل", "شوف هادي", "داير حالة", "أقوى برودوي".
3. The video will use a Voiceover format (no speaking avatar on camera, pure product b-roll).
4. Provide structured SFX cues mapped to timestamps (between 0s and 6s).
5. Output strictly a JSON object with this exact structure:

{
  "productSummary": "Brief Arabic description of the product",
  "scriptDarija": "The spoken voiceover script in Algerian Darija (around 20-30 words, 6 seconds total)",
  "visualPromptEn": "Detailed English prompt for Veo 3.1 Lite: cinematic camera movements, studio lighting, product showcase, 9:16 vertical, no talking heads",
  "sfxCues": [
    { "timeSec": 0.2, "type": "whoosh", "label": "هوك قوي" },
    { "timeSec": 3.0, "type": "ding", "label": "تركيز على الميزة" },
    { "timeSec": 5.2, "type": "cash", "label": "عرض التوصيل والطلب" }
  ]
}
`;

    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
      `Product hint: ${productName || "Product"} in category: ${productCategory || "E-commerce"}`,
    ]);

    const rawResponse = result.response.text();
    
    // Clean code fences if Gemini returns markdown ```json ... ```
    const cleanedJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanedJson);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze product image" },
      { status: 500 }
    );
  }
}