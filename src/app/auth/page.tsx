"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase"; // Ensure correct Supabase connection

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // **Step 1: Query Supabase to fetch user**
      const { data, error } = await supabase
        .from("users")
        .select("id, username, password")
        .eq("username", username)
        .single(); // Fetch a single user

      // ✅ **Handle "No user found" and unexpected errors separately**
      if (error) {
        if (error.code === "PGRST116") {
          setError("❌ Invalid username or password.");
        } else {
          setError("⚠️ Unexpected error, please try again.");
        }
        setLoading(false); // **Ensure button resets to "Login"**
        return;
      }

      // **Step 2: Check if password matches**
      if (!data || data.password !== password) {
        setError("❌ Invalid username or password.");
        setLoading(false); // **Reset button**
        return;
      }

      // **Step 3: Store user_id in sessionStorage**
      sessionStorage.setItem("user_id", data.id);
      sessionStorage.setItem("username", data.username);

      // ✅ **Step 4: Notify Navbar to update**
      window.dispatchEvent(new Event("storage"));

      // **Step 5: Redirect to Home Page**
      router.push("/");
    } catch (err) {
      console.error("⚠️ Login error:", err);
      setError("⚠️ Unexpected error, please try again.");
    } finally {
      setLoading(false); // **Ensure button resets regardless of outcome**
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Login</h1>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <label className="block font-semibold">Username:</label>
        <input
          type="text"
          className="w-full p-2 border rounded mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="block font-semibold">Password:</label>
        <input
          type="password"
          className="w-full p-2 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="mt-4 text-center">
          Don&apos;t have an account? Register now!
          <a href="/register" className="text-blue-500 hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
