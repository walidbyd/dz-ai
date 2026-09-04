// app/api/lipsync/[jobId]/route.ts
import { NextResponse } from "next/server";
import { getLipSyncJobStatus } from "@/lib/synclabs";

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const statusData = await getLipSyncJobStatus(jobId);

    return NextResponse.json({
      success: true,
      ...statusData,
    });
  } catch (error: any) {
    console.error("LipSync Polling Error:", error);
    return NextResponse.json({ error: error.message || "Polling failed" }, { status: 500 });
  }
}