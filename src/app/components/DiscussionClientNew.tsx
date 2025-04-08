//src/app/components/DiscussionClientNew.tsx

"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useDiscussionAgora } from "../hooks/useDiscussionAgora";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { useMediaRecorder } from "../hooks/useMediaRecorder";

// 定义字幕记录的类型
interface CaptionEntry {
  speaker: string;
  text: string;
  timestamp: number;
  uid: string;
}

// Web Speech API 类型
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  readonly NONE: number;
  readonly SERVICE: number;
  readonly NETWORK: number;
  readonly NO_SPEECH: number;
  readonly NO_MICROPHONE: number;
  readonly AUDIO_CAPTURE: number;
  readonly ABORTED: number;
}

interface SpeechRecognitionError {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
}

// SpeechRecognition 构造函数接口
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// 精简标点符号函数，只保留英语处理
function addPunctuation(text: string): string {
  // 如果文本已经以标点符号结尾，则直接返回
  if (/[.!?]$/.test(text)) {
    return text;
  }

  // 英文标点规则
  if (/^(what|who|when|where|why|how|which)/i.test(text)) {
    return `${text}?`;
  } else if (
    /^(can|could|would|will|shall|should|may|might|must)/i.test(text)
  ) {
    return `${text}?`;
  } else if (/^(oh|wow|ah|ouch|hey|hi|hello|damn|no|yes)/i.test(text)) {
    return `${text}!`;
  } else {
    return `${text}.`;
  }
}

// 用于使用 useSearchParams 的组件
function DiscussionClientContent() {
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
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Web Speech API 相关状态
  const [recognition, setRecognition] =
    useState<SpeechRecognitionInstance | null>(null);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [segments, setSegments] = useState<
    {
      start: number;
      end: number;
      text: string;
      speaker: string;
    }[]
  >([]);

  // Initialize Agora client
  const {
    localVideoTrack,
    remoteUsers,
    leave: leaveChannel,
    join: joinChannel,
    ready: agoraReady,
  } = useDiscussionAgora();

  const { startRecording, stopRecording, recording } = useMediaRecorder(
    async (blob) => {
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      formData.append("speaker", displayName || "Unknown");

      const res = await fetch("/api/whisper-stt", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.transcript) {
        setSegments(result.transcript); // ✅ 保存 transcript
        console.log("📝 Transcribed:", result.transcript);
      }
    }
  );

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

      // 停止语音识别
      if (recognition) {
        recognition.stop();
      }

      // Leave Agora channel
      await leaveChannel();

      // Navigate back to home
      router.replace("/");
    } catch (err) {
      console.error("Error leaving discussion:", err);
      setError("Failed to leave discussion properly");
    }
  };

  // 使用 Web Speech API 开始字幕识别
  const startCaptions = () => {
    if (!displayName) return;

    try {
      // 检查浏览器支持
      if (
        !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
      ) {
        alert(
          "Your browser doesn't support speech recognition. Please use Chrome, Edge or Safari."
        );
        return;
      }

      // 创建语音识别实例
      const SpeechRecognition =
        (
          window as unknown as {
            SpeechRecognition: SpeechRecognitionConstructor;
          }
        ).SpeechRecognition ||
        (
          window as unknown as {
            webkitSpeechRecognition: SpeechRecognitionConstructor;
          }
        ).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      // 配置语音识别
      recognitionInstance.continuous = true; // 持续识别
      recognitionInstance.interimResults = true; // 返回中间结果
      recognitionInstance.lang = "en-US"; // 固定为英语

      // 处理识别结果
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1;
        const result = event.results[last];

        if (result.isFinal) {
          let finalText = result[0].transcript.trim();

          // 将首字母大写并添加标点符号
          if (finalText) {
            // 首字母大写
            finalText = finalText.charAt(0).toUpperCase() + finalText.slice(1);
            // 添加标点符号
            finalText = addPunctuation(finalText);

            console.log("🎤 Speech recognized (final):", finalText);

            // 创建新的字幕条目
            const newCaption: CaptionEntry = {
              speaker: displayName,
              text: finalText,
              timestamp: Date.now(),
              uid: uid || "unknown",
            };

            setCaptions((prev) => [...prev, newCaption]);

            // 滚动到底部
            if (transcriptRef.current) {
              transcriptRef.current.scrollTop =
                transcriptRef.current.scrollHeight;
            }
          }
        } else {
          // 可选：处理非最终结果
          console.log("🎤 Speech recognized (interim):", result[0].transcript);
        }
      };

      // 处理错误
      recognitionInstance.onerror = (event: SpeechRecognitionError) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          console.log("No speech detected");
        }
      };

      // 处理识别结束
      recognitionInstance.onend = () => {
        console.log("Speech recognition ended");
        // 如果仍然在转录模式，重新启动
        if (transcribing) {
          console.log("Restarting speech recognition...");
          recognitionInstance.start();
        }
      };

      // 启动识别
      recognitionInstance.start();
      console.log("🎙️ Started speech recognition");
      setRecognition(recognitionInstance);
      setTranscribing(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      alert("Failed to start speech recognition");
    }
  };

  // 停止字幕识别
  const stopCaptions = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setTranscribing(false);
    console.log("🛑 Stopped speech recognition");
  };

  // Handle window close/refresh
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      e.preventDefault();
      if (recognition) {
        recognition.stop();
      }
      await handleLeave();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (recognition) {
        recognition.stop();
      }
    };
  }, [sessionId, uid, recognition]);

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
          console.log(
            "🔄 Auto-joining Agora channel:",
            channel,
            "with UID:",
            uid
          );
          await joinChannel(channel, uid);
          console.log("✅ Successfully joined Agora channel!");
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

  // 确保在页面卸载前停止语音识别
  useEffect(() => {
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [recognition]);

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
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Leave Discussion
            </button>
            {!transcribing ? (
              <button
                onClick={startCaptions}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Caption
              </button>
            ) : (
              <button
                onClick={stopCaptions}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Stop Caption
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
                      console.log(`🎥 Playing video for user: ${user.uid}`);
                      try {
                        user.videoTrack?.play(el);
                      } catch (error) {
                        console.error(
                          `❌ Error playing video for user ${user.uid}:`,
                          error
                        );
                      }
                    }
                  }}
                />
              )}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {participants.find((p) => p.user_id === user.uid)
                  ?.display_name || "Unknown"}
                {!user.videoTrack && " (Video Off)"}
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
        <div>
          {!recording ? (
            <button
              onClick={startRecording}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              🎙️ Start Test Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              🛑 Stop & Transcribe
            </button>
          )}
          <div className="bg-white rounded-lg p-4 shadow">
            {segments.map((seg, index) => (
              <div key={index} className="mb-2 text-sm">
                <span className="text-blue-600 font-semibold">
                  {seg.speaker}
                </span>{" "}
                <span className="text-gray-400">
                  [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]
                </span>
                : <span className="text-gray-800">{seg.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 字幕区域 */}
        {transcribing && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Live Captions</h2>
            <div
              ref={transcriptRef}
              className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm bg-white p-4 rounded-lg shadow-sm border border-gray-200"
            >
              {captions.length > 0 ? (
                captions.map((caption, index) => (
                  <div key={index} className="mb-2">
                    <span className="font-bold text-blue-600">
                      {caption.speaker}:{" "}
                    </span>
                    <span className="text-gray-800">{caption.text}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(caption.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">
                  Start speaking to see captions appear here...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 导出带有 Suspense 的组件
export default function DiscussionClient() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <DiscussionClientContent />
    </Suspense>
  );
}
