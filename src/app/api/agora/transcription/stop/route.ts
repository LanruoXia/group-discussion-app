import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { builderToken, taskId } = await req.json();

    if (!builderToken || !taskId) {
      return NextResponse.json(
        { error: "Missing builderToken or taskId" },
        { status: 400 }
      );
    }

    const customerId = process.env.AGORA_CUSTOMER_ID!;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET!;
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const authorization = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");

    const stopUrl = `https://api.agora.io/v1/projects/${appId}/rtsc/speech-to-text/tasks/${taskId}?builderToken=${builderToken}`;

    console.log("🛑 Stopping transcription with:", { stopUrl });

    const response = await fetch(stopUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Failed to stop transcription:", data);
      return NextResponse.json({ error: "Failed to stop transcription", details: data }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: data.status });
  } catch (err) {
    console.error("❌ Unexpected error in stop:", err);
    return NextResponse.json({ error: "Unexpected error", details: err }, { status: 500 });
  }
}