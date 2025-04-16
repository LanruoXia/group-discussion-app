"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../supabase";
import Link from "next/link";

// Type definition for session status and related data
type SessionStatus = {
  id: string;
  status:
    | "waiting"
    | "preparation"
    | "ready"
    | "discussion"
    | "evaluation"
    | "completed"
    | "expired";
  test_topic: string;
  instructions: string | null;
  created_at: string;
  session_code: string;
  preparation_start_time: string | null;
};

// Wrapped component for useSearchParams
function PreparationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  // State management for session data and UI
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(
    null
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes preparation time
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState<string | null>(null);

  // Effect to disable navigation and prevent page refresh during preparation
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      nav, nav *, header, header * {
        pointer-events: none !important;
        opacity: 0.5 !important;
      }
    `;
    document.head.appendChild(style);

    // Prevent accidental page refresh or navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function to remove styles and event listener
    return () => {
      document.head.removeChild(style);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Function to fetch session status and initialize preparation time
  const fetchSessionStatus = async () => {
    if (!code) return;

    // Fetch session data from Supabase
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_code", code)
      .single();

    if (error || !data) {
      setError("Session not found");
      setLoading(false);
      return;
    }

    // Validate session status
    if (data.status !== "preparation") {
      setError(`Invalid session status: ${data.status}`);
      setLoading(false);
      return;
    }

    let current = data;

    // Initialize preparation start time if not set
    if (!current.preparation_start_time) {
      const now = new Date().toISOString();
      await supabase
        .from("sessions")
        .update({ preparation_start_time: now })
        .eq("id", current.id);
      const refreshed = await supabase
        .from("sessions")
        .select("*")
        .eq("id", current.id)
        .single();
      if (refreshed.data) current = refreshed.data;
    }

    // Calculate remaining preparation time
    const elapsed = Math.floor(
      (Date.now() - new Date(current.preparation_start_time).getTime()) / 1000
    );
    const remaining = Math.max(600 - elapsed, 0);
    setSessionStatus(current);
    // 获取对应的 prompt 内容
    const { data: promptData, error: promptError } = await supabase
      .from("prompt")
      .select("content")
      .eq("test_topic", current.test_topic)
      .maybeSingle();

    if (promptError) {
      console.warn("⚠️ Failed to fetch prompt content:", promptError.message);
    } else {
      setPromptContent(promptData?.content ?? null);
    }
    setTimeRemaining(remaining);
    setLoading(false);

    // Automatically transition to ready state if time is up
    if (remaining <= 0) {
      broadcastReady(current.id);
    }

    return remaining;
  };

  // Function to broadcast ready status and transition to discussion
  const broadcastReady = async (sessionId: string) => {
    // Subscribe to the channel for status updates
    await supabase.channel(`session_status_${code}`).subscribe();
    // Broadcast status change to all participants
    await supabase.channel(`session_status_${code}`).send({
      type: "broadcast",
      event: "status_change",
      payload: { status: "ready" },
    });
    // Update session status in database
    await supabase
      .from("sessions")
      .update({ status: "ready" })
      .eq("id", sessionId);
    // Navigate to discussion room page
    router.replace(`/session/discussion?code=${code}`);
  };

  // Effect to initialize session status and set up broadcast listener
  useEffect(() => {
    if (!code) return;

    // Initial fetch
    fetchSessionStatus();

    // Set up periodic sync every 10 seconds
    const syncInterval = setInterval(async () => {
      console.log("🔄 Syncing preparation time with server...");
      const remaining = await fetchSessionStatus();
      console.log(`⏰ Server time remaining: ${remaining} seconds`);
    }, 10000); // Sync every 10 seconds

    // Set up real-time channel subscription for status updates
    const channel = supabase
      .channel(`session_status_${code}`)
      .on("broadcast", { event: "status_change" }, (payload) => {
        if (payload.payload?.status === "ready") {
          router.replace(`/session/discussion?code=${code}`);
        }
      })
      .subscribe((status) => {
        console.log("🔔 Broadcast status:", status);
      });

    // Cleanup function to unsubscribe from channel and clear interval
    return () => {
      channel.unsubscribe();
      clearInterval(syncInterval);
    };
  }, [code]);

  // Effect to handle countdown timer
  useEffect(() => {
    if (!sessionStatus || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          broadcastReady(sessionStatus.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // Cleanup function to clear timer
    return () => clearInterval(timer);
  }, [sessionStatus, timeRemaining]);

  // Loading state UI
  if (loading) {
    return <div className="text-center p-8">⏳ Loading...</div>;
  }

  // Error state UI
  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        ❌ {error} <br />
        <Link href="/" className="underline">
          Back to Home
        </Link>
      </div>
    );
  }

  // Main preparation page UI
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">🧭 Preparation</h1>
      {/* Countdown timer display */}
      <p className="text-center text-xl mb-4">
        Time remaining:{" "}
        <span className="font-mono text-2xl">
          {String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:
          {String(timeRemaining % 60).padStart(2, "0")}
        </span>
      </p>

      {sessionStatus && (
        <>
          {/* Topic display section with prompt content */}
          <div className="bg-white shadow rounded p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">💬 Topic</h2>
            <p className="text-lg font-medium text-gray-800 mb-2">
              {sessionStatus.test_topic}
            </p>
            {promptContent && (
              <p className="whitespace-pre-wrap text-gray-700">
                {promptContent}
              </p>
            )}
          </div>

          {/* Instructions display section */}
          <div className="bg-gray-50 p-6 rounded mb-6">
            <h2 className="text-xl font-semibold mb-2">📋 Instructions</h2>
            <p className="whitespace-pre-wrap">
              {sessionStatus.instructions ||
                "Each participant should speak for 2–3 minutes."}
            </p>
          </div>

          {/* Debug button for skipping preparation */}
          <div className="text-center">
            <button
              onClick={() => broadcastReady(sessionStatus.id)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              🔧 Debug: Skip to Ready
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Main component wrapped with Suspense
export default function PreparationPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center p-8">
          <div className="animate-spin inline-block rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p>Loading...</p>
        </div>
      }
    >
      <PreparationContent />
    </Suspense>
  );
}
