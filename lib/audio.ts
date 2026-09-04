// lib/audio.ts
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Generates Foley sound effects using ElevenLabs Sound Generation API
 * Query parameter output_format=mp3_44100_128 ensures clean browser decoding
 */
export async function generateElevenLabsSFX(
  prompt: string,
  durationSeconds: number = 4
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing in .env.local");
  }

  // Sanitize prompt: remove Arabic characters and broken prefix slices
  let cleanPrompt = prompt
    .replace(/[\u0600-\u06FF]/g, "")
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/_en/gi, "")
    .trim();

  if (cleanPrompt.length < 5) {
    cleanPrompt = "Snack bag opening with a loud plastic tear, followed by loud potato chips crunching";
  }

  console.log("-----------------------------------------");
  console.log("🔊 ElevenLabs SFX Generating...");
  console.log("👉 Cleaned Prompt:", cleanPrompt);

  const url = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text: cleanPrompt,
      duration_seconds: durationSeconds,
      prompt_influence: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ ElevenLabs SFX Error HTTP ${response.status}:`, errorText);
    throw new Error(`ElevenLabs SFX Error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`✅ ElevenLabs SFX Success! (${buffer.length} bytes)`);
  console.log("-----------------------------------------");
  return buffer;
}

/**
 * Mixes voice and SFX using FFmpeg (used during final video render)
 */
export async function mixVoiceAndSFX(
  voiceBuffer: Buffer,
  sfxBuffer: Buffer
): Promise<Buffer> {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execPromise = promisify(exec);

  const timestamp = Date.now();
  const tmpDir = os.tmpdir();

  const voiceFile = path.join(tmpDir, `v_${timestamp}.mp3`);
  const sfxFile = path.join(tmpDir, `s_${timestamp}.mp3`);
  const mixedFile = path.join(tmpDir, `mix_${timestamp}.mp3`);

  fs.writeFileSync(voiceFile, voiceBuffer);
  fs.writeFileSync(sfxFile, sfxBuffer);

  const vNorm = voiceFile.replace(/\\/g, "/");
  const sNorm = sfxFile.replace(/\\/g, "/");
  const mNorm = mixedFile.replace(/\\/g, "/");

  try {
    const cmd = `ffmpeg -y -i "${vNorm}" -i "${sNorm}" -filter_complex "[1:a]volume=1.5[sfx];[0:a]volume=1.0[voice];[voice][sfx]amix=inputs=2:duration=first:dropout_transition=0:normalize=0" -c:a libmp3lame -b:a 192k "${mNorm}"`;
    await execPromise(cmd);
    return fs.readFileSync(mixedFile);
  } finally {
    [voiceFile, sfxFile, mixedFile].forEach((f) => {
      if (fs.existsSync(/*turbopackIgnore: true*/ f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    });
  }
}