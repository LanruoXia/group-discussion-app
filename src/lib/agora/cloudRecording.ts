// lib/agora/cloudRecording.ts

import { NextResponse } from "next/server";

// Acquire a resource ID from Agora Cloud Recording service
export async function acquireResourceId(session_id: string): Promise<string> {
  try {
    const response = await fetch("https://api.agora.io/v1/apps/your_app_id/cloud_recording/acquire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.AGORA_AUTH}`,
      },
      body: JSON.stringify({
        cname: session_id,  // Use the session_id or channel name here
        uid: "unique_uid",  // You can generate or pass a unique user ID here
        clientRequest: {
          resourceExpiredHour: 24,  // Set resource expiration (max: 24 hours)
          scene: 0,  // Scene 0: Audio + Video recording, 1: Audio only
        },
      }),
    });

    const data = await response.json();
    if (!data || !data.resourceId) {
      throw new Error("Failed to acquire resource ID");
    }
    return data.resourceId;
  } catch (error) {
    console.error("❌ Error acquiring resource ID:", error);
    throw new Error("Failed to acquire resource ID");
  }
}

// Start individual recording for a user
export async function startIndividualRecording(resourceId: string, session_id: string) {
  try {
    const response = await fetch("https://api.agora.io/v1/apps/your_app_id/cloud_recording/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.AGORA_AUTH}`,
      },
      body: JSON.stringify({
        resourceId,
        clientRequest: {
          cname: session_id,
          recordingConfig: {
            avStreamType: 0,  // 0: High quality (audio + video)
            channelType: 1,   // 1: Live broadcast mode
          },
          recordingFileConfig: {
            avFileType: ["mp4", "aac"],  // MP4 for video, AAC for audio
          },
        },
      }),
    });

    const data = await response.json();
    if (!data || !data.taskId) {
      throw new Error("Failed to start individual recording");
    }
    return data;
  } catch (error) {
    console.error("❌ Error starting individual recording:", error);
    throw new Error("Failed to start individual recording");
  }
}

// Start composite recording (audio + video combined for all participants)
export async function startCompositeRecording(resourceId: string, session_id: string) {
  try {
    const response = await fetch("https://api.agora.io/v1/apps/your_app_id/cloud_recording/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.AGORA_AUTH}`,
      },
      body: JSON.stringify({
        resourceId,
        clientRequest: {
          cname: session_id,
          recordingConfig: {
            avStreamType: 1,  // 1: Composite stream (combined audio + video)
            channelType: 1,   // 1: Live broadcast mode
          },
          recordingFileConfig: {
            avFileType: ["mp4", "aac"],  // MP4 for video, AAC for audio
          },
        },
      }),
    });

    const data = await response.json();
    if (!data || !data.taskId) {
      throw new Error("Failed to start composite recording");
    }
    return data;
  } catch (error) {
    console.error("❌ Error starting composite recording:", error);
    throw new Error("Failed to start composite recording");
  }
}