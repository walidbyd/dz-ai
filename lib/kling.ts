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

  // Enforce kinetic motion, fast camera sweeping, and light changes to prevent static renders
  const optimizedPrompt = `${prompt}. Dynamic 9:16 vertical commercial advertisement, fast sweeping camera movement, dramatic lighting change, professional product interaction, highly engaging commercial b-roll, high cinematic motion`;

  const negativePrompt =
    "static image, frozen frame, still photo, motionless picture, slideshow, camera zoom on still image, lack of movement, glitch, video artifacts, digital noise, rendering errors, visual stutter, frame drop, screen tear, compression artifacts, chromatic aberration, flickering, flashing, ghosting, blurry, out of focus, low resolution, pixelated, 3d render look, cartoonish, deformed geometry, warped objects, melting surfaces, morphing shapes, floating detached items, bad anatomy, mutated hands, deformed fingers, extra limbs, talking to camera, mouth speaking, watermark, logo overlay, timestamp, subtitle text";

  const result = await fal.queue.submit("fal-ai/veo3.1/lite/image-to-video", {
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