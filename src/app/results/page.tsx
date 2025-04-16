"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../supabase";

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

function ResultsContent() {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    return <div className="text-center p-8">Loading your result...</div>;
  }

  if (error || !evaluation || !session) {
    return (
      <div className="text-center text-red-500 mt-10">
        {error || "Failed to load evaluation data"} <br />
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-100"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const totalScore =
    evaluation.pronunciation_delivery_score +
    evaluation.communication_strategies_score +
    evaluation.vocabulary_patterns_score +
    evaluation.ideas_organization_score;

  return (
    <div className="min-h-screen bg-gray-50 py-16 flex flex-col items-center">
      <h1 className="text-5xl font-bold mb-10 text-blue-500">
        Group Interaction Evaluation
      </h1>

      {/* Summary & Performance in 2 columns */}
      <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full mb-10">
        <div className="bg-blue-50 shadow p-6 rounded-lg flex-1">
          <h2 className="text-lg font-semibold text-blue-600 mb-2">
            📊 Performance
          </h2>
          <div className="flex items-center justify-center mt-6 mb-6">
            <div className="relative w-32 h-32 rounded-full border-4 border-blue-600 flex items-center justify-center">
              <span className="text-4xl font-bold text-blue-600">
                {totalScore}
              </span>
              <span className="absolute bottom-2 text-sm text-gray-500">
                / 28
              </span>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <p>
              🕐 <strong>Speaking Time:</strong> {evaluation.speaking_time || 0}
              s
            </p>
            <p>
              📝 <strong>Word Count:</strong> {evaluation.word_count || 0}
            </p>
          </div>
        </div>
        <div className="bg-white shadow p-6 rounded-lg flex-1">
          <h2 className="text-lg font-semibold mb-2">🧾 Summary</h2>
          <p>
            <strong>Name:</strong> {username}
          </p>
          <p>
            <strong>Session Code:</strong> {session.session_code}
          </p>
          <p>
            <strong>Topic:</strong> {session.test_topic}
          </p>
          <p>
            <strong>Time:</strong>{" "}
            {new Date(session.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <EvaluationCard
          title="Pronunciation & Delivery"
          score={evaluation.pronunciation_delivery_score}
          comment={evaluation.pronunciation_delivery_comment}
        />
        <EvaluationCard
          title="Communication Strategies"
          score={evaluation.communication_strategies_score}
          comment={evaluation.communication_strategies_comment}
        />
        <EvaluationCard
          title="Vocabulary Patterns"
          score={evaluation.vocabulary_patterns_score}
          comment={evaluation.vocabulary_patterns_comment}
        />
        <EvaluationCard
          title="Ideas & Organization"
          score={evaluation.ideas_organization_score}
          comment={evaluation.ideas_organization_comment}
        />
      </div>

      {transcript && (
        <div className="max-w-4xl w-full bg-white shadow p-8 rounded mt-10 mb-10">
          <h2 className="text-xl font-semibold mb-4">📝 Session Transcript</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="whitespace-pre-wrap">{transcript.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-blue-600">
              Loading Results...
            </h1>
            <div className="mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50 mx-auto"></div>
            </div>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

function EvaluationCard({
  title,
  score,
  comment,
}: {
  title: string;
  score: number;
  comment: string;
}) {
  return (
    <div className="bg-white p-6 shadow rounded">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-2xl font-bold">{score}/7</p>
      <p className="text-gray-600 italic mt-2">{comment}</p>
    </div>
  );
}
