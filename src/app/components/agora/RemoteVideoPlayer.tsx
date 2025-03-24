// src/components/agora/RemoteVideoPlayer.tsx
"use client";

import { useEffect, useRef } from "react";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

export default function RemoteVideoPlayer({
  user,
}: {
  user: IAgoraRTCRemoteUser;
}) {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let retries = 0;
    const maxRetries = 10;

    // 尝试播放远程视频 / Try to play remote video
    const tryPlay = () => {
      if (videoRef.current && user.videoTrack) {
        try {
          console.log(`🎬 Playing remote video for user: ${user.uid}`);
          user.videoTrack.play(videoRef.current);
          console.log(`✅ Successfully playing: ${user.uid}`);
        } catch (err) {
          console.warn(`Playback failed attempt ${retries}: ${user.uid}`, err);
          if (++retries <= maxRetries) setTimeout(tryPlay, 500);
        }
      } else {
        if (++retries <= maxRetries) setTimeout(tryPlay, 500);
      }
    };

    tryPlay();

    return () => {
      retries = maxRetries; // 停止重试 / Stop retrying
    };
  }, [user.videoTrack, user.uid]);

  return (
    <div className="relative w-[320px] h-[240px] bg-black text-white rounded shadow">
      <div ref={videoRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-60 px-2 py-1 rounded">
        {user.uid}
      </div>
    </div>
  );
}
