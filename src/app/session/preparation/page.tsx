"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../supabase";

type SessionStatus = {
  id: string;
  status:
    | "waiting"
    | "preparation"
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

export default function PreparationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(
    null
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Disable navigation and handle page refresh/close
  useEffect(() => {
    // Disable navigation bar
    const style = document.createElement("style");
    style.innerHTML = `
      nav {
        pointer-events: none !important;
        opacity: 0.5 !important;
      }
      nav * {
        pointer-events: none !important;
      }
      header {
        pointer-events: none !important;
        opacity: 0.5 !important;
      }
      header * {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    // Handle page refresh and close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    // Handle navigation attempts
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);

    // Cleanup function
    return () => {
      document.head.removeChild(style);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Get session information and sync time
  const fetchSessionStatus = async () => {
    if (!code) return;

    try {
      console.log("Polling session status...");
      const { data: initialSession, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_code", code)
        .single();

      if (sessionError || !initialSession) {
        setError("Session not found");
        setLoading(false);
        return;
      }

      // If session status is not preparation, redirect to appropriate page
      if (initialSession.status !== "preparation") {
        console.log("Current session status:", initialSession.status);
        if (initialSession.status === "discussion") {
          console.log(
            "Session status changed to discussion, redirecting all users..."
          );
          router.replace(`/session/discussion?code=${code}`);
          return;
        }
        setError(`Invalid session status: ${initialSession.status}`);
        setLoading(false);
        return;
      }

      let currentSession = initialSession;

      // If preparation_start_time is not set, set it now
      if (!currentSession.preparation_start_time) {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("sessions")
          .update({ preparation_start_time: now })
          .eq("id", currentSession.id);

        if (updateError) {
          console.error("Error updating preparation start time:", updateError);
          setError("Failed to initialize preparation timer");
          setLoading(false);
          return;
        }

        // Fetch updated session to ensure we have the latest data
        const { data: updatedSession, error: refreshError } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", currentSession.id)
          .single();

        if (refreshError || !updatedSession) {
          console.error("Error refreshing session data:", refreshError);
          setError("Failed to refresh session data");
          setLoading(false);
          return;
        }

        // Use the updated session data
        currentSession = updatedSession;
      }

      // Calculate remaining time based on preparation_start_time
      const startTime = new Date(
        currentSession.preparation_start_time!
      ).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remainingSeconds = Math.max(0, 600 - elapsedSeconds); // 600 seconds = 10 minutes

      console.log("Time sync - Remaining seconds:", remainingSeconds);

      // Only update time if the difference is more than 2 seconds
      // This prevents minor flickering due to network latency
      if (Math.abs(remainingSeconds - timeRemaining) > 2) {
        console.log(
          "Adjusting time - Local:",
          timeRemaining,
          "Server:",
          remainingSeconds
        );
        setTimeRemaining(remainingSeconds);
      }

      setSessionStatus(currentSession);
      setLoading(false);

      // If time is already up, proceed to discussion
      if (remainingSeconds <= 0) {
        handlePreparationComplete();
      }
    } catch (err) {
      console.error("Error fetching session:", err);
      setError("Failed to fetch session data");
      setLoading(false);
    }
  };

  // 处理准备阶段结束
  const handlePreparationComplete = async () => {
    if (!sessionStatus) return;

    try {
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ status: "discussion" })
        .eq("id", sessionStatus.id);

      if (updateError) {
        throw updateError;
      }

      router.replace(`/session/discussion?code=${code}`);
    } catch (err) {
      console.error("Error updating session status:", err);
      setError("Failed to proceed to discussion");
    }
  };

  // Initialize session information and set up realtime subscription
  useEffect(() => {
    if (!code) {
      setError("No session code provided");
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchSessionStatus();

    console.log("Setting up realtime subscription for session:", code);

    // Set up realtime subscription using broadcast channel
    const channel = supabase
      .channel(`session_status_${code}`)
      .on("broadcast", { event: "status_change" }, (payload) => {
        console.log("Received broadcast message:", payload);
        if (payload.status === "discussion") {
          console.log("Received status change to discussion, redirecting...");
          router.replace(`/session/discussion?code=${code}`);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to broadcast channel");
        } else {
          console.log("Subscription status:", status);
        }
      });

    // Cleanup subscription
    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [code]);

  // Debug button click handler
  const handleDebugSkip = async () => {
    if (!sessionStatus) return;
    try {
      console.log(
        "Debug button clicked, updating session status to discussion..."
      );

      // First broadcast the status change
      const channel = supabase.channel(`session_status_${code}`);
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "status_change",
        status: "discussion",
      });

      // Then update database
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ status: "discussion" })
        .eq("id", sessionStatus.id);

      if (updateError) {
        throw updateError;
      }

      console.log(
        "Debug: Session status updated to discussion, redirecting..."
      );
      router.replace(`/session/discussion?code=${code}`);
    } catch (err) {
      console.error("Error updating session status:", err);
      setError("Failed to update session status");
    }
  };

  // Local countdown effect - updates every second but syncs with server every 10s
  useEffect(() => {
    if (loading || error || !sessionStatus || timeRemaining <= 0) return;

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          handlePreparationComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [loading, error, sessionStatus, timeRemaining]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
            Preparation Time
          </h1>

          {/* 倒计时显示 */}
          <div className="mb-8 text-center">
            <div className="text-2xl font-bold text-blue-600">
              Time remaining: {Math.floor(timeRemaining / 60)}:
              {(timeRemaining % 60).toString().padStart(2, "0")}
            </div>
            <div className="text-gray-600 mt-2">
              Please read the instructions carefully before the discussion
              starts.
            </div>
          </div>

          {/* 讨论主题 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">
              Discussion Topic
            </h2>
            <p className="text-lg text-gray-600">{sessionStatus?.test_topic}</p>
          </div>

          {/* 说明 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">
              Instructions
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-600 whitespace-pre-wrap">
                {sessionStatus?.instructions ||
                  "Please discuss the topic in English. Each participant should speak for about 2-3 minutes."}
              </p>
            </div>
          </div>

          {/* Debug button - Remove in production */}
          <div className="mb-8 text-center">
            <button
              onClick={handleDebugSkip}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Debug: Skip to Discussion
            </button>
          </div>

          {/* Prompt */}
          <div className="text-center text-sm text-gray-500">
            The discussion will start automatically when the preparation time is
            up.
            <br />
            Make sure you understand the topic and instructions before
            proceeding.
          </div>
        </div>
      </div>
    </div>
  );
}
