// lib/kling.ts
import { fal } from "@fal-ai/client";

const MODEL_ID = "fal-ai/veo3.1/lite/image-to-video";

export async function generateKlingUGCVideo(
  prompt: string,
  imageUrl: string,
  isFemaleVoice: boolean = true
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("Missing FAL_KEY in environment variables");
  }

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

  const avatarRules = isFemaleVoice
    ? "beautiful clean face, elegant modest clothing, fully covering respectful outfit"
    : "handsome clean face, well-groomed, elegant respectful clothing";

  // Stronger creative direction — encourage variation, not exact image copy
  const optimizedPrompt = `${prompt}. 
Vertical 9:16 commercial UGC video. 
Use the product from the reference image but create a more creative and dynamic scene — do not just animate the exact uploaded photo. 
Subject never speaks or moves lips. 
Natural authentic movement, product stays clear and recognizable, smooth intentional camera, high quality commercial look. 
${avatarRules}`;

  const negativePrompt =
    "talking, moving lips, speaking mouth, lip-sync, mouth open, speaking, " +
    "exact copy of input image, static image, frozen frame, no motion, " +
    "revealing clothes, exposed skin, low cut, cleavage, unmodest, " +
    "dirty skin, acne, blemishes, facial distortion, morphing, " +
    "blurry product, distorted logo, changing logo, bad anatomy, " +
    "deformed fingers, extra limbs, shaky camera, low resolution, " +
    "glitch, artifacts, jerky motion, text overlay, watermark";

  const result = await fal.queue.submit(MODEL_ID, {
    input: {
      prompt: optimizedPrompt,
      negative_prompt: negativePrompt,
      image_url: formattedImageUrl,
      duration: "8s",
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
    const statusData = await fal.queue.status(MODEL_ID, {
      requestId: taskId,
      logs: false,
    });

    if (statusData.status === "COMPLETED") {
      const result: any = await fal.queue.result(MODEL_ID, {
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

      return { status: "failed", error: "Video URL not found in completed result" };
    }

    if (statusData.status === "IN_PROGRESS") return { status: "processing" };
    if (statusData.status === "IN_QUEUE") return { status: "submitted" };

    return {
      status: "failed",
      error: "Generation failed on fal.ai",
    };
  } catch (error: any) {
    console.error("fal client error:", error);
    return {
      status: "failed",
      error: error.message || "Failed to check status",
    };
  }
}