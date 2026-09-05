// lib/kling.ts

const SUBMIT_URL = "https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video";
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

  const response = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      prompt: optimizedPrompt,
      negative_prompt: negativePrompt,
      image_url: formattedImageUrl,
      duration: "8s",          // you asked for 8 seconds
      aspect_ratio: "9:16",
      resolution: "720p",
      generate_audio: false,   // silent video
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

  const statusUrl = `https://queue.fal.run/${MODEL_ID}/requests/${taskId}/status`;

  const response = await fetch(statusUrl, {
    method: "GET",
    headers: {
      Authorization: `Key ${falKey}`,
      Accept: "application/json",
    },
  });

  const statusText = await response.text();
  let statusData: any = {};
  try {
    statusData = statusText ? JSON.parse(statusText) : {};
  } catch {
    return { status: "processing" };
  }

  if (!response.ok) {
    return {
      status: "failed",
      error: statusData.detail || `Status check returned HTTP ${response.status}`,
    };
  }

  if (statusData.status === "COMPLETED") {
    const directUrl =
      statusData.video?.url ||
      statusData.output?.video?.url ||
      statusData.output?.url ||
      statusData.video_url;

    if (directUrl) {
      return { status: "succeed", videoUrl: directUrl };
    }

    const resultUrl = `https://queue.fal.run/${MODEL_ID}/requests/${taskId}`;
    const resResponse = await fetch(resultUrl, {
      method: "GET",
      headers: {
        Authorization: `Key ${falKey}`,
        Accept: "application/json",
      },
    });

    const resText = await resResponse.text();
    let resData: any = {};
    try {
      resData = resText ? JSON.parse(resText) : {};
    } catch {
      return { status: "failed", error: "Failed to parse fal result payload" };
    }

    const videoUrl =
      resData.video?.url ||
      resData.output?.video?.url ||
      resData.output?.url ||
      resData.video_url;

    if (videoUrl) {
      return { status: "succeed", videoUrl };
    }

    return { status: "failed", error: "Video URL not found in completed result" };
  }

  if (statusData.status === "IN_PROGRESS") return { status: "processing" };
  if (statusData.status === "IN_QUEUE") return { status: "submitted" };

  return {
    status: "failed",
    error: statusData.error || statusData.detail || "Generation failed on fal.ai",
  };
}