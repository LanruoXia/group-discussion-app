"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Participant = {
  username: string;
  is_ai: boolean;
};

export default function WaitingRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [testTopic, setTestTopic] = useState("");
  const [expired, setExpired] = useState(false);
  const [countdown, setCountdown] = useState(300); // 默认 5 分钟
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    const fetchSession = async () => {
      const res = await fetch(`/api/session/status?code=${code}`);
      const data = await res.json();

      if (!res.ok || !data) {
        setExpired(true);
        return;
      }

      // 如果状态为 expired 或剩余时间为 0，则标记为 expired
      if (data.status === "expired" || data.remaining === 0) {
        setExpired(true);
        return;
      }

      // 使用服务器返回的剩余时间更新本地倒计时
      setCountdown(data.remaining);
      setParticipants(data.participants || []);
      setTestTopic(data.test_topic);
      setLoading(false);
    };

    // 首次调用同步
    fetchSession();
    // 每 30 秒重新同步一次
    const interval = setInterval(fetchSession, 30000);
    return () => clearInterval(interval);
  }, [code]);

  // 本地倒计时，每秒递减
  useEffect(() => {
    if (loading || expired) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, expired]);

  if (expired) {
    return (
      <div className="text-center p-8 text-red-600">
        This session has expired. <br />
        Please{" "}
        <a href="/session/create" className="underline">
          create a new session
        </a>
        .
      </div>
    );
  }

  if (loading) {
    return <div className="text-center p-8">Loading session...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Waiting Room</h1>
      <p className="text-center mb-6">
        Topic: <strong>{testTopic}</strong>
      </p>
      <p className="text-center text-lg mb-4">
        Time remaining:{" "}
        <span className="font-mono text-xl">
          {String(Math.floor(countdown / 60)).padStart(2, "0")}:
          {String(countdown % 60).padStart(2, "0")}
        </span>
      </p>

      <div className="bg-white shadow rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Participants</h2>
        <ul className="list-disc pl-6">
          {participants.map((p, idx) => (
            <li key={idx}>
              {p.username} {p.is_ai ? "(AI)" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
