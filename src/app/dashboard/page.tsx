"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/supabase";
import { motion } from "framer-motion";

type SessionWithEvaluation = {
  id: string;
  session_code: string;
  test_topic: string;
  created_at: string;
  total_score?: number;
};

function DashboardContent() {
  const [sessions, setSessions] = useState<SessionWithEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/auth");
          return;
        }

        setUserId(session.user.id);

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, username")
          .eq("id", session.user.id)
          .single();

        const nameToShow =
          profile && profile.name?.trim()
            ? profile.name
            : profile?.username || session.user.email?.split("@")[0] || "User";

        setUsername(nameToShow);

        // Fetch sessions and evaluations
        const fetchData = async () => {
          try {
            // Get all participated sessions
            const { data: participantsData, error: participantsError } =
              await supabase
                .from("participants")
                .select("session_id")
                .eq("user_id", session.user.id);

            if (participantsError) {
              throw participantsError;
            }

            if (!participantsData || participantsData.length === 0) {
              setSessions([]);
              setLoading(false);
              return;
            }

            const sessionIds = participantsData.map((p) => p.session_id);

            // Get session details
            const { data: sessionsData, error: sessionsError } = await supabase
              .from("sessions")
              .select("*")
              .in("id", sessionIds)
              .order("created_at", { ascending: false });

            if (sessionsError) {
              throw sessionsError;
            }

            // Get evaluations for these sessions
            const { data: evaluationsData, error: evaluationsError } =
              await supabase
                .from("evaluation")
                .select("*")
                .eq("user_id", session.user.id)
                .in("session_id", sessionIds);

            if (evaluationsError) {
              console.warn("Failed to fetch evaluations:", evaluationsError);
            }

            // Map evaluations to sessions
            const sessionsWithEvaluations = sessionsData.map((session) => {
              const evaluation = evaluationsData?.find(
                (e) => e.session_id === session.id
              );

              let totalScore = null;
              if (evaluation) {
                totalScore =
                  evaluation.pronunciation_delivery_score +
                  evaluation.communication_strategies_score +
                  evaluation.vocabulary_patterns_score +
                  evaluation.ideas_organization_score;
              }

              return {
                ...session,
                total_score: totalScore,
              };
            });

            setSessions(sessionsWithEvaluations);
          } catch (err) {
            console.error("Error fetching sessions:", err);
            setError("Failed to load your sessions. Please try again later.");
          } finally {
            setLoading(false);
          }
        };

        fetchData();
      } catch (error) {
        console.error("Auth error:", error);
        setError("Authentication error. Please login again.");
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleViewResult = (sessionId: string) => {
    if (!userId) return;
    router.push(`/results?user_id=${userId}&session_id=${sessionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-[#4a7dbd] border-solid rounded-full animate-spin"></div>
          <div className="mt-4 text-lg text-[#4a7dbd] font-medium">
            Loading your sessions...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-[#4a7dbd] text-white rounded hover:bg-[#3a6eae] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-bold text-gray-800"
          >
            Results Dashboard
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-2 text-gray-600"
          >
            Welcome back, {username}! View your session history and performance
            results.
          </motion.p>
        </div>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-lg text-center"
          >
            <div className="text-gray-600 mb-6">
              <p className="text-xl font-medium mb-4">No sessions found</p>
              <p>
                You haven&apos;t participated in any group interaction sessions
                yet.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/session/join")}
              className="px-5 py-2.5 mx-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200"
            >
              Join a Session
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/session/create")}
              className="px-5 py-2.5 mx-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 shadow-sm transition-colors duration-200"
            >
              Create a Session
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-lg"
          >
            <h2 className="text-xl font-semibold mb-6">Your Sessions</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 border-b border-gray-200 text-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-3 border-b border-gray-200 text-gray-700">
                      Session Code
                    </th>
                    <th className="px-4 py-3 border-b border-gray-200 text-gray-700">
                      Topic
                    </th>
                    <th className="px-4 py-3 border-b border-gray-200 text-gray-700">
                      Score
                    </th>
                    <th className="px-4 py-3 border-b border-gray-200 text-gray-700">
                      Performance Analysis
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <motion.tr
                      key={session.id}
                      whileHover={{ backgroundColor: "#f9fafb" }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        {formatDate(session.created_at)}
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {session.session_code}
                      </td>
                      <td className="px-4 py-4">{session.test_topic}</td>
                      <td className="px-4 py-4">
                        {session.total_score !== null ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {session.total_score}/28
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {session.total_score !== null ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleViewResult(session.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            View Details
                          </motion.button>
                        ) : (
                          <span className="text-gray-400 flex items-center cursor-not-allowed opacity-60">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Not Available
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa]">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-t-4 border-[#4a7dbd] border-solid rounded-full animate-spin"></div>
            <div className="mt-4 text-lg text-[#4a7dbd] font-medium">
              Loading...
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
