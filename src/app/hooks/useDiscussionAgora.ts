// src/app/hooks/useDiscussionAgora.ts
import { useState, useEffect } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import protoRoot from "@/protobuf/SttMessage_es6.js";
import { supabase } from "../supabase";

// Word 类型
interface Word {
  text: string;
  isFinal: boolean;
}

// 字幕消息类型
interface TextMessage {
  uid: string;
  words: Word[];
}

export interface UseDiscussionAgoraReturn {
  localAudioTrack: ILocalAudioTrack | null;
  localVideoTrack: ILocalVideoTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  join: (channel: string, uid: string, sessionId: string) => Promise<void>;
  leave: () => Promise<void>;
  ready: boolean;
  captions: Array<{ uid: string; text: string }>;
}

export function useDiscussionAgora(): UseDiscussionAgoraReturn {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [ready, setReady] = useState(false);
  const [captions, setCaptions] = useState<Array<{ uid: string; text: string }>>([]);

  // Initialize Agora client
  useEffect(() => {
    const init = async () => {
      const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      
      // Handle user published events
      agoraClient.on("user-published", async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        if (mediaType === "video") {
          setRemoteUsers(prev => [...prev, user]);
        }
        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
      });

      // Handle user unpublished events
      agoraClient.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
        if (mediaType === "audio") {
          user.audioTrack?.stop();
        }
      });

      // Handle user left events
      agoraClient.on("user-left", (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });
      agoraClient.on("stream-message", (uid, buffer) => {
        console.log("📨 Received stream message from uid:", uid);
        console.log("Buffer length:", buffer.byteLength);
        
        try {
          const TextMessage = protoRoot.lookupType("Agora.SpeechToText.Text");
          console.log("Decoding message with TextMessage type");
          
          const message = TextMessage.decode(buffer) as TextMessage;
          console.log("Decoded message:", message);
          
          const words = message.words || [];
          console.log("Words array:", words);
          
          const finalText = words
            .filter((w: Word) => w.isFinal)
            .map((w: Word) => w.text)
            .join(" ");
          
          console.log("Final text:", finalText);
      
          if (finalText) {
            console.log("Adding caption:", { uid: String(message.uid), text: finalText });
            setCaptions((prev) => [...prev, { uid: String(message.uid), text: finalText }]);
          }
        } catch (err) {
          console.error("❌ Failed to decode protobuf stream message:", err);
          if (err instanceof Error) {
            console.error("Error details:", {
              name: err.name,
              message: err.message,
              stack: err.stack
            });
          }
        }
      });

      setClient(agoraClient);
      setReady(true);
    };

    init();

    // Cleanup function
    return () => {
      if (client) {
        client.removeAllListeners();
      }
    };
  }, []);

  // Join channel function
  const join = async (channel: string, uid: string, sessionId: string) => {
    if (!client) return;

    try {
      // Get token from server
      const res = await fetch(`/api/agora/token?channelName=${channel}&uid=${uid}`);
      const { token } = await res.json();
      
      if (!token) {
        throw new Error("Failed to get token");
      }

      // Join the channel with token
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
      await client.join(appId, channel, token, uid);


      // Create and publish local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      await client.publish([audioTrack, videoTrack]);

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);
    } catch (error) {
      console.error("Error joining channel:", error);
      throw error;
    }
  };

  // Leave channel function
  const leave = async () => {
    if (!client) return;

    // Stop and close local tracks
    localAudioTrack?.stop();
    localVideoTrack?.stop();
    localAudioTrack?.close();
    localVideoTrack?.close();

    // Leave the channel
    await client.leave();

    // Reset states
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
    setRemoteUsers([]);
  };

  return {
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    join,
    leave,
    ready,
    captions,
  };
} 