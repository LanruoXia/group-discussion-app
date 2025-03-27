"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateSessionPage() {
  const [aiCount, setAiCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    // 从 sessionStorage 获取用户信息
    const name = sessionStorage.getItem("username");
    const uid = sessionStorage.getItem("user_id");
    setUsername(name);
    setUserId(uid);

    if (!name || !uid) {
      alert("⚠️ Please login first.");
      router.push("/auth");
    }
  }, [router]);

  const handleCreate = async () => {
    if (!username || !userId) return;

    setCreating(true);
    console.log("📤 Creating session:", {
      creator: username,
      user_id: userId,
      aiCount,
    });

    try {
      const res = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator: username,
          user_id: userId,
          aiCount,
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

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">
        🧩 Create Group Session
      </h1>

      <label className="block mb-2 font-medium">
        How many AI participants?
      </label>
      <select
        value={aiCount}
        onChange={(e) => setAiCount(parseInt(e.target.value))}
        className="w-full p-2 border rounded mb-6"
      >
        {[0, 1, 2, 3].map((num) => (
          <option key={num} value={num}>
            {num}
          </option>
        ))}
      </select>

      <button
        onClick={handleCreate}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={creating}
      >
        {creating ? "Creating..." : "Create Session"}
      </button>
    </div>
  );
}
