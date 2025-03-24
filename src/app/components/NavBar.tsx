"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

export default function NavBar() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const userID = sessionStorage.getItem("user_id");
      if (!userID) {
        console.warn("No user_id found in sessionStorage");
        setUser(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, username")
        .eq("id", userID)
        .single();

      if (error || !data) {
        console.error("Error fetching user:", error);
        setUser(null);
      } else {
        console.log("Fetched user:", data);
        setUser(data);
      }
    };

    fetchUser();

    // **监听 sessionStorage 变化**
    const handleStorageChange = () => fetchUser();
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("username");
    setUser(null);
    await supabase.auth.signOut(); // 如果使用 Supabase Auth
    window.dispatchEvent(new Event("storage")); // 通知 NavBar 立即更新
    router.refresh(); // 强制刷新页面，重新加载 NavBar
  };

  return (
    <nav className="bg-blue-500 p-4 text-white flex justify-between items-center">
      <div className="space-x-4">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/evaluate" className="hover:underline">
          Evaluate
        </Link>
        <Link href="/results" className="hover:underline">
          Results
        </Link>
      </div>

      {user ? (
        <div className="flex items-center space-x-4">
          <span>👤 {user.username}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded text-white border border-white hover:bg-blue-600 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      ) : (
        <Link
          href="/auth"
          className="bg-gray-300 px-3 py-1 rounded text-black hover:bg-gray-400"
        >
          Login
        </Link>
      )}
    </nav>
  );
}
