// lib/kling.ts
import { fal } from "@fal-ai/client";

export async function generateKlingUGCVideo(
  prompt: string,
  imageUrl: string,
  isFemaleVoice: boolean = true
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("Missing FAL_KEY in environment variables");
  }

  // Configure fal credentials
  fal.config({
    credentials: falKey,
  });

  let formattedImageUrl = imageUrl;
  if (
    !imageUrl.startsWith("http://") &&
    !imageUrl.startsWith("https://") &&
    !imageUrl.startsWith("data:")
  ) {
    formattedImageUrl = `data:image/jpeg;base64,${imageUrl}`;
  }

  const avatarEnforcement = isFemaleVoice
    ? "If a female creator is shown: beautiful spotless clean face, elegant modest styling, fully covering respectful clothes, hijabi or elegant modest apparel"
    : "If a male creator is shown: handsome spotless clean face, well-groomed, elegant respectful clothing";

  const optimizedPrompt = `${prompt}. Cinematic commercial product showcase b-roll, 9:16 vertical video, subject does not speak to camera, dynamic smooth camera movements, studio commercial lighting, ${avatarEnforcement}`;

  const negativePrompt =
    "talking, moving lips, speaking mouth, lip-sync, revealing clothes, exposed skin, low cut, unmodest, immodest, cleavage, dirty skin, acne, blemishes, facial distortion, morphing, blurry text, distorted product label, changing logo, bad anatomy, deformed fingers, extra limbs, shaky camera, low resolution, glitch, artifacts, jerky motion";

  const result = await fal.queue.submit("fal-ai/veo3.1/lite/image-to-video", {
    input: {
      prompt: optimizedPrompt,
      negative_prompt: negativePrompt,
      image_url: formattedImageUrl,
      duration: "6s",
      aspect_ratio: "9:16",
      resolution: "720p",
      generate_audio: false,
    },
  });

  return result.request_id;
}

export async function checkKlingTaskStatus(
  taskId: string,
  _type?: string
): Promise<{
  status: "submitted" | "processing" | "succeed" | "failed";
  videoUrl?: string;
  error?: string;
}> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("Missing FAL_KEY in environment variables");
  }

  fal.config({
    credentials: falKey,
  });

  try {
    const status = await fal.queue.status("fal-ai/veo3.1/lite/image-to-video", {
      requestId: taskId,
      logs: false,
    });

    if (status.status === "COMPLETED") {
      const result: any = await fal.queue.result("fal-ai/veo3.1/lite/image-to-video", {
        requestId: taskId,
      });

      const videoUrl =
        result.data?.video?.url ||
        result.data?.output?.video?.url ||
        result.data?.output?.url ||
        result.video?.url ||
        result.data?.video_url;

      if (videoUrl) {
        return { status: "succeed", videoUrl };
      }

      return { status: "failed", error: "Video URL not found in fal.ai output" };
    }

    if (status.status === "IN_PROGRESS") {
      return { status: "processing" };
    }

    if (status.status === "IN_QUEUE") {
      return { status: "submitted" };
    }

    return { status: "failed", error: "Generation failed on fal.ai" };
  } catch (error: any) {
    console.error("fal client error:", error);
    return {
      status: "failed",
      error: error.message || "Failed to check status",
    };
  }
}