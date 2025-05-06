// src/app/evaluation-waiting/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/supabase";
import { motion } from "framer-motion";

function EvaluationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);

  const sessionId = searchParams.get("session_id");
  const userId = searchParams.get("user_id");

  useEffect(() => {
    if (!userId || !sessionId) return;

    // Simulate progress even if we don't know exact status
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 1000);

    const checkInterval = setInterval(async () => {
      const { data } = await supabase
        .from("evaluation")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", sessionId);

      if (data && data.length > 0) {
        clearInterval(checkInterval);
        clearInterval(progressInterval);
        setProgress(100);
        // Add small delay for visual completion
        setTimeout(() => {
          router.push(`/results?user_id=${userId}&session_id=${sessionId}`);
        }, 500);
      }
    }, 3000);

    return () => {
      clearInterval(checkInterval);
      clearInterval(progressInterval);
    };
  }, [userId, sessionId, router]);

  if (!userId || !sessionId) {
    return (
      <div className="fixed inset-0 bg-[#f5f7fa] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md"
        >
          <div className="text-red-500 font-medium mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto mb-4 text-red-500"
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
            Missing session or user information
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
          >
            Return to Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Define steps for the animation
  const steps = [
    "Collecting discussion data...",
    "Analyzing speaking patterns...",
    "Evaluating communication strategies...",
    "Generating feedback...",
    "Preparing results...",
  ];

  // Calculate which step to show based on progress
  const currentStep = Math.min(Math.floor(progress / 20), steps.length - 1);

  return (
    <div className="fixed inset-0 bg-[#f5f7fa] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mx-auto mb-6 w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </motion.div>

        <h1 className="text-3xl font-bold mb-2 text-blue-600">
          Analyzing Your Discussion
        </h1>

        <p className="text-gray-600 mb-6">{steps[currentStep]}</p>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full"
          ></motion.div>
        </div>

        <p className="text-gray-500 text-sm">
          This analysis typically takes less than a minute
        </p>
      </motion.div>
    </div>
  );
}

export default function EvaluationWaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-[#f5f7fa] flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <div className="mx-auto mb-6 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-opacity-75"></div>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-blue-600">
              Loading...
            </h1>
            <p className="text-gray-500">
              Please wait while we prepare your evaluation
            </p>
          </div>
        </div>
      }
    >
      <EvaluationContent />
    </Suspense>
  );
}
