// lib/kling.ts
import { fal } from "@fal-ai/client";

export async function generateKlingUGCVideo(
  prompt: string,
  imageUrl: string
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

  const optimizedPrompt = `${prompt}. Cinematic 9:16 vertical commercial video, dynamic product showcase, commercial studio lighting, smooth professional camera movement`;

  // Comprehensive negative prompt eliminating video artifacts, glitches, and rendering errors
  const negativePrompt =
    "glitch, video artifacts, digital noise, rendering errors, visual stutter, frame drop, screen tear, compression artifacts, chromatic aberration, flickering, flashing, ghosting, blurry, out of focus, low resolution, pixelated, 3d render look, cartoonish, oversaturated, deformed geometry, warped objects, melting surfaces, morphing shapes, floating detached items, bad anatomy, mutated hands, deformed fingers, extra limbs, severed limbs, unnatural motion, jerky camera movements, abrupt transitions, talking to camera, mouth speaking, moving lips, speech animation, watermark, logo overlay, timestamp, subtitle text, low quality, amateur footage";

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