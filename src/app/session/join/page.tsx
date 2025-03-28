"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinWaitingRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromURL = searchParams.get("code") || "";

  const [sessionCode, setSessionCode] = useState(codeFromURL);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const username = sessionStorage.getItem("username");
    const user_id = sessionStorage.getItem("user_id"); // 新增：获取 user_id

    if (!username || !user_id) {
      alert("Please login first");
      router.push("/auth");
      return;
    }

    setJoining(true);
    console.log("Joining session with:", {
      code: sessionCode,
      username,
      user_id,
    });

    const res = await fetch("/api/session/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: sessionCode, username, user_id }),
    });

    const data = await res.json();
    if (res.ok) {
      // 跳转到等待室页面（嵌套路由或通过 router.push 均可）
      router.push(`/session/join/waiting-room?code=${sessionCode}`);
    } else {
      alert("Failed to join: " + data.error);
    }

    setJoining(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Join a Group Session</h1>
      <input
        type="text"
        value={sessionCode}
        onChange={(e) => setSessionCode(e.target.value)}
        placeholder="Enter session code"
        className="w-full p-2 border rounded mb-4"
      />
      <button
        onClick={handleJoin}
        className="w-full bg-blue-700 text-white py-2 rounded"
        disabled={joining}
      >
        {joining ? "Joining..." : "Join Session"}
      </button>
    </div>
  );
}
