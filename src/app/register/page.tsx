"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // **Step 1: Check if the username already exists**
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      setError("Username already exists. Please choose a different one.");
      setLoading(false);
      return;
    }

    // **Step 2: Insert new user into database**
    const { error: insertError } = await supabase
      .from("users")
      .insert([{ username, password }]); // Consider hashing the password for security.

    if (insertError) {
      setError("❌ Registration failed. Please try again later.");
      setLoading(false);
      return;
    }

    // **Step 3: Show success message and let user choose when to navigate**
    setSuccessMessage(
      "✅ Registration successful! Click the button below to log in."
    );
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Register</h1>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        {/* Show error message */}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Show success message with login button */}
        {successMessage ? (
          <div className="text-center">
            <p className="text-green-500 mb-4">{successMessage}</p>
            <button
              onClick={() => router.push("/auth")}
              className="w-full bg-blue-500 text-white py-2 rounded"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
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
              onClick={handleRegister}
              className="w-full bg-blue-500 text-white py-2 rounded"
              disabled={loading}
            >
              {loading ? "Registering..." : "Sign Up"}
            </button>

            <p className="mt-4 text-center">
              Already have an account?{" "}
              <a href="/auth" className="text-blue-500 hover:underline">
                Log in here
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
