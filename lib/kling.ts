import { fal } from "@fal-ai/client";

export async function generateKlingUGCVideo(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const result: any = await fal.subscribe("fal-ai/kling-video/v2.6/pro/image-to-video", {
    input: {
      prompt,
      image_url: imageUrl,
      duration: "5",
      aspect_ratio: "9:16",
    },
  });

  return result.data?.video?.url;
}