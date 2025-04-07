//已暂时停用：Agora Transcription 难以配置，且无法正常显示字幕，现在使用的是 DiscussionClientNew.ts
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useDiscussionAgora } from "../hooks/useDiscussionAgora-backup";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

export default function DiscussionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const channel = searchParams.get("channel");
  const uid = searchParams.get("uid");
  const displayName = searchParams.get("displayName");
  const autoJoin = true; // Always auto-join

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Initialize Agora client
  const {
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    leave: leaveChannel,
    join: joinChannel,
    ready: agoraReady,
    captions,
  } = useDiscussionAgora();

  const [participants, setParticipants] = useState<
    Array<{
      user_id: string;
      display_name: string;
      is_ai: boolean;
    }>
  >([]);

  // Handle leaving the discussion
  const handleLeave = async () => {
    try {
      if (!sessionId || !uid) return;

      // Leave Agora channel
      await leaveChannel();

      // Navigate back to home
      router.replace("/");
    } catch (err) {
      console.error("Error leaving discussion:", err);
      setError("Failed to leave discussion properly");
    }
  };
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [builderToken, setBuilderToken] = useState<string | null>(null);

  const startTranscription = async () => {
    if (!channel) return;

    // 1. 获取 builderToken
    const tokenRes = await fetch("/api/agora/transcription/builder-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId: channel }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.builderToken) {
      console.error("Failed to get builderToken:", tokenData);
      return;
    }

    setBuilderToken(tokenData.builderToken);

    // 2. 获取 subBot (2001) 和 pubBot (2002) 的 RTC Token
    const getRtcToken = async (uid: string) => {
      const res = await fetch(
        `/api/agora/token?channelName=${channel}&uid=${uid}`
      );
      const data = await res.json();
      if (!res.ok || !data.token)
        throw new Error(`Failed to fetch token for uid ${uid}`);
      return data.token;
    };

    let subToken, pubToken;
    try {
      subToken = await getRtcToken("2001");
      pubToken = await getRtcToken("2002");
    } catch (err) {
      console.error("Error getting RTC tokens for bots:", err);
      return;
    }

    // 3. 启动转录服务
    const startRes = await fetch("/api/agora/transcription/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        builderToken: tokenData.builderToken,
        channelName: channel,
        subBotToken: subToken,
        pubBotToken: pubToken,
      }),
    });

    const startData = await startRes.json();
    if (!startRes.ok || !startData.taskId) {
      console.error("Failed to start transcription:", startData);
      return;
    }

    console.log("Transcription started:", startData);
    setTaskId(startData.taskId);
    setTranscribing(true);
  };

  const stopTranscription = async () => {
    if (!builderToken || !taskId) {
      alert("Missing transcription parameters");
      return;
    }

    // ✅ Step 1: 先检查任务状态
    const statusRes = await fetch("/api/agora/transcription/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        builderToken,
        taskId,
      }),
    });

    const statusData = await statusRes.json();

    if (!statusRes.ok || !statusData.status) {
      console.error("❌ Failed to query transcription status:", statusData);
      alert("查询转录状态失败，无法停止！");
      return;
    }

    console.log("🎯 Transcription status is:", statusData.status);

    // ✅ Step 2: 仅当状态为 STARTED 或 IN_PROGRESS 时才允许停止
    if (!["STARTED", "IN_PROGRESS"].includes(statusData.status)) {
      alert(`当前转录状态为 ${statusData.status}，无法停止任务`);
      return;
    }

    // ✅ Step 3: 正式调用 stop 接口
    console.log("🛑 Stopping transcription with:", { builderToken, taskId });

    const res = await fetch("/api/agora/transcription/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        builderToken,
        taskId,
      }),
    });

    const result = await res.json();
    if (result.success) {
      console.log("✅ Transcription stopped:", result.status);
      alert("字幕生成已完成！");
    } else {
      console.error("❌ Failed to stop transcription:", result);
      alert("停止转录失败，请检查控制台");
    }

    setTranscribing(false);
  };

  // Handle window close/refresh
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      e.preventDefault();
      await handleLeave();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionId, uid]);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (!channel || !uid) {
          setError("Missing required parameters");
          return;
        }

        // Get session ID from channel code
        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .select("id")
          .eq("session_code", channel)
          .single();

        if (sessionError || !session) {
          setError("Session not found");
          return;
        }

        setSessionId(session.id);

        // Auto-join if specified
        if (autoJoin && agoraReady) {
          await joinChannel(channel, uid);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error initializing session:", err);
        setError("Failed to initialize session");
      }
    };

    initializeSession();
  }, [channel, uid, autoJoin, agoraReady]);

  // Fetch participants including AI
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!sessionId) return;

      const { data, error } = await supabase
        .from("participants")
        .select("user_id, is_ai")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching participants:", error);
        return;
      }

      // Assign display names (A, B, C, D) to participants
      const displayNames = ["A", "B", "C", "D"];
      const participantsWithNames = data.map((participant, index) => ({
        ...participant,
        user_id: participant.user_id || `ai-${index}`,
        display_name: displayNames[index] || "Unknown",
      }));

      setParticipants(participantsWithNames);
    };

    fetchParticipants();
  }, [sessionId, supabase]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Joining discussion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Discussion Room</h1>
          <div className="space-x-2">
            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Leave Discussion
            </button>
            {!transcribing ? (
              <button
                onClick={startTranscription}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Transcribe
              </button>
            ) : (
              <button
                onClick={stopTranscription}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Stop Transcribe
              </button>
            )}
          </div>
        </div>

        {/* Participants list */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Participants</h2>
          <div className="flex flex-wrap gap-4">
            {participants.map((participant) => (
              <div
                key={participant.user_id}
                className="flex items-center bg-white rounded-lg p-3 shadow-sm"
              >
                {participant.is_ai ? (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
                <span className="text-gray-700">
                  {participant.display_name}
                  {participant.is_ai && " (AI)"}
                  {participant.user_id === uid && " (You)"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Local video */}
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
            {localVideoTrack && (
              <div
                className="w-full h-full"
                ref={(el) => {
                  if (el) {
                    localVideoTrack.play(el);
                  }
                }}
              />
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {displayName} (You)
            </div>
          </div>

          {/* Remote videos */}
          {remoteUsers.map((user: IAgoraRTCRemoteUser) => (
            <div
              key={user.uid}
              className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative"
            >
              {user.videoTrack && (
                <div
                  className="w-full h-full"
                  ref={(el) => {
                    if (el) {
                      user.videoTrack?.play(el);
                    }
                  }}
                />
              )}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {participants.find((p) => p.user_id === user.uid)
                  ?.display_name || "Unknown"}
              </div>
            </div>
          ))}

          {/* AI Participants (static icons) */}
          {participants
            .filter((p) => p.is_ai)
            .map((ai) => (
              <div
                key={ai.user_id}
                className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-12 h-12 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="text-white text-lg font-medium">
                    {ai.display_name} (AI)
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
      {transcribing && (
        <div
          ref={transcriptRef}
          className="h-40 overflow-y-auto whitespace-pre-wrap font-mono text-sm bg-gray-100 p-2 rounded border border-gray-300"
        >
          {captions.map((line, index) => {
            const speaker =
              participants.find((p) => p.user_id === line.uid)?.display_name ||
              "Unknown";
            return (
              <div key={index}>
                <strong>{speaker}:</strong> {line.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
