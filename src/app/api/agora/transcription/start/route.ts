// ✅ src/app/api/agora/transcription/start/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { builderToken, channelName, subBotToken, pubBotToken } = await req.json();

    if (!builderToken || !channelName || !subBotToken || !pubBotToken) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const customerId = process.env.AGORA_CUSTOMER_ID!;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET!;
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const authorization = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");

    // ✅ Construct Agora request
    const response = await fetch(
      `https://api.agora.io/v1/projects/${appId}/rtsc/speech-to-text/tasks?builderToken=${builderToken}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          languages: ["en-US"],
          maxIdleTime: 60,
          rtcConfig: {
            channelName,
            subBotUid: "2001",
            subBotToken,
            pubBotUid: "2002",
            pubBotToken,
            config: {
              "features": {
                "stream": {
                  "enable_streaming": true,
                  "streaming_send_stream_message": true
                }
              }
            }
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to start transcription:", data);
      return NextResponse.json(
        { error: "Failed to start transcription", details: data },
        { status: 500 }
      );
    }

    console.log("Transcription started:", data);

    return NextResponse.json({
      success: true,
      taskId: data.taskId,
      status: data.status,
    });
  } catch (err) {
    console.error("Unexpected error in /transcription/start:", err);
    return NextResponse.json({ error: "Unexpected error", details: err }, { status: 500 });
  }
}