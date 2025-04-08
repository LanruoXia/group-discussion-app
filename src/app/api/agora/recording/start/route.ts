// src/app/api/agora/recording/start/route.ts

import { NextRequest, NextResponse } from "next/server";
// import { headers } from "next/headers";

const customerId = process.env.AGORA_CUSTOMER_ID!;
const customerSecret = process.env.AGORA_CUSTOMER_SECRET!;
const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const authorization = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");
const REGION = 3; // e.g. Asia (based on S3 region)
const VENDOR = 2; // 2 = Amazon S3

export async function POST(req: NextRequest) {
  const { channelName, uid, token } = await req.json();

  const acquireRes = await fetch(
    `https://api.agora.io/v1/apps/${appId}/cloud_recording/acquire`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cname: channelName,
        uid,
        clientRequest: {
          resourceExpiredHour: 24,
          "scene": 0
        },
      }),
    }
  );

  const acquireData = await acquireRes.json();
  const resourceId = acquireData.resourceId;

  const startRes = await fetch(
    `https://api.agora.io/v1/apps/${appId}/cloud_recording/resourceid/${resourceId}/mode/individual/start`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cname: channelName,
        uid,
        clientRequest: {
          token,
          recordingConfig: {
            maxIdleTime: 60,
            streamTypes: 0, // audio only
            channelType: 0,
            streamMode: "standard",
            subscribeAudioUids: ["#allstream#"],
            subscribeUidGroup: 0
          },
          storageConfig: {
            vendor: VENDOR,
            region: REGION,
            bucket: process.env.S3_BUCKET_NAME,
            accessKey: process.env.S3_ACCESS_KEY,
            secretKey: process.env.S3_SECRET_KEY,
            fileNamePrefix: ["recordings", channelName],
          },
        },
      }),
    }
  );

  const startData = await startRes.json();
  return NextResponse.json({
    resourceId,
    sid: startData.sid,
    fileList: startData.serverResponse?.fileList || [],
  });
}
