"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../supabase";
import { motion } from "framer-motion";

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
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full"
        >
          <div className="flex items-center justify-center mb-6 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-16 h-16"
            >
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-red-600 text-xl font-semibold mb-4"
          >
            {isExpired ? "Session has expired" : error}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-gray-600 mb-6"
          >
            {isExpired
              ? "Please create a new session or join another one."
              : "There was a problem with the session."}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/session/create")}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md transition-colors duration-200"
            >
              Create New Session
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 rounded-xl font-medium shadow-md transition-colors duration-200"
            >
              Back to Home
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
          <div className="mt-4 text-lg text-blue-600 font-medium">
            Loading waiting room...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-white shadow-lg rounded-xl overflow-hidden"
        >
          <div className="p-8">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl font-bold mb-6 text-center text-gray-800"
            >
              Waiting Room
            </motion.h1>

            {/* Countdown display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-8 text-center"
            >
              {isStarting ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 my-4">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    All participants have joined!
                  </div>
                  <div className="text-xl">
                    Session will start in{" "}
                    <span className="font-bold">{countdownSeconds}</span>{" "}
                    seconds...
                  </div>
                  <motion.div
                    className="w-full bg-gray-200 h-2 mt-4 rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      className="bg-green-500 h-full"
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 10, ease: "linear" }}
                    ></motion.div>
                  </motion.div>
                </div>
              ) : timeRemaining !== null ? (
                <div
                  className={`bg-blue-50 border ${
                    timeRemaining < 60 ? "border-red-200" : "border-blue-200"
                  } rounded-lg p-6 my-4`}
                >
                  <div
                    className={`text-xl font-bold ${
                      timeRemaining < 60 ? "text-red-600" : "text-blue-600"
                    } mb-2`}
                  >
                    Waiting for participants...
                  </div>
                  <div className="flex justify-center items-center mt-2">
                    <div className="text-3xl font-mono bg-white py-2 px-4 rounded-lg shadow">
                      {Math.floor(timeRemaining / 60)}:
                      {(timeRemaining % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                  {timeRemaining < 60 && (
                    <div className="text-sm mt-4 text-red-600 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Session will expire if not enough participants join!
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>

            {/* Discussion topic */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center mb-3">
                <span className="text-blue-600 mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <h2 className="text-xl font-semibold text-gray-700">
                  Discussion Topic
                </h2>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <p className="text-lg text-gray-800">
                  {sessionStatus?.test_topic}
                </p>
              </div>
            </motion.div>

            {/* Participants list */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z"
                        clipRule="evenodd"
                      />
                      <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                    </svg>
                  </span>
                  <h2 className="text-xl font-semibold text-gray-700">
                    Participants
                  </h2>
                </div>
                <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                  {participants.length}/4
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participants.map((p, index) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index + 0.7, duration: 0.3 }}
                    className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      {p.is_ai && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          AI
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Session information */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-center mt-10 border-t border-gray-200 pt-6"
            >
              <div className="flex justify-center items-center mb-4">
                <div className="bg-blue-50 px-4 py-2 rounded-lg flex items-center">
                  <span className="text-blue-600 mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="font-medium">Session Code: </span>
                  <span className="ml-1 font-mono bg-white px-2 py-1 rounded">
                    {code}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-6">
                Created at {formatDateTime(sessionStatus?.created_at || "")}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLeave}
                className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
              >
                Leave Session
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// 主组件
export default function WaitingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa]">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
            <div className="mt-4 text-lg text-blue-600 font-medium">
              Loading waiting room...
            </div>
          </div>
        </div>
      }
    >
      <WaitingRoomContent />
    </Suspense>
  );
}
