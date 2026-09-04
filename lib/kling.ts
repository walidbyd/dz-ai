// lib/kling.ts

const KLING_BASE_URL = "https://api.klingai.com";

/**
 * Returns the authorization header using your Kling API Key.
 */
function getKlingAuthHeader(): string {
  const apiKey = process.env.KLING_API_KEY || process.env.KLING_ACCESS_KEY;

  if (!apiKey) {
    throw new Error("Missing KLING_API_KEY in environment variables");
  }

  // Unified API key format (api-key-kling-...)
  if (apiKey.startsWith("api-key-kling-")) {
    return `Bearer ${apiKey}`;
  }

  // Fallback for legacy key + secret (JWT)
  const secretKey = process.env.KLING_SECRET_KEY;
  if (secretKey) {
    const jwt = require("jsonwebtoken");
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: apiKey,
      exp: now + 1800,
      nbf: now - 5,
    };
    const token = jwt.sign(payload, secretKey, {
      algorithm: "HS256",
      header: { alg: "HS256", typ: "JWT" },
    });
    return `Bearer ${token}`;
  }

  return `Bearer ${apiKey}`;
}

/**
 * Initiates an Image-to-Video generation task on Kling 2.6:
 * - Model: kling-v2-6
 * - Mode: std (Standard)
 * - Sound: off (Silent, no voice/AI audio generated)
 * - Format: 9:16 Vertical Reel
 */
export async function generateKlingUGCVideo(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const authHeader = getKlingAuthHeader();

  const response = await fetch(`${KLING_BASE_URL}/v1/videos/image2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      model_name: "kling-v2-6",
      mode: "std",
      sound: "off",
      image: imageUrl,
      prompt: prompt,
      cfg_scale: 0.5,
      duration: "5",
      aspect_ratio: "9:16",
    }),
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(`Kling Video Error: ${data.message || response.statusText}`);
  }

  return data.data.task_id;
}

/**
 * Initiates an audio lip-sync task for an existing video.
 */
export async function syncKlingLipSync(
  videoUrl: string,
  audioUrl: string
): Promise<string> {
  const authHeader = getKlingAuthHeader();

  const response = await fetch(`${KLING_BASE_URL}/v1/videos/lipsync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      video_url: videoUrl,
      audio_url: audioUrl,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(`Kling LipSync Error: ${data.message || response.statusText}`);
  }

  return data.data.task_id;
}

/**
 * Checks the status of an ongoing Kling task.
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
  const authHeader = getKlingAuthHeader();
  const endpoint = `${KLING_BASE_URL}/v1/videos/${type}/${taskId}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: authHeader,
    },
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(`Kling Query Error: ${data.message || response.statusText}`);
  }

  const taskStatus = data.data.task_status;
  if (taskStatus === "succeed") {
    const videoResult = data.data.task_result?.videos?.[0]?.url;
    return { status: "succeed", videoUrl: videoResult };
  }

  if (taskStatus === "failed") {
    return { status: "failed", error: data.data.task_status_msg || "Render failed" };
  }

  return { status: taskStatus };
}