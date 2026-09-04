// lib/storage.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Ensures bucket exists and uploads audio buffer to Supabase Storage
 */
export async function uploadAudioBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const bucketName = "audio-assets";

  // 1. Verify / Create Bucket
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  
  if (listError) {
    console.error("⚠️ Failed to list Supabase buckets:", listError.message);
  } else {
    const bucketExists = buckets?.some((b) => b.name === bucketName);
    if (!bucketExists) {
      console.log(`📦 Creating missing public bucket: "${bucketName}"...`);
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
      });
      if (createError && !createError.message.includes("already exists")) {
        console.error("❌ Bucket creation error:", createError.message);
      } else {
        console.log(`✅ Bucket "${bucketName}" created successfully!`);
      }
    }
  }

  // 2. Upload file
  const filePath = `renders/${Date.now()}_${filename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("❌ Supabase upload error:", uploadError.message);
    throw new Error(`Supabase Storage failed: ${uploadError.message}`);
  }

  // 3. Get Public URL
  const { data } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL from Supabase Storage");
  }

  console.log("✅ Audio successfully hosted on Supabase:", data.publicUrl);
  return data.publicUrl;
}