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
      alert("⚠️ Please login before joining.");
      router.push("/auth");
      return;
    }
    router.push(`/video?channel=${channel}&uid=${username}`);
  };

  return (
    <div className="flex flex-col items-center mt-20 px-4">
      <h1 className="text-3xl font-bold mb-6">Hi {username ?? "Guest"} 👋</h1>

      <form onSubmit={handleJoin} className="space-y-4 w-full max-w-xs">
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
          Join Directly
        </button>
      </form>

      <div className="mt-6 space-y-3 w-full max-w-xs">
        <button
          onClick={() => router.push("/session/create")}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Create Group Session
        </button>

        <button
          onClick={() => router.push("/session/join")}
          className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800"
        >
          Join Group Session
        </button>
      </div>
    </div>
  );
};

export default Home;
