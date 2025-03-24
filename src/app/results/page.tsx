"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  speaking_time: number;
  word_count: number;
  session_id: string;
};

type Session = {
  session_id: string;
  test_topic: string;
  created_at: string;
};

export default function ResultsPage() {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEvaluation = async () => {
      const userID = sessionStorage.getItem("user_id");
      const storedUsername = sessionStorage.getItem("username");

      if (!userID) {
        setError("⚠️ Please log in to view your results.");
        setLoading(false);
        return;
      }

      setUsername(storedUsername || "Unknown");
      setLoading(true);

      // ✅ **Step 1: Get the latest session**
      const { data: latestSession, error: sessionError } = await supabase
        .from("session")
        .select("*")
        .order("created_at", { ascending: false }) // ✅ Order by latest session
        .limit(1)
        .single();

      if (sessionError || !latestSession) {
        setError("⚠️ No session found.");
        setLoading(false);
        return;
      }

      setSession(latestSession);

      // ✅ **Step 2: Get the evaluation for the latest session**
      const { data: latestEvaluation, error: evalError } = await supabase
        .from("evaluation")
        .select("*")
        .eq("user_id", userID)
        .eq("session_id", latestSession.session_id) // ✅ Get evaluation for latest session
        .single();

      if (evalError || !latestEvaluation) {
        setError("⚠️ No evaluation found.");
        setLoading(false);
        return;
      }

      setEvaluation(latestEvaluation);
      setLoading(false);
    };

    fetchEvaluation();
  }, []);

  if (loading) {
    return <div className="text-center">Loading latest evaluation data...</div>;
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        {error} <br />
        <button
          className="border border-red-500 text-red-500 px-4 py-2 rounded mt-4 hover:bg-red-100"
          onClick={() => router.push("/auth")}
        >
          Login
        </button>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-center text-red-500">No results available.</div>
    );
  }

  // ✅ **Calculate total score**
  const totalScore =
    evaluation.pronunciation_delivery_score +
    evaluation.communication_strategies_score +
    evaluation.vocabulary_patterns_score +
    evaluation.ideas_organization_score;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-16 w-full">
      <h1 className="text-5xl font-bold mb-12 text-blue-500">
        Test Evaluation
      </h1>

      {/* 🏆 Score Box + Test Details */}
      <div className="flex justify-between w-full max-w-7xl mb-12 px-12 gap-16">
        {/* 🏅 Score Box - Left-aligned */}
        <div className="w-1/3 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">
            Total Score
          </h2>
          <div className="w-40 h-40 flex items-center justify-center rounded-full bg-blue-600 text-white text-6xl font-bold shadow-lg">
            {totalScore}
          </div>
          <p className="text-gray-600 text-lg mt-2">/28</p>
        </div>

        {/* 📋 Test Details - Transparent Background */}
        <div className="w-2/3">
          <h2 className="text-2xl font-semibold mb-3">Test Details</h2>
          <p>
            <strong>Name:</strong> {username}
          </p>
          <p>
            <strong>Test Name:</strong> {session?.test_topic || "Unknown"}
          </p>
          <p>
            <strong>Session ID:</strong> {evaluation.session_id}
          </p>
          <p>
            <strong>Time Finished:</strong>{" "}
            {new Date(session?.created_at || "").toLocaleString()}
          </p>
          <p>
            <strong>Speaking Time:</strong> {evaluation.speaking_time} seconds
          </p>
          <p>
            <strong>Word Count:</strong> {evaluation.word_count} words
          </p>
        </div>
      </div>

      {/* 📝 Evaluation Sections - Better Layout */}
      <div className="grid grid-cols-2 gap-8 w-full max-w-7xl px-12">
        {/* Pronunciation & Delivery */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-semibold">🗣 Pronunciation & Delivery</h2>
          <p className="text-3xl font-bold">
            {evaluation.pronunciation_delivery_score}/7
          </p>
          <p className="italic text-gray-600">
            {evaluation.pronunciation_delivery_comment}
          </p>
        </div>

        {/* Communication Strategies */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-semibold">💬 Communication Strategies</h2>
          <p className="text-3xl font-bold">
            {evaluation.communication_strategies_score}/7
          </p>
          <p className="italic text-gray-600">
            {evaluation.communication_strategies_comment}
          </p>
        </div>

        {/* Vocabulary & Language Patterns */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-semibold">📖 Vocabulary & Language Patterns</h2>
          <p className="text-3xl font-bold">
            {evaluation.vocabulary_patterns_score}/7
          </p>
          <p className="italic text-gray-600">
            {evaluation.vocabulary_patterns_comment}
          </p>
        </div>

        {/* Ideas & Organization */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-semibold">📝 Ideas & Organization</h2>
          <p className="text-3xl font-bold">
            {evaluation.ideas_organization_score}/7
          </p>
          <p className="italic text-gray-600">
            {evaluation.ideas_organization_comment}
          </p>
        </div>
      </div>
    </div>
  );
}
