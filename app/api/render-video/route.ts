import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
      return NextResponse.json(
        { error: "غير مصرح، يرجى تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    // 2. Check current credits balance
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || (profile.credits ?? 0) <= 0) {
      return NextResponse.json(
        { error: "رصيد الكريدي غير كافٍ لتوليد الفيديو." },
        { status: 403 }
      );
    }

    const { visualPromptEn, productImageUrl, avatarImageUrl } = await req.json();

    const imageInput = avatarImageUrl || productImageUrl;
    if (!imageInput) {
      return NextResponse.json(
        { error: "صورة المنتج أو الموديل مطلوبة لتوليد الفيديو." },
        { status: 400 }
      );
    }

    const prompt =
      visualPromptEn ||
      "Dynamic Algerian UGC creator product showcase, 9:16 vertical video, commercial lighting";

    console.log("Submitting job to fal.ai Kling 2.6 with prompt:", prompt);
    
    // 3. Trigger generation via fal.ai
    const taskId = await generateKlingUGCVideo(prompt, imageInput);

    // 4. Safely decrement 1 credit in Supabase
    try {
      await supabase
        .from("profiles")
        .update({ credits: Math.max(0, (profile.credits ?? 1) - 1) })
        .eq("id", user.id);
    } catch (creditErr) {
      console.warn("Could not update credits:", creditErr);
    }

    return NextResponse.json({ taskId, success: true });
  } catch (error: any) {
    console.error("Render Video Error:", error);
    return NextResponse.json(
      { error: error.message || "فشل إطلاق عملية توليد الفيديو في fal.ai" },
      { status: 500 }
    );
  }
}

/**
 * Poll task status (GET /api/render-video?taskId=xxx)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const result = await checkKlingTaskStatus(taskId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Poll Render Error:", error);
    return NextResponse.json(
      { status: "failed", error: error.message || "Failed to check task status" },
      { status: 500 }
    );
  }
}