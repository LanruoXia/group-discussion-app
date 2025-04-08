"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../supabase";

type Participant = {
  id: string;
  user_id: string;
  is_ai: boolean;
  created_at: string;
  name: string | null;
};

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
  ai_count: number;
  created_at: string;
  created_by: string;
  session_code: string;
  expires_at: string;
};

// 包装组件
function WaitingRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(10);
  const [isStarting, setIsStarting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Format date time display (using user's local timezone)
  const formatDateTime = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  // Calculate remaining time
  const calculateTimeRemaining = (expiresAtStr: string): number => {
    const expiryTime = new Date(expiresAtStr).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiryTime - now) / 1000));
  };

  // Handle session start
  const handleSessionStart = async () => {
    if (!sessionStatus) return;

    try {
      // Set state first to ensure UI updates immediately
      setIsStarting(true);
      setCountdownSeconds(10);
      setTimeRemaining(null);

      console.log("Starting session countdown, isStarting set to true");
    } catch (err) {
      console.error("Error starting session:", err);
      setIsStarting(false);
      setTimeRemaining(300); // Reset to 5 minutes if failed
    }
  };

  // Fetch session and participants information
  const fetchSessionAndParticipants = async () => {
    if (!code) return;

    try {
      // Get session information
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_code", code)
        .single();

      if (sessionError || !session) {
        setError("Session not found");
        setLoading(false);
        return;
      }

      // Get participants information
      const { data: participantsData, error: participantsError } =
        await supabase
          .from("participants")
          .select(
            `
          id,
          user_id,
          is_ai,
          created_at,
          username,
          session_id
        `
          )
          .eq("session_id", session.id);

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
        setError("Failed to fetch participants");
        setLoading(false);
        return;
      }

      // Update states
      setSessionStatus(session);
      setParticipants(
        participantsData.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          is_ai: p.is_ai,
          created_at: p.created_at,
          name: p.username,
        }))
      );

      const hasEnoughParticipants = participantsData.length >= 4;
      console.log(
        "Current participants:",
        participantsData.length,
        "isStarting:",
        isStarting
      );

      // If there are 4 participants and countdown hasn't started, start 10s countdown
      if (hasEnoughParticipants && !isStarting) {
        console.log(
          "Starting 10s countdown - participants:",
          participantsData.length
        );
        // Set states first
        setIsStarting(true);
        setCountdownSeconds(10);
        setTimeRemaining(null);
        // Then start countdown
        handleSessionStart();
      } else if (!hasEnoughParticipants) {
        // If not enough participants, continue 5-minute countdown
        console.log("Not enough participants:", participantsData.length);
        if (!isStarting) {
          // Only set countdown when not started
          const remaining = calculateTimeRemaining(session.expires_at);
          setTimeRemaining(remaining);
          // If time is up and not enough participants, set expired
          if (remaining <= 0) {
            await handleSessionExpire();
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch session data");
      setLoading(false);
    }
  };

  // Handle user leaving
  const handleLeave = async () => {
    if (!sessionStatus || !userId) return;

    const confirmed = window.confirm(
      "Are you sure you want to leave this session?"
    );
    if (!confirmed) return;

    try {
      await supabase
        .from("participants")
        .delete()
        .eq("session_id", sessionStatus.id)
        .eq("user_id", userId);

      router.replace("/");
    } catch (err) {
      console.error("Error leaving session:", err);
    }
  };

  // Initialize user ID fetch
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Set up polling for session information
  useEffect(() => {
    if (!code) {
      setError("No session code provided");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!isStarting) {
        // Only fetch data when countdown hasn't started
        await fetchSessionAndParticipants();
      }
    };

    // Execute immediately
    fetchData();

    // Set up polling
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [code, isStarting]);

  // 10-second countdown effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    console.log(
      "10s countdown effect - isStarting:",
      isStarting,
      "seconds:",
      countdownSeconds
    );

    if (isStarting && countdownSeconds > 0) {
      console.log("Starting 10s countdown timer");
      intervalId = setInterval(() => {
        setCountdownSeconds((prev) => {
          const next = prev - 1;
          console.log("Countdown tick:", next);
          if (next <= 0) {
            if (intervalId) clearInterval(intervalId);
            // When countdown ends, update status and redirect
            (async () => {
              try {
                console.log("Countdown finished, updating session status");
                const { error: updateError } = await supabase
                  .from("sessions")
                  .update({ status: "preparation" })
                  .eq("id", sessionStatus?.id);

                if (updateError) {
                  throw updateError;
                }

                // Wait for status to be actually updated
                let retries = 0;
                const maxRetries = 5;
                while (retries < maxRetries) {
                  const { data: session, error: checkError } = await supabase
                    .from("sessions")
                    .select("status")
                    .eq("id", sessionStatus?.id)
                    .single();

                  if (checkError) {
                    console.error("Error checking session status:", checkError);
                    break;
                  }

                  if (session.status === "preparation") {
                    console.log(
                      "Session status confirmed as preparation, redirecting"
                    );
                    router.replace(`/session/preparation?code=${code}`);
                    return;
                  }

                  console.log(
                    "Waiting for status update, attempt:",
                    retries + 1
                  );
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  retries++;
                }

                if (retries >= maxRetries) {
                  console.error(
                    "Failed to confirm status update after max retries"
                  );
                  setError("Failed to update session status");
                  setIsStarting(false);
                  setTimeRemaining(300);
                }
              } catch (error) {
                console.error("Error updating session status:", error);
                setIsStarting(false);
                setTimeRemaining(300); // Reset to 5 minutes if failed
              }
            })();
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        console.log("Cleaning up 10s countdown interval");
        clearInterval(intervalId);
      }
    };
  }, [isStarting, countdownSeconds, sessionStatus?.id, code]);

  // 5-minute countdown effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    console.log(
      "5min countdown effect - timeRemaining:",
      timeRemaining,
      "isStarting:",
      isStarting
    );

    if (!isStarting && timeRemaining !== null && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining((prev) => {
          if (!prev || prev <= 1) {
            if (intervalId) clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        console.log("Cleaning up 5min countdown interval");
        clearInterval(intervalId);
      }
    };
  }, [timeRemaining, isStarting]);

  // Handle session expiration
  const handleSessionExpire = async () => {
    if (!sessionStatus) return;

    try {
      await supabase
        .from("sessions")
        .update({ status: "expired" })
        .eq("id", sessionStatus.id);

      setIsExpired(true);
    } catch (err) {
      console.error("Error handling session expiration:", err);
    }
  };

  if (error || isExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-600 text-xl mb-4">
            {isExpired ? "Session has expired" : error}
          </div>
          <div className="text-gray-600 mb-6">
            {isExpired
              ? "Please create a new session or join another one."
              : ""}
          </div>
          <div className="space-x-4">
            <button
              onClick={() => router.push("/session/create")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Create New Session
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
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
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
            Waiting Room
          </h1>

          {/* Countdown display */}
          <div className="mb-4 text-center">
            {isStarting ? (
              <div className="text-2xl font-bold text-green-600">
                All participants have joined!
                <br />
                Session will start in {countdownSeconds} seconds...
              </div>
            ) : timeRemaining !== null ? (
              <div
                className={`text-xl font-bold ${
                  timeRemaining < 60 ? "text-red-600" : "text-blue-600"
                }`}
              >
                Waiting for participants...
                <br />
                Time remaining: {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, "0")}
                {timeRemaining < 60 && (
                  <div className="text-sm mt-2">
                    Session will expire if not enough participants join!
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Discussion topic */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">
              Discussion Topic
            </h2>
            <p className="text-lg text-gray-600">{sessionStatus?.test_topic}</p>
          </div>

          {/* Instructions */}
          {sessionStatus?.instructions && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">
                Instructions
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap">
                {sessionStatus.instructions}
              </p>
            </div>
          )}

          {/* Participants list */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">
              Participants ({participants.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    {p.is_ai && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDateTime(p.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session information */}
          <div className="text-center text-sm text-gray-500">
            Session Code: {code}
            <br />
            Created at {formatDateTime(sessionStatus?.created_at || "")}
            <br />
            <button
              onClick={handleLeave}
              className="mt-2 text-gray-500 hover:text-red-500 transition-colors"
            >
              Leave Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主组件
export default function WaitingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin inline-block rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
            <p>Loading waiting room...</p>
          </div>
        </div>
      }
    >
      <WaitingRoomContent />
    </Suspense>
  );
}
