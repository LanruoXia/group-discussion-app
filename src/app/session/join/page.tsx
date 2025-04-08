"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../supabase";

// 包装组件
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

      // 6. 添加用户到participants
      const { error: joinError } = await supabase.from("participants").insert([
        {
          session_id: session.id,
          user_id: authSession.user.id,
          is_ai: false,
          username: userName,
        },
      ]);

      if (joinError) {
        setError("Failed to join session.");
        setLoading(false);
        return;
      }

      // 7. 成功加入，跳转到waiting room
      router.push(`/session/join/waiting-room?code=${code}`);
    } catch (err) {
      console.error("Error joining session:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <div className="space-x-4">
            <button
              onClick={() => router.push("/session/create")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Create New Session
            </button>
            <button
              onClick={() => {
                setError(null);
                setCode("");
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Join Session</h1>
        <form onSubmit={handleJoin}>
          <div className="mb-4">
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Session Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter session code"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Session"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 主组件
export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin inline-block rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
