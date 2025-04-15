// lib/agora/cloudRecording.ts
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

const customerId = process.env.AGORA_CUSTOMER_ID!;
const customerSecret = process.env.AGORA_CUSTOMER_SECRET!;
const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
const authorization = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");


// Acquire a resource ID from Agora Cloud Recording service
export async function acquireResourceId(session_code: string, uid: string): Promise<string> {
    try {
      // Send POST request to Agora Cloud Recording to acquire a resource ID
      const response = await fetch(`https://api.agora.io/v1/apps/${appId}/cloud_recording/acquire`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authorization}`,  // Basic authentication header
        },
        body: JSON.stringify({
          cname: session_code,  // Use the session code (cname) here
          uid: uid,    // Pass the uid dynamically
          clientRequest: {
            resourceExpiredHour: 24,  // Set resource expiration (max: 24 hours)
            scene: 0,  // Scene 0: Audio + Video recording, 1: Audio only
          },
        }),
      });
  
      // Parse the response from Agora API
      const data = await response.json();
  
      // Handle errors or unsuccessful response
      if (!data || !data.resourceId) {
        throw new Error("Failed to acquire resource ID");
      }
  
      // Return the acquired resourceId
      return data.resourceId;
    } catch (error) {
      console.error("❌ Error acquiring resource ID:", error);
      throw new Error("Failed to acquire resource ID");
    }
}

// Start composite recording (audio + video combined for all participants)
export async function startCompositeRecording(resourceId: string, session_code: string, uid: string) {
  try {
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      session_code,
      parseInt(uid),
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    const response = await fetch(
      `https://api.agora.io/v1/apps/${appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authorization}`,
        },
        body: JSON.stringify({
          uid,
          cname: session_code,
          clientRequest: {
            token,
            recordingConfig: {
              maxIdleTime: 600, // 10 minutes
              streamTypes: 2, // 2 = audio & video
              audioProfile: 1,
              channelType: 0, // 
              videoStreamType: 0, // 0 = high quality
              transcodingConfig: {
                width: 1280,          // 视频宽度
                height: 720,          // 视频高度
                fps: 15,              // 帧率
                bitrate: 1200,        // 比特率，适当调高以保证画质
                mixedVideoLayout: 1,  // 1 = adaptive layout，自动均匀分布
                backgroundColor: "#000000",  // 黑色背景
              }
              // subscribeVideoUids: ["#allstream#"], 
              // subscribeAudioUids: ["#allstream#"],
            },
            recordingFileConfig: {
              avFileType: ["hls","mp4"],
            },
            storageConfig: {
              vendor: parseInt(process.env.STORAGE_VENDOR!), 
              region: parseInt(process.env.STORAGE_REGION!), 
              bucket: process.env.STORAGE_BUCKET!,
              accessKey: process.env.STORAGE_ACCESS_KEY!,
              secretKey: process.env.STORAGE_SECRET_KEY!,
              fileNamePrefix: ["compositeRecordings", session_code]
            }
          }
        }),
      }
    );

    const data = await response.json();
    console.log("📦 Agora response from startCompositeRecording:", data); 
    if (!data || !data.sid) {
      throw new Error("Failed to start composite recording");
    }

    return {
      taskId: data.sid, 
      resourceId,
    };
  } catch (error) {
    console.error("❌ Error starting composite recording:", error);
    throw new Error("Failed to start composite recording");
  }
}

// Start individual recording (each user's audio/video separately)
export async function startIndividualRecording(resourceId: string, session_code: string, uid: string) {
  try {
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      session_code,
      parseInt(uid),
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    const response = await fetch(
      `https://api.agora.io/v1/apps/${appId}/cloud_recording/resourceid/${resourceId}/mode/individual/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authorization}`,
        },
        body: JSON.stringify({
          uid,
          cname: session_code,
          clientRequest: {
            token,
            recordingConfig: {
              maxIdleTime: 600, // 10 minutes
              streamTypes: 2, // 2 = audio & video
              streamMode: "standard",
              channelType: 1, // 1 = live broadcast mode (required for individual mode)
              videoStreamType: 0,
              subscribeVideoUids: ["#allstream#"], 
              subscribeAudioUids: ["#allstream#"],
              subscribeUidGroup: 1
            },
            storageConfig: {
              vendor: parseInt(process.env.STORAGE_VENDOR!),
              region: parseInt(process.env.STORAGE_REGION!),
              bucket: process.env.STORAGE_BUCKET!,
              accessKey: process.env.STORAGE_ACCESS_KEY!,
              secretKey: process.env.STORAGE_SECRET_KEY!,
              fileNamePrefix: ["individualRecordings", session_code]
            },
          },
        }),
      }
    );

    const data = await response.json();
    console.log("📦 Agora response from startIndividualRecording:", data);

    if (!data || !data.sid) {
      throw new Error("Failed to start individual recording");
    }

    return {
      taskId: data.sid,
      resourceId,
    };
  } catch (error) {
    console.error("❌ Error starting individual recording:", error);
    throw new Error("Failed to start individual recording");
  }
}


export async function stopCloudRecording({
  resourceId,
  sid,
  mode, 
  cname,
  uid,
}: {
  resourceId: string;
  sid: string;
  mode?: "mix" | "individual" | "web";
  cname: string; // 即 session_code
  uid: string;   // 同 start 时使用的 uid
}) {
  try {
    const stopUrl = `https://api.agora.io/v1/apps/${appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${mode}/stop`;
    console.log("📤 Sending stop request to Agora:", {
      stopUrl,
      body: {
        cname,
        uid,
        clientRequest: { async_stop: false },
      },
    });

    const response = await fetch(stopUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authorization}`,
      },
      body: JSON.stringify({
        cname,
        uid,
        clientRequest: {
          async_stop: false, // 若为 true 则后台异步处理（通常 false 即可）
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Failed to stop Cloud Recording:", data);
      throw new Error(data?.message || "Stop Cloud Recording failed");
    }

    console.log("🛑 Cloud Recording stopped:", data);
    return data;
  } catch (error) {
    console.error("❌ Error in stopCloudRecording:", error);
    throw error;
  }
}
