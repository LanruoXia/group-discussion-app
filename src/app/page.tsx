"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export default function Home() {
  const [name, setName] = useState<string | null>(null);
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

        setName(profile?.name || session.user.email?.split("@")[0] || null);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    const handleStorageChange = () => fetchUserProfile();
    window.addEventListener("profile-updated", handleStorageChange);
    return () =>
      window.removeEventListener("profile-updated", handleStorageChange);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex flex-col md:flex-row items-center justify-between min-h-screen bg-[#f9fafb] px-6 md:px-24 py-20 gap-10">
      {/* Illustration Section */}
      <div className="relative w-full md:w-[40%] flex justify-center items-center transform -translate-y-15">
        {/* Elliptical Shadow */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-400 opacity-10 blur-md rounded-full z-0" />

        {/* Illustration */}
        <img
          src="/images/home-hkdse-speaking.png"
          alt="Students preparing for HKDSE speaking"
          className="relative z-10 max-w-[90%] h-auto drop-shadow-md animate-float opacity-95 animate-fade-in"
        />
      </div>

      {/* Text Section */}
      <div className="w-full md:w-[50%] text-center md:text-left space-y-6 -translate-y-15">
        <h1 className="text-2xl text-gray-600">Hi, {name} 👋</h1>
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
          Master your HKDSE{" "}
          <span className="whitespace-nowrap">Group Interaction Test</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-md">
          Practice in real-time discussion rooms with instant AI feedback —
          anytime, anywhere.
        </p>

        <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 mt-4">
          <button
            onClick={() => router.push("/session/join")}
            className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-medium shadow transition"
          >
            Join an Existing Room
          </button>
          <button
            onClick={() => router.push("/session/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow transition"
          >
            Create a Room
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500 flex gap-4 justify-center md:justify-start">
          <span>🎯 Improve your performance</span>
          <span>⚡ AI-powered instant feedback</span>
        </div>
      </div>
    </main>
  );
}
