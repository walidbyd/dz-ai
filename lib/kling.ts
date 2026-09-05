// lib/kling.ts

const VEO_LITE_URL = "https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video";

export async function generateKlingUGCVideo(
  prompt: string,
  imageUrl: string,
  hasAvatar: boolean = false
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("Missing FAL_KEY in environment variables");
  }

  let formattedImageUrl = imageUrl;
  if (
    !imageUrl.startsWith("http://") &&
    !imageUrl.startsWith("https://") &&
    !imageUrl.startsWith("data:")
  ) {
    formattedImageUrl = `data:image/jpeg;base64,${imageUrl}`;
  }

  const optimizedPrompt = `${prompt}. Cinematic commercial product showcase b-roll, 9:16 vertical video, subject does not speak to camera, dynamic smooth camera movements, studio commercial lighting`;

  const baseNegative =
    "talking, moving lips, speaking mouth, lip-sync, morphing, blurry text, distorted product label, changing logo, bad anatomy, deformed fingers, extra limbs, shaky camera, low resolution, glitch, artifacts, jerky motion";

  const negativePrompt = hasAvatar
    ? `${baseNegative}, unnatural facial expressions, double faces, cartoonish skin`
    : `${baseNegative}, random humans, random faces, floating objects, warped geometry`;

  const response = await fetch(VEO_LITE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: optimizedPrompt,
      negative_prompt: negativePrompt,
      image_url: formattedImageUrl,
      duration: "6s",
      aspect_ratio: "9:16",
      resolution: "720p",
      generate_audio: false,
    }),
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`fal.ai returned invalid response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    const errorMsg = data.detail || data.message || text;
    throw new Error(`fal.ai Veo Error (${response.status}): ${errorMsg}`);
  }

  return data.request_id;
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

  const statusUrl = `https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video/requests/${taskId}/status`;

  const response = await fetch(statusUrl, {
    method: "GET",
    headers: {
      Authorization: `Key ${falKey}`,
    },
  });

  const statusText = await response.text();
  let data: any = {};
  try {
    data = statusText ? JSON.parse(statusText) : {};
  } catch {
    // If fal.ai is briefly unreachable or returned HTML gateway timeout, treat as processing
    return { status: "processing" };
  }

  if (!response.ok) {
    return {
      status: "failed",
      error: data.detail || `Failed to check task status (${response.status})`,
    };
  }

  if (data.status === "COMPLETED") {
    // Veo 3.1 on fal.ai often returns the result directly in the status object or output
    if (data.video?.url || data.output?.url) {
      return { status: "succeed", videoUrl: data.video?.url || data.output?.url };
    }

    // Fetch result if not embedded
    const resultUrl = `https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video/requests/${taskId}`;
    const resResponse = await fetch(resultUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });

    const resText = await resResponse.text();
    let resData: any = {};
    try {
      resData = resText ? JSON.parse(resText) : {};
    } catch {
      return { status: "failed", error: "Invalid JSON response from fal.ai result" };
    }

    const videoUrl = resData.video?.url || resData.output?.url;
    if (videoUrl) {
      return { status: "succeed", videoUrl };
    }
    return { status: "failed", error: "Video URL not found in result" };
  }

  if (data.status === "IN_PROGRESS") {
    return { status: "processing" };
  }

  if (data.status === "IN_QUEUE") {
    return { status: "submitted" };
  }

  return { status: "failed", error: data.error || "Generation failed on fal.ai" };
}