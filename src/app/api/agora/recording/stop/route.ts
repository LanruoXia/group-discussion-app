import { NextRequest, NextResponse } from "next/server";

const customerId = process.env.AGORA_CUSTOMER_ID!;
const customerSecret = process.env.AGORA_CUSTOMER_SECRET!;
const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const authorization = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");

export async function POST(req: NextRequest) {
  const { channelName, resourceId, sid } = await req.json();

  if (!channelName || !resourceId || !sid) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const stopRes = await fetch(
      `https://api.agora.io/v1/apps/${appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/individual/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cname: channelName,
          uid: "1", // 使用与启动录制时相同的 uid
          clientRequest: {},
        }),
      }
    );

    if (!stopRes.ok) {
      const errorData = await stopRes.json();
      console.error("Agora stop recording error:", errorData);
      return NextResponse.json(
        { error: "Failed to stop recording", details: errorData },
        { status: stopRes.status }
      );
    }

    const stopData = await stopRes.json();
    return NextResponse.json({
      success: true,
      sid: stopData.sid,
      fileList: stopData.serverResponse?.fileList || [],
    });
  } catch (error) {
    console.error("Error stopping recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
