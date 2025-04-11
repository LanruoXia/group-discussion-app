// src/app/evaluation-waiting/page.tsx
"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/supabase";

function EvaluationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id");
  const userId = searchParams.get("user_id");

  useEffect(() => {
    if (!userId || !sessionId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("evaluation")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", sessionId);

      if (data && data.length > 0) {
        clearInterval(interval);
        router.push(`/results?user_id=${userId}&session_id=${sessionId}`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userId, sessionId, router]);

  if (!userId || !sessionId) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Missing session or user information.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4 text-blue-600">Evaluating...</h1>
        <p className="text-gray-600">
          We are analyzing your discussion performance.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          This may take up to 30 seconds.
        </p>
        <div className="mt-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationWaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-blue-600">
              Loading...
            </h1>
            <div className="mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50 mx-auto"></div>
            </div>
          </div>
        </div>
      }
    >
      <EvaluationContent />
    </Suspense>
  );
}
