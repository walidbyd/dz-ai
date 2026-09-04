// lib/kling.ts

const FAL_BASE_URL = "https://queue.fal.run/fal-ai/kling-video/v2.6/pro/image-to-video";

/**
 * Initiates an Image-to-Video generation task on Kling 2.6 via fal.ai REST API.
 * Uses native fetch — zero extra npm packages needed!
 */
export async function generateKlingUGCVideo(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("Missing FAL_KEY in environment variables");
  }

  const response = await fetch(FAL_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      start_image_url: imageUrl,
      duration: "5",
      aspect_ratio: "9:16",
      generate_audio: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.detail || data.message || JSON.stringify(data);
    throw new Error(`fal.ai Error (${response.status}): ${errorMsg}`);
  }

  return data.request_id;
}

/**
 * Checks the status of an ongoing fal.ai Kling task.
 * Returns { status, videoUrl }
 */
export async function checkKlingTaskStatus(
  taskId: string,
  type: "image2video" | "lipsync" = "image2video"
): Promise<{
  status: "submitted" | "processing" | "succeed" | "failed";
  videoUrl?: string;
  error?: string;
}> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("Missing FAL_KEY in environment variables");
  }

  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/v2.6/pro/image-to-video/requests/${taskId}/status`;

  const response = await fetch(statusUrl, {
    method: "GET",
    headers: {
      Authorization: `Key ${falKey}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      status: "failed",
      error: data.detail || "Failed to check task status on fal.ai",
    };
  }

  if (data.status === "COMPLETED") {
    // Fetch result
    const resultUrl = `https://queue.fal.run/fal-ai/kling-video/v2.6/pro/image-to-video/requests/${taskId}`;
    const resResponse = await fetch(resultUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const resData = await resResponse.json();
    const videoUrl = resData.video?.url || resData.output?.url;
    return { status: "succeed", videoUrl };
  }

  if (data.status === "IN_PROGRESS") {
    return { status: "processing" };
  }

  if (data.status === "IN_QUEUE") {
    return { status: "submitted" };
  }

  return { status: "failed", error: "Generation failed on fal.ai" };
}