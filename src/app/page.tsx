"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

const Home = () => {
  const [name, setName] = useState<string | null>(null);
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();

        if (profile?.name) {
          setName(profile.name);
        } else {
          setName(session.user.email?.split("@")[0] || null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();

    const handleStorageChange = () => {
      fetchUserProfile();
    };

    window.addEventListener("profile-updated", handleStorageChange);

    return () => {
      window.removeEventListener("profile-updated", handleStorageChange);
    };
  }, [router]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel) return;
    if (!name) {
      alert("⚠️ Please login before joining.");
      router.push("/auth");
      return;
    }
    router.push(`/video?channel=${channel}&uid=${name}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center mt-20 px-4">
        <div className="text-xl font-medium text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-20 px-4">
      <h1 className="text-3xl font-bold mb-6">Hi {name ?? "Guest"} 👋</h1>

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
