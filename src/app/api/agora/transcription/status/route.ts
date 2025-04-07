// src/app/api/agora/transcription/status/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { builderToken, taskId } = await req.json();

  if (!builderToken || !taskId) {
    return NextResponse.json({ error: "Missing builderToken or taskId" }, { status: 400 });
  }

  const customerId = process.env.AGORA_CUSTOMER_ID!;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET!;
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const authorization = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");
  const queryUrl = `https://api.agora.io/v1/projects/${appId}/rtsc/speech-to-text/tasks/${taskId}?builderToken=${builderToken}`;

  console.log("🔍 Querying transcription status with:", { queryUrl });

  // 尝试最多 5 次查询，每次间隔 1 秒
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        taskId: data.taskId,
        status: data.status,
        createTs: data.createTs,
      });
    }

    console.warn(`⚠️ Attempt ${attempt}: Task not found`, data.message || data);

    // 如果不是最后一次尝试，等待 1 秒再试
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      return NextResponse.json(
        { error: "Failed to query transcription status", details: data },
        { status: 500 }
      );
    }
  }
}