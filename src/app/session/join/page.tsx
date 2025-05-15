"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../supabase";
import { motion } from "framer-motion";
import Link from "next/link";

// Wrapper component with Suspense for loading state
function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromURL = searchParams.get("code") || "";

  const [code, setCode] = useState(codeFromURL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. 验证session是否存在
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_code", code)
        .single();

      if (sessionError || !session) {
        setError("Session not found. Please check your session code.");
        setLoading(false);
        return;
      }

      // 2. 检查session是否过期
      const expiryTime = new Date(session.expires_at).getTime();
      const now = Date.now();
      if (now > expiryTime) {
        setError("This session has expired.");
        setLoading(false);
        return;
      }

      // 3. 获取当前用户信息
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (!authSession) {
        setError("Please sign in to join a session.");
        setLoading(false);
        return;
      }

      // 获取用户的profile信息
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", authSession.user.id)
        .single();

      if (profileError) {
        setError("Failed to get user profile.");
        setLoading(false);
        return;
      }

      const userName =
        profile?.name || authSession.user.email?.split("@")[0] || "Anonymous";

      // 4. 检查用户是否已在该session中
      const { data: existingParticipant } = await supabase
        .from("participants")
        .select("*")
        .eq("session_id", session.id)
        .eq("user_id", authSession.user.id)
        .single();

      if (existingParticipant) {
        setError(
          "You are already participating in this session in another window or device."
        );
        setLoading(false);
        return;
      }

      // 5. 检查参与者数量
      const { data: participants, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .eq("session_id", session.id);

      if (participantsError) {
        setError("Failed to check participant count.");
        setLoading(false);
        return;
      }

      if (participants.length >= 4) {
        setError("This session is full (4 participants maximum).");
        setLoading(false);
        return;
      }
      const baseUid =
        Math.abs(
          (authSession.user.id + session.id)
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0)
        ) % 100000;

      // 6. 添加用户到participants
      const { error: joinError } = await supabase.from("participants").insert([
        {
          session_id: session.id,
          user_id: authSession.user.id,
          is_ai: false,
          username: userName,
          agora_uid: baseUid,
        },
      ]);

      if (joinError) {
        setError("Failed to join session.");
        setLoading(false);
        return;
      }

      // 7. 成功加入，跳转到waiting room
      router.push(`/session/waiting-room?code=${code}`);
    } catch (err) {
      console.error("Error joining session:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
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
              className="w-12 h-12"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-red-600 text-xl font-semibold mb-4"
          >
            {error}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6"
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
              onClick={() => {
                setError(null);
                setCode("");
              }}
              className="px-5 py-2.5 bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 rounded-xl font-medium shadow-md transition-colors duration-200"
            >
              Try Again
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg"
    >
      <div className="w-full border-l-4 border-blue-600 pl-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Join Session</h1>
        <p className="text-gray-600 mt-1">Enter a session code to join</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md"
        >
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleJoin} className="space-y-6">
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Session Code
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </span>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            The code is 6 characters and was shared by your teacher or session
            creator
          </p>
        </div>

        <motion.button
          type="submit"
          whileHover={{
            scale: 1.03,
            boxShadow: "0px 5px 15px rgba(37, 99, 235, 0.3)",
          }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 px-4 flex justify-center items-center rounded-xl text-white font-medium ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          }`}
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Validating...</span>
            </div>
          ) : (
            "Join Session"
          )}
        </motion.button>

        <div className="flex justify-center mt-4">
          <Link href="/" passHref>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-gray-600 hover:text-blue-600 text-sm font-medium underline"
            >
              Back to Home
            </motion.button>
          </Link>
        </div>
      </form>
    </motion.div>
  );
}

// Main component with Suspense wrapper
export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa]">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
            <div className="mt-4 text-lg text-blue-600 font-medium">
              Loading...
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f7fa] p-4">
        <JoinPageContent />
      </div>
    </Suspense>
  );
}
