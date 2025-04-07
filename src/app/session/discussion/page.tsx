"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DiscussionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      try {
        if (!code) {
          console.log("No session code provided");
          router.replace("/");
          return;
        }

        console.log("Checking session for code:", code);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error details:", {
            message: sessionError.message,
            status: sessionError.status,
            name: sessionError.name,
          });
          throw sessionError;
        }

        if (!session) {
          console.log("No active session found, redirecting to auth");
          router.replace("/auth");
          return;
        }

        // Get user ID
        const userId = session.user.id;

        // First, get the session ID from the sessions table using the code
        console.log("Looking up session ID by session_code:", code);
        const { data: sessionData, error: sessionLookupError } = await supabase
          .from("sessions")
          .select("id")
          .eq("session_code", code)
          .single();

        if (sessionLookupError) {
          console.error(
            "Error looking up session by code:",
            sessionLookupError
          );
          throw new Error(
            `Could not find session with code: ${code}. Error: ${sessionLookupError.message}`
          );
        }

        if (!sessionData) {
          console.error("No session found with code:", code);
          throw new Error(`Session not found with code: ${code}`);
        }

        const sessionId = sessionData.id;
        console.log("Found session with ID:", sessionId);

        // Now use the actual session ID to get participants
        console.log("Fetching participants for session ID:", sessionId);
        const { data: participants, error: participantsError } = await supabase
          .from("participants")
          .select("user_id, is_ai")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (participantsError) {
          console.error("Error fetching participants:", participantsError);
          throw new Error(
            `Failed to fetch participants: ${participantsError.message}`
          );
        }

        if (!participants || participants.length === 0) {
          console.log("No participants found for session ID:", sessionId);
          throw new Error("No participants found for this session");
        }

        console.log("Found participants:", participants);

        // Assign display names (A, B, C, D) based on join order
        const displayNames = ["A", "B", "C", "D"];
        const participantIndex = participants.findIndex(
          (p) => p.user_id === userId
        );

        if (participantIndex === -1) {
          console.warn("User not found in participants list");
        }

        const displayName =
          participantIndex >= 0 ? displayNames[participantIndex] : "Unknown";

        console.log("Assigned display name:", displayName);

        // Redirect to discussion room with user ID and display name
        const redirectUrl = `/discussion-room?channel=${code}&uid=${userId}&displayName=${displayName}`;
        console.log("Redirecting to:", redirectUrl);
        router.replace(redirectUrl);
      } catch (err) {
        console.error("Error checking session:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    checkSessionAndRedirect();
  }, [code, router, supabase]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.replace("/auth")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Redirecting to discussion room...</p>
      </div>
    </div>
  );
}
