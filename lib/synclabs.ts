// lib/synclabs.ts

const SYNC_LABS_BASE_URL = "https://api.synclabs.so/lipsync";

interface SubmitSyncParams {
  videoUrl: string;
  audioUrl: string;
  synergize?: boolean; // Boosts quality and facial realism
}

/**
 * Submits a silent MP4 video and an MP3 audio track to Sync Labs for lip-syncing.
 * Returns the job ID to monitor.
 */
export async function submitLipSyncJob({
  videoUrl,
  audioUrl,
  synergize = true,
}: SubmitSyncParams): Promise<{ jobId: string }> {
  const apiKey = process.env.SYNC_LABS_API_KEY;
  if (!apiKey) {
    throw new Error("SYNC_LABS_API_KEY is missing from environment variables.");
  }

  const response = await fetch(SYNC_LABS_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      videoUrl,
      audioUrl,
      synergize,
      model: "sync-1.6.0", // Current standard lip-sync model
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to submit lip-sync job to Sync Labs.");
  }

  return { jobId: data.id };
}

/**
 * Checks the status of a submitted lip-sync render.
 */
export async function getLipSyncJobStatus(jobId: string): Promise<{
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  videoUrl?: string;
  error?: string;
}> {
  const apiKey = process.env.SYNC_LABS_API_KEY;
  if (!apiKey) {
    throw new Error("SYNC_LABS_API_KEY is missing from environment variables.");
  }

  const response = await fetch(`${SYNC_LABS_BASE_URL}/${jobId}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch Sync Labs job status.");
  }

  // Map Sync Labs statuses to our internal schema status
  let status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" = "PROCESSING";

  if (data.status === "COMPLETED") {
    status = "COMPLETED";
  } else if (data.status === "FAILED" || data.status === "REJECTED") {
    status = "FAILED";
  } else if (data.status === "PENDING") {
    status = "PENDING";
  }

  return {
    status,
    videoUrl: data.url,
    error: data.error,
  };
}