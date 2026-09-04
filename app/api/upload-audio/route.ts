// app/api/upload-audio/route.ts
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save into public/uploads/audio/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "audio");
    await mkdir(uploadDir, { recursive: true });

    const fileExtension = file.name.split(".").pop() || "mp3";
    const fileName = `voice_${Date.now()}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    // Return the public web URL
    const publicUrl = `/uploads/audio/${fileName}`;
    return NextResponse.json({ success: true, audioUrl: publicUrl });
  } catch (error: any) {
    console.error("Audio upload failed:", error);
    return NextResponse.json({ error: "Failed to save audio file" }, { status: 500 });
  }
}