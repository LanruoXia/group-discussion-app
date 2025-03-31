"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useAgora } from "../hooks/useAgora";
import RemoteVideoPlayer from "../components/agora/RemoteVideoPlayer";
import { useState, useEffect } from "react";

export default function VideoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channel = searchParams.get("channel") || "default-room";
  const uid = searchParams.get("uid");
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const current = event.resultIndex;
          const result = event.results[current];
          if (result.isFinal) {
            const newTranscript = result[0].transcript;
            console.log('New transcript segment:', newTranscript);
            setTranscript((prev) => prev + " " + newTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
        };

        setRecognition(recognition);
      }
    }
  }, []);

  const startTranscribing = () => {
    if (recognition) {
      recognition.start();
      setIsTranscribing(true);
    }
  };

  const stopTranscribing = () => {
    if (recognition) {
      recognition.stop();
      setIsTranscribing(false);
    }
  };

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const { joined, remoteUsers, join, leave, localRef } = useAgora(
    appId,
    channel,
    uid || ""
  );

  const handleEndSession = async () => {
    try {
      if (!transcript.trim()) {
        console.error('No transcript content to save');
        return;
      }

      // 从 sessionStorage 获取 session_id
      const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}`;
      console.log('Saving transcript:', {
        contentLength: transcript.length,
        isTranscribing,
        sessionId
      });

      const response = await fetch('/api/transcript/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: transcript,
          session_id: sessionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save transcript:', errorData);
        throw new Error(errorData.error || 'Failed to save transcript');
      }

      const data = await response.json();
      console.log('Transcript saved successfully:', data);

      // 重定向到评估页面
      router.push('/evaluate');
    } catch (error) {
      console.error('Error in handleEndSession:', error);
      alert('保存转录内容失败，请重试');
    }
  };

  if (!uid) {
    if (typeof window !== "undefined") {
      alert("Please login first.");
      window.location.href = "/auth";
    }
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Agora Video Call</h1>
      <p className="mb-4 text-gray-500">
        Channel: <strong>{channel}</strong>
      </p>

      <div className="space-x-4 mb-4">
        {!joined ? (
          <button
            onClick={join}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Join
          </button>
        ) : (
          <>
            <button
              onClick={leave}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Leave
            </button>
            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              End Session
            </button>
          </>
        )}
        {joined && (
          <button
            onClick={isTranscribing ? stopTranscribing : startTranscribing}
            className={`px-4 py-2 rounded ${
              isTranscribing
                ? "bg-red-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {isTranscribing ? "Stop Transcription" : "Start Transcription"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {joined && (
          <div className="relative w-[320px] h-[240px] bg-black text-white">
            <div ref={localRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-60 px-2 py-1 rounded">
              You: {uid}
            </div>
          </div>
        )}

        {remoteUsers.map((user) => (
          <RemoteVideoPlayer key={user.uid} user={user} />
        ))}
      </div>

      {isTranscribing && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Live Transcription</h2>
          <div className="h-40 overflow-y-auto p-2 bg-white rounded transcript-content">
            {transcript}
          </div>
        </div>
      )}
    </div>
  );
}
