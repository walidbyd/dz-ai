import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { uploadAudioBuffer } from "@/lib/storage";
import { generateKlingUGCVideo } from "@/lib/kling";

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

    // 3. Process and upload audio to Supabase Storage
    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
    const audioBuffer = Buffer.from(cleanBase64, "base64");
    const hostedAudioUrl = await uploadAudioBuffer(audioBuffer, "ad_voice_sfx.mp3");

    // 4. Trigger Kling generation
    const taskId = await generateKlingUGCVideo({
      audioUrl: hostedAudioUrl,
      prompt: visualPromptEn,
      productImage: productImageUrl,
      avatarImage: avatarImageUrl,
      mode: videoMode,
    });

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