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

      const storedUsername = sessionStorage.getItem("username");
      setUsername(storedUsername ?? "Unknown");

      // 查询 session 信息
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        setError("⚠️ Session not found.");
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // 查询 evaluation 数据
      const { data: evaluationData, error: evalError } = await supabase
        .from("evaluation")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .single();

      if (evalError || !evaluationData) {
        setError("⚠️ Evaluation not found for your session.");
        setLoading(false);
        return;
      }

      setEvaluation(evaluationData);

      // 获取 transcript 内容
      const transcriptRes = await fetch(
        `/api/transcript/latest?session_id=${sessionId}`
      );
      const transcriptData = await transcriptRes.json();

      if (transcriptRes.ok && transcriptData) {
        setTranscript(transcriptData);
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
        Your Evaluation
      </h1>

      <div className="max-w-4xl w-full bg-white shadow p-8 rounded mb-10">
        <h2 className="text-xl font-semibold mb-2">🧾 Summary</h2>
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
          <strong>Time:</strong> {new Date(session.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Speaking Time:</strong> {evaluation.speaking_time}s
        </p>
        <p>
          <strong>Word Count:</strong> {evaluation.word_count}
        </p>
        <p>
          <strong>Total Score:</strong> {totalScore} / 28
        </p>
      </div>

      {transcript && (
        <div className="max-w-4xl w-full bg-white shadow p-8 rounded mb-10">
          <h2 className="text-xl font-semibold mb-4">📝 Session Transcript</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="whitespace-pre-wrap">{transcript.content}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 max-w-4xl w-full">
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
