"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../supabase";
import { motion } from "framer-motion";

type Evaluation = {
  pronunciation_delivery_score: number;
  pronunciation_delivery_comment: string;
  communication_strategies_score: number;
  communication_strategies_comment: string;
  vocabulary_patterns_score: number;
  vocabulary_patterns_comment: string;
  ideas_organization_score: number;
  ideas_organization_comment: string;
  speaking_time?: number;
  word_count?: number;
};

type Session = {
  id: string;
  session_code: string;
  test_topic: string;
  created_at: string;
};

type Transcript = {
  content: string;
};

// Score to color mapping for visual feedback
const getScoreColor = (score: number) => {
  if (score >= 6) return "text-green-600";
  if (score >= 4) return "text-blue-600";
  if (score >= 2) return "text-yellow-600";
  return "text-red-600";
};

// Score to background color for visual feedback
const getScoreBgColor = (score: number) => {
  if (score >= 6) return "bg-green-100";
  if (score >= 4) return "bg-blue-100";
  if (score >= 2) return "bg-yellow-100";
  return "bg-red-100";
};

// Animation variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function ResultsContent() {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("user_id");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!userId || !sessionId) {
        setError("❌ Missing session or user information");
        setLoading(false);
        return;
      }

      // 查询用户名
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, username")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("⚠️ Failed to fetch user profile:", profileError);
      }

      const nameToShow =
        profile && profile.name?.trim()
          ? profile.name
          : profile?.username || "Unknown";

      setUsername(nameToShow);

      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      setSession(sessionData);

      const { data: evaluationData } = await supabase
        .from("evaluation")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .single();

      setEvaluation(evaluationData);

      const { data: merged, error: mergedError } = await supabase
        .from("merged_transcripts")
        .select("merged_transcript")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }) // 最新的放最前
        .limit(1)
        .maybeSingle();

      if (mergedError) {
        console.warn("⚠️ Failed to fetch merged transcript:", mergedError);
      }

      if (merged) {
        setTranscript({ content: merged.merged_transcript });
      }

      setLoading(false);
    };

    fetchEvaluation();
  }, [userId, sessionId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-opacity-75"></div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-blue-600">
            Loading Results...
          </h1>
          <p className="text-gray-500">Your evaluation is being prepared</p>
        </div>
      </div>
    );
  }

  if (error || !evaluation || !session) {
    return (
      <div className="fixed inset-0 bg-[#f5f7fa] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md"
        >
          <div className="text-red-500 font-medium mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-xl mb-2">Error Loading Results</p>
            <p className="text-gray-600 text-base">
              {error || "Failed to load evaluation data"}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow font-medium"
          >
            Back to Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const totalScore =
    evaluation.pronunciation_delivery_score +
    evaluation.communication_strategies_score +
    evaluation.vocabulary_patterns_score +
    evaluation.ideas_organization_score;

  // Calculate total score percentage
  const scorePercentage = Math.round((totalScore / 28) * 100);
  const scoreRating =
    scorePercentage >= 80
      ? "Excellent"
      : scorePercentage >= 65
      ? "Good"
      : scorePercentage >= 50
      ? "Satisfactory"
      : "Needs Improvement";

  return (
    <div className="min-h-screen bg-[#f5f7fa] py-10 md:py-16 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Performance Analysis
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your speaking assessment for the group interaction task
          </p>
        </motion.div>

        {/* Summary Card with Score Circle */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-8 md:mb-12"
        >
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Score Circle */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <svg className="w-40 h-40">
                      <circle
                        className="text-gray-200"
                        strokeWidth="6"
                        stroke="currentColor"
                        fill="transparent"
                        r="70"
                        cx="80"
                        cy="80"
                      />
                      <circle
                        className="text-blue-600"
                        strokeWidth="6"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="70"
                        cx="80"
                        cy="80"
                        strokeDasharray={`${
                          (scorePercentage * 439.6) / 100
                        } 439.6`}
                        strokeDashoffset="0"
                        transform="rotate(-90 80 80)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-4xl font-bold text-blue-600">
                        {totalScore}
                      </span>
                      <span className="text-gray-500 text-sm font-medium">
                        out of 28
                      </span>
                      <span
                        className={`mt-1 text-sm font-semibold px-2 py-0.5 rounded-full ${getScoreBgColor(
                          totalScore / 4
                        )}`}
                      >
                        {scoreRating}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Info */}
                <div className="flex-grow space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">
                        Student Name
                      </h3>
                      <p className="font-medium text-gray-800">{username}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">
                        Session Code
                      </h3>
                      <p className="font-medium text-gray-800">
                        {session.session_code}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">
                        Discussion Topic
                      </h3>
                      <p className="font-medium text-gray-800">
                        {session.test_topic}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">
                        Session Date
                      </h3>
                      <p className="font-medium text-gray-800">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Evaluation Categories */}
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Performance Categories
        </h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <EvaluationCard
            icon="🎤"
            title="Pronunciation & Delivery"
            score={evaluation.pronunciation_delivery_score}
            comment={evaluation.pronunciation_delivery_comment}
          />
          <EvaluationCard
            icon="🔄"
            title="Communication Strategies"
            score={evaluation.communication_strategies_score}
            comment={evaluation.communication_strategies_comment}
          />
          <EvaluationCard
            icon="📚"
            title="Vocabulary & Patterns"
            score={evaluation.vocabulary_patterns_score}
            comment={evaluation.vocabulary_patterns_comment}
          />
          <EvaluationCard
            icon="💡"
            title="Ideas & Organization"
            score={evaluation.ideas_organization_score}
            comment={evaluation.ideas_organization_comment}
          />
        </motion.div>

        {/* Transcript Section - Collapsible */}
        {transcript && (
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl shadow-lg overflow-hidden mb-10"
          >
            <div className="p-6">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center justify-between w-full"
              >
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <span className="mr-2">📝</span> Session Transcript
                </h2>
                <svg
                  className={`w-5 h-5 transition-transform ${
                    showTranscript ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showTranscript && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-gray-700">
                      {transcript.content}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Button to return to dashboard */}
        <div className="flex justify-center mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              router.push(
                `/dashboard/results?user_id=${userId}&session_id=${sessionId}`
              )
            }
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md font-medium"
          >
            Return to Dashboard
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-[#f5f7fa] flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <div className="mx-auto mb-6 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-opacity-75"></div>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-blue-600">
              Loading Results...
            </h1>
            <p className="text-gray-500">Your evaluation is being prepared</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

function EvaluationCard({
  icon,
  title,
  score,
  comment,
}: {
  icon: string;
  title: string;
  score: number;
  comment: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-xl shadow-md overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start mb-3">
          <span className="text-2xl mr-2">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>

        <div className="flex items-center mb-3">
          <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <span className="text-gray-500 ml-1 text-lg">/7</span>

          <div className="ml-4 flex-grow">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className={`h-2 rounded-full ${
                  score >= 6
                    ? "bg-green-500"
                    : score >= 4
                    ? "bg-blue-500"
                    : score >= 2
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${(score / 7) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <p className="text-gray-600 italic text-sm bg-gray-50 p-3 rounded-lg">
          {comment}
        </p>
      </div>
    </motion.div>
  );
}
