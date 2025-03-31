'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
} from 'agora-rtc-sdk-ng';

export function useAgora(appId: string, channel: string, uid: string) {
  console.log("✅ [useAgora] Initialized for user:", uid, "Channel:", channel);

  const [client] = useState<IAgoraRTCClient>(() =>
    AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
  );
  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const localRef = useRef<HTMLDivElement | null>(null);

  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);

  const saveTranscript = async (transcript: string) => {
    try {
      const response = await fetch('/api/transcript/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          uid,
          transcript,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save transcript');
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  /**
   * ✅ 使用 useCallback 包装函数
   * 保证函数在组件未重新创建时引用不会变，从而避免不必要的 useEffect 执行
   */
  const subscribeUser = useCallback(
    async (user: IAgoraRTCRemoteUser) => {
      if (user.hasVideo) {
        await client.subscribe(user, 'video').catch(console.warn);
      }
      if (user.hasAudio) {
        await client.subscribe(user, 'audio').catch(console.warn);
        user.audioTrack?.play();
      }

      setRemoteUsers((prev) => {
        if (prev.find((u) => u.uid === user.uid)) return prev;
        return [...prev, user];
      });
    },
    [client] // ✅ 依赖项：client（只要它不变，函数就不会变）
  );

  const join = useCallback(async () => {
    if (joined || client.connectionState !== 'DISCONNECTED') return;

    const res = await fetch(`/api/agora/token?channelName=${channel}&uid=${uid}`);
    const { token } = await res.json();

    await client.join(appId, channel, token, uid);

    localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
    localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
    await client.publish([localAudioTrack.current, localVideoTrack.current]);

    setJoined(true);

    setTimeout(() => {
      if (localRef.current && localVideoTrack.current) {
        localVideoTrack.current.play(localRef.current);
      }
    }, 100);

    client.remoteUsers.forEach(subscribeUser);

    fetch('/api/agora/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, channelName: channel, action: 'join' }),
    }).then(() => {
      console.log("👋 [JOIN] reported");
    }).catch(console.error);
  }, [appId, channel, client, joined, subscribeUser, uid]);

  const leave = useCallback(async () => {
    if (!joined) return;

    localAudioTrack.current?.close();
    localVideoTrack.current?.close();
    await client.leave();

    // 获取转录内容并保存
    const transcriptElement = document.querySelector('.transcript-content');
    if (transcriptElement) {
      const transcript = transcriptElement.textContent || '';
      await saveTranscript(transcript);
    }

    fetch('/api/agora/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, channelName: channel, action: 'leave' }),
    }).then(() => {
      console.log("✅ [LEAVE] reported");
    }).catch(console.error);

    setRemoteUsers([]);
    setJoined(false);
  }, [channel, client, joined, uid]);

  useEffect(() => {
    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
    ) => {
      await subscribeUser(user);
      console.log("👥 Subscribed:", client.remoteUsers.map(u => u.uid));
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);

    window.addEventListener('beforeunload', leave);

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      window.removeEventListener('beforeunload', leave);
    };
  }, [client, leave, subscribeUser]); // ✅ 已完整列出依赖项

  return {
    joined,
    remoteUsers,
    join,
    leave,
    localRef,
  };
}