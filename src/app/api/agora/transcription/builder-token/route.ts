// ✅ src/app/api/agora/transcription/builder-token/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { instanceId } = await req.json(); // 通常使用频道名作为唯一 ID

  if (!instanceId) {
    return NextResponse.json({ error: "Missing instanceId" }, { status: 400 });
  }

  const customerId = process.env.AGORA_CUSTOMER_ID!;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET!;
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const auth = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");

  const response = await fetch(
    `https://api.agora.io/v1/projects/${appId}/rtsc/speech-to-text/builderTokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ instanceId }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Failed to get builderToken:", data);
    return NextResponse.json({ error: "Failed to get builderToken", details: data }, { status: 500 });
  }

  console.log("✅ builderToken acquired:", data);

  return NextResponse.json({
    builderToken: data.tokenName,
    instanceId: data.instanceId,
  });
}