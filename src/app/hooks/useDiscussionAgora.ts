import { useState, useEffect, useCallback } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

export const useDiscussionAgora = (appId: string, channel: string, uid: string) => {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  useEffect(() => {
    const rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    setClient(rtcClient);

    return () => {
      rtcClient.leave();
    };
  }, []);

  // Handle user published events
  const handleUserPublished = useCallback(async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    if (!client) return;
    await client.subscribe(user, mediaType);
    
    if (mediaType === 'video') {
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
    }
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
  }, [client]);

  // Handle user unpublished events
  const handleUserUnpublished = useCallback((user: IAgoraRTCRemoteUser) => {
    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!client) return;

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserUnpublished);

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserUnpublished);
    };
  }, [client, handleUserPublished, handleUserUnpublished]);

  // Join channel and create local tracks
  const join = useCallback(async () => {
    if (!client || !appId || !channel) {
      setError('Missing required parameters');
      return;
    }

    try {
      await client.join(appId, channel, null, uid);
      
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);
      
      await client.publish([audioTrack, videoTrack]);
      setJoined(true);
    } catch (err: any) {
      setError(err.message || 'Failed to join channel');
      console.error('Error joining channel:', err);
    }
  }, [client, appId, channel, uid]);

  // Leave channel and cleanup
  const leave = useCallback(async () => {
    if (localAudioTrack) {
      localAudioTrack.close();
      setLocalAudioTrack(null);
    }
    if (localVideoTrack) {
      localVideoTrack.close();
      setLocalVideoTrack(null);
    }
    if (client) {
      await client.leave();
      setJoined(false);
      setRemoteUsers([]);
    }
  }, [client, localAudioTrack, localVideoTrack]);

  return {
    client,
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    joined,
    error,
    join,
    leave
  };
}; 