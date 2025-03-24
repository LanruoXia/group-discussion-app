// src/lib/agora.ts
import AgoraRTC, {
    IAgoraRTCClient,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
    IRemoteVideoTrack,
    IRemoteAudioTrack,
    IAgoraRTCRemoteUser,
  } from "agora-rtc-sdk-ng";
  
  export let client: IAgoraRTCClient;
  export let localAudioTrack: IMicrophoneAudioTrack | null = null;
  export let localVideoTrack: ICameraVideoTrack | null = null;
  
  export function initializeClient() {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    return client;
  }
  
  export async function joinChannel({
    appId,
    channel,
    token,
    uid,
    onUserPublished,
    onUserUnpublished,
  }: {
    appId: string;
    channel: string;
    token: string | null;
    uid: string | number;
    onUserPublished: (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => void;
    onUserUnpublished: (user: IAgoraRTCRemoteUser) => void;
  }) {
    await client.join(appId, channel, token, uid);
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    await client.publish([localAudioTrack, localVideoTrack]);
  
    client.on("user-published", onUserPublished);
    client.on("user-unpublished", onUserUnpublished);
  }
  
  export async function leaveChannel() {
    if (localAudioTrack) localAudioTrack.close();
    if (localVideoTrack) localVideoTrack.close();
    await client.leave();
  }