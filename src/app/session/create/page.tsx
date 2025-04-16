"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase"; // 使用统一的 supabase 实例

const TEACHER_EMAIL_DOMAIN = "teacher.hkdse.edu.hk"; // 教师邮箱域名

export default function CreateSessionPage() {
  const [aiCount, setAiCount] = useState(0);
  const [testTopic, setTestTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  const router = useRouter();
  const testTopics = [
    "Should AI Replace Human Teachers?",
    "Money or Coins",
    "Taking Photos in Public Areas",
  ];

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();

        // 根据邮箱域名判断是否为教师
        const isTeacherEmail = session.user.email?.endsWith(
          `@${TEACHER_EMAIL_DOMAIN}`
        );

        setName(profile?.name || session.user.email?.split("@")[0] || null);
        setUserId(session.user.id);
        setIsTeacher(isTeacherEmail || false);
        setLoading(false);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.replace("/auth");
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleCreate = async () => {
    if (!name || !userId || !testTopic) {
      alert("Please fill in all required fields");
      return;
    }

    setCreating(true);
    console.log("📤 Creating session:", {
      creator: name,
      user_id: userId,
      aiCount,
      testTopic,
      ...(isTeacher && { instructions }),
    });

    try {
      const res = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator: name,
          user_id: userId,
          aiCount,
          testTopic,
          ...(isTeacher && { instructions }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to create session:", data.error);
        alert("Failed to create session: " + (data.error || "Unknown error"));
      } else {
        console.log("Session created:", data.session_id, data.session_code);
        router.push(`/session/join?code=${data.session_code}`);
      }
    } catch (err) {
      console.error("Network error while creating session:", err);
      alert("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Create a Group Interaction Session
      </h1>

      <div className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block mb-2 font-medium text-gray-700">
            Test Topic *
          </label>
          <select
            value={testTopic}
            onChange={(e) => setTestTopic(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>
              Please select a topic
            </option>
            {testTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        {isTeacher && (
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Instructions (Teacher Only)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter instructions for participants"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
            />
          </div>
        )}

        <div>
          <label className="block mb-2 font-medium text-gray-700">
            Number of AI Participants
          </label>
          <select
            value={aiCount}
            onChange={(e) => setAiCount(parseInt(e.target.value))}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[0, 1, 2, 3].map((num) => (
              <option key={num} value={num}>
                {num} AI {num === 1 ? "Participant" : "Participants"}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={creating || !testTopic}
        >
          {creating ? (
            <span className="flex items-center justify-center">
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
              Creating Session...
            </span>
          ) : (
            "Create Session"
          )}
        </button>
      </div>
    </div>
  );
}
