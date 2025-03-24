"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const Home = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [channel, setChannel] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    setUsername(storedUsername);

    const handleStorageChange = () => {
      setUsername(sessionStorage.getItem("username"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel) return;
    if (!username) {
      alert("⚠️ 请先登录后再加入频道");
      router.push("/auth"); // 跳转到登录页
      return;
    }

    // 跳转到视频页面，并将频道名作为 URL 参数
    router.push(`/video?channel=${channel}&uid=${username}`);
  };

  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-3xl font-bold mb-6">Hi {username ?? "Guest"} 👋</h1>

      <form onSubmit={handleJoin} className="space-y-4 w-80">
        <input
          type="text"
          placeholder="Enter channel name"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Join Video Channel
        </button>
      </form>
    </div>
  );
};

export default Home;
