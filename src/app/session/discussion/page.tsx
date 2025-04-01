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
          router.replace("/");
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.replace("/auth");
          return;
        }

        // Get user details from session
        const userId = session.user.id;
        const { data: userProfile, error: userError } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", userId)
          .single();

        if (userError) {
          throw userError;
        }

        const userName = userProfile?.name || userId;

        // Redirect to discussion room with necessary parameters
        router.replace(
          `/discussion-room?channel=${code}&uid=${userName}&autoJoin=true`
        );
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
