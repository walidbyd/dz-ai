import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { uploadAudioBuffer } from "@/lib/storage";
import { generateKlingUGCVideo, checkKlingTaskStatus } from "@/lib/kling";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user from session cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    // 2. Check current credits balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits <= 0) {
      return NextResponse.json(
        { error: "رصيد الكريدي غير كافٍ لتوليد الفيديو." },
        { status: 403 }
      );
    }

    const { audioBase64, visualPromptEn, productImageUrl, avatarImageUrl, videoMode } =
      await req.json();

    // 3. Process and upload audio to Supabase Storage (kept for future lip-sync step)
    if (audioBase64) {
      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
      const audioBuffer = Buffer.from(cleanBase64, "base64");
      await uploadAudioBuffer(audioBuffer, "ad_voice_sfx.mp3");
    }

    // 4. Trigger Kling image-to-video generation
    // generateKlingUGCVideo expects (prompt: string, imageUrl: string)
    const imageUrl = avatarImageUrl || productImageUrl;
    if (!imageUrl) {
      return NextResponse.json(
        { error: "صورة الأفاتار أو المنتج مطلوبة لتوليد الفيديو." },
        { status: 400 }
      );
    }

    const prompt =
      visualPromptEn ||
      "Dynamic Algerian UGC creator product showcase, 9:16 vertical video, commercial lighting";

    const taskId = await generateKlingUGCVideo(prompt, imageUrl);

    // 5. Automatically deduct 1 credit from Supabase
    const { data: remainingCredits } = await (supabase as any).rpc("decrement_user_credits", {
      target_user_id: user.id,
    });

    return NextResponse.json({ taskId, creditsRemaining: remainingCredits });
  } catch (error: any) {
    console.error("Render Video Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start render" }, { status: 500 });
  }
}

/**
 * Poll Kling task status (used by the studio frontend).
 * GET /api/render-video?taskId=xxx&type=image2video
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const type = (searchParams.get("type") as "image2video" | "lipsync") || "image2video";

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const result = await checkKlingTaskStatus(taskId, type);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Poll Render Video Error:", error);
    return NextResponse.json(
      { status: "failed", error: error.message || "Failed to check task status" },
      { status: 500 }
    );
  }
}