"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../supabase";
import { useRef } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { createClient } from "@/lib/supabase/client";

// Types
interface Participant {
  id: string;
  name: string;
  is_ai: boolean;
  session_id: string;
}

interface SessionStatus {
  id: string;
  session_code: string;
  status: string;
  current_speaker_id: string | null;
  topic: string;
  test_topic: string;
  discussion_start_time: string | null;
}

export default function DiscussionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(
    null
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(480); // 8 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<Participant | null>(
    null
  );
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [agoraClient, setAgoraClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Disable navigation and handle page refresh/close
  useEffect(() => {
    // Handle page refresh and close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    // Handle navigation attempts
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);

    // Cleanup function
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Get session information and sync time
  const fetchSessionStatus = async () => {
    if (!code) return;

    try {
      console.log("Fetching session status...");
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_code", code)
        .single();

      if (sessionError || !session) {
        setError("Session not found");
        setLoading(false);
        return;
      }

      // If session status is not discussion, redirect to appropriate page
      if (session.status !== "discussion") {
        console.log("Current session status:", session.status);
        if (session.status === "evaluation") {
          console.log("Session status changed to evaluation, redirecting...");
          router.replace(`/session/evaluation?code=${code}`);
          return;
        }
        setError(`Invalid session status: ${session.status}`);
        setLoading(false);
        return;
      }

      let currentSession = session;

      // If discussion_start_time is not set, set it now
      if (!currentSession.discussion_start_time) {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("sessions")
          .update({
            status: "discussion",
            discussion_start_time: now,
          })
          .eq("id", currentSession.id);

        if (updateError) {
          console.error("Error updating session status:", updateError);
          setError("Failed to initialize discussion timer");
          setLoading(false);
          return;
        }

        // Fetch updated session to ensure we have the latest data
        const { data: updatedSession, error: refreshError } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", currentSession.id)
          .single();

        if (refreshError || !updatedSession) {
          console.error("Error refreshing session data:", refreshError);
          setError("Failed to refresh session data");
          setLoading(false);
          return;
        }

        // Use the updated session data
        currentSession = updatedSession;
      }

      // Calculate remaining time based on discussion_start_time
      const startTime = new Date(
        currentSession.discussion_start_time
      ).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remainingSeconds = Math.max(0, 480 - elapsedSeconds); // 480 seconds = 8 minutes

      console.log("Time sync - Remaining seconds:", remainingSeconds);

      // Only update time if the difference is more than 2 seconds
      if (Math.abs(remainingSeconds - timeRemaining) > 2) {
        console.log(
          "Adjusting time - Local:",
          timeRemaining,
          "Server:",
          remainingSeconds
        );
        setTimeRemaining(remainingSeconds);
      }

      setSessionStatus(currentSession);
      setLoading(false);

      // If time is already up, proceed to evaluation
      if (remainingSeconds <= 0) {
        handleDiscussionComplete();
      }
    } catch (err) {
      console.error("Error fetching session:", err);
      setError("Failed to fetch session data");
      setLoading(false);
    }
  };

  // Fetch participants
  const fetchParticipants = async () => {
    if (!code) return;

    try {
      // First get the session ID
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("id")
        .eq("session_code", code)
        .single();

      if (sessionError || !session) {
        throw sessionError || new Error("Session not found");
      }

      // Then fetch participants using session_id
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("session_id", session.id);

      if (error) throw error;

      setParticipants(data || []);

      // Set current speaker if exists
      if (sessionStatus?.current_speaker_id) {
        const speaker = data?.find(
          (p) => p.id === sessionStatus.current_speaker_id
        );
        setCurrentSpeaker(speaker || null);
      }
    } catch (err) {
      console.error("Error fetching participants:", err);
      setError("Failed to fetch participants");
    }
  };

  // Handle discussion completion
  const handleDiscussionComplete = async () => {
    if (!sessionStatus) return;

    try {
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ status: "evaluation" })
        .eq("id", sessionStatus.id);

      if (updateError) {
        throw updateError;
      }

      router.replace(`/session/evaluation?code=${code}`);
    } catch (err) {
      console.error("Error updating session status:", err);
      setError("Failed to proceed to evaluation");
    }
  };

  // Subscribe to session changes
  useEffect(() => {
    if (!code) return;

    console.log("Setting up realtime subscription for session:", code);
    const channel = supabase
      .channel(`session_status_${code}`)
      .on(
        "postgres_changes" as any, // Type assertion to fix the type error
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `session_code=eq.${code}`,
        },
        (payload: { new: SessionStatus | null }) => {
          console.log("Received session update:", payload);
          if (!payload.new) {
            console.log("No new data in payload");
            return;
          }

          const newStatus = payload.new.status;
          console.log("New session status:", newStatus);

          if (newStatus === "evaluation") {
            console.log("Session status changed to evaluation, redirecting...");
            router.replace(`/session/evaluation?code=${code}`);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to session changes");
        } else {
          console.log("Subscription status:", status);
        }
      });

    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [code, router]);

  // Local countdown effect
  useEffect(() => {
    if (loading || error || !sessionStatus || timeRemaining <= 0) return;

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          handleDiscussionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [loading, error, sessionStatus, timeRemaining]);

  // Update video displays
  useEffect(() => {
    const updateVideoDisplays = async () => {
      // Wait for all required data to be available
      if (!isMediaReady) {
        console.log("Media not ready yet, waiting...");
        return;
      }

      if (!participants?.length) {
        console.log("No participants available yet");
        return;
      }

      if (!localVideoTrack) {
        console.log("Local video track not available yet");
        return;
      }

      if (!sessionStatus?.current_speaker_id) {
        console.log("Current speaker ID not available yet");
        return;
      }

      try {
        // Handle local video
        const localPreviewContainer = document.getElementById(
          "local-video-container"
        );
        if (localPreviewContainer && localVideoTrack) {
          console.log("Playing local video track");
          await localVideoTrack.play(localPreviewContainer);
        }

        // Handle remote videos for real participants only
        console.log("Processing remote users:", remoteUsers.length);
        for (const user of remoteUsers) {
          const participant = participants.find((p) => p.id === user.uid);
          if (!participant || participant.is_ai) continue;

          const remoteContainer = document.getElementById(
            `remote-video-${user.uid}`
          );
          if (remoteContainer && user.videoTrack) {
            console.log("Playing remote video for user:", user.uid);
            await user.videoTrack.play(remoteContainer);
          }
          if (user.audioTrack) {
            console.log("Playing remote audio for user:", user.uid);
            await user.audioTrack.play();
          }
        }
      } catch (error) {
        console.error("Error playing video streams:", error);
      }
    };

    updateVideoDisplays();

    return () => {
      console.log("Cleaning up video displays");
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
      remoteUsers.forEach((user) => {
        if (user.videoTrack) {
          user.videoTrack.stop();
        }
        if (user.audioTrack) {
          user.audioTrack.stop();
        }
      });
    };
  }, [participants, localVideoTrack, remoteUsers, sessionStatus, isMediaReady]);

  // Initialize Agora and join channel
  const initializeAgora = async () => {
    if (!code || !sessionStatus) {
      console.log("Missing required data for Agora initialization");
      return false;
    }

    try {
      console.log("Starting Agora initialization...");

      // 1. Create and initialize client
      console.log("Creating Agora client...");
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      setAgoraClient(client);

      // 2. Join channel
      console.log("Joining channel with code:", code);
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
      if (!appId) {
        throw new Error("Agora App ID not found");
      }
      await client.join(appId, code, null, sessionStatus.current_speaker_id!);
      console.log("Successfully joined channel");

      // 3. Create local tracks
      console.log("Creating local tracks...");
      const [audioTrack, videoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();
      console.log("Local tracks created successfully");

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // 4. Publish tracks
      console.log("Publishing local tracks...");
      await client.publish([audioTrack, videoTrack]);
      console.log("Local tracks published successfully");

      // 5. Set up event listeners
      client.on("user-published", async (user, mediaType) => {
        console.log("Remote user published:", user.uid, mediaType);
        const participant = participants.find((p) => p.id === user.uid);
        if (!participant?.is_ai) {
          await client.subscribe(user, mediaType);
          console.log("Subscribed to user:", user.uid, mediaType);

          if (mediaType === "video") {
            setRemoteUsers((prev) => [
              ...prev.filter((u) => u.uid !== user.uid),
              user,
            ]);
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        }
      });

      // 6. Check for real participants
      const realParticipants = participants.filter((p) => !p.is_ai);
      console.log("Real participants count:", realParticipants.length);

      if (realParticipants.length <= 1) {
        console.log("Single real participant detected, proceeding immediately");
        setIsMediaReady(true);
        return true;
      }

      // 7. Set media ready state
      console.log("Setting media ready state...");
      setIsMediaReady(true);
      return true;
    } catch (error: any) {
      console.error("Agora initialization failed:", error);
      setError(
        `Failed to initialize video call: ${error.message || "Unknown error"}`
      );
      return false;
    }
  };

  // Main initialization effect
  useEffect(() => {
    const initialize = async () => {
      if (!code) {
        console.log("No session code provided");
        setError("No session code provided");
        return;
      }

      try {
        setLoading(true);
        console.log("Starting initialization process...");

        // 1. Fetch session data
        console.log("Fetching session data...");
        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .select("*")
          .eq("session_code", code)
          .single();

        if (sessionError || !session) {
          throw sessionError || new Error("Session not found");
        }
        console.log("Session data fetched successfully");
        setSessionStatus(session);

        // 2. Fetch participants
        console.log("Fetching participants...");
        const { data: participantsData, error: participantsError } =
          await supabase
            .from("participants")
            .select("*")
            .eq("session_id", session.id);

        if (participantsError) throw participantsError;
        console.log(
          "Participants fetched successfully:",
          participantsData?.length
        );
        setParticipants(participantsData || []);

        // 3. Initialize Agora
        console.log("Starting Agora initialization...");
        const agoraInitialized = await initializeAgora();
        if (!agoraInitialized) {
          throw new Error("Failed to initialize Agora");
        }
        console.log("Agora initialized successfully");

        // 4. Update session status
        console.log("Updating session status...");
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("sessions")
          .update({
            status: "discussion",
            discussion_start_time: now,
          })
          .eq("id", session.id);

        if (updateError) throw updateError;
        console.log("Session status updated successfully");

        setLoading(false);
      } catch (err: any) {
        console.error("Initialization failed:", err);
        setError(err.message || "Failed to initialize session");
        setLoading(false);
      }
    };

    initialize();

    return () => {
      console.log("Cleaning up resources...");
      localAudioTrack?.close();
      localVideoTrack?.close();
      agoraClient?.leave();
    };
  }, [code]);

  // Show loading overlay when initializing
  if (loading || !isMediaReady) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">
            {!isMediaReady
              ? "Waiting for all participants to connect..."
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold text-center mb-4">Discussion Time</h1>
      <div className="text-center mb-4">
        <p className="text-blue-600 font-semibold">
          Time remaining: {Math.floor(timeRemaining / 60)}:
          {String(timeRemaining % 60).padStart(2, "0")}
        </p>
        <p className="text-gray-600">Please take turns to discuss the topic.</p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Local Video */}
        <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
          <div id="local-video-container" className="absolute inset-0"></div>
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
            You (Speaker)
          </div>
        </div>

        {/* Remote Videos */}
        {remoteUsers.map((user) => {
          const participant = participants.find((p) => p.id === user.uid);
          if (!participant || participant.is_ai) return null;

          return (
            <div
              key={user.uid}
              className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden"
            >
              <div
                id={`remote-video-${user.uid}`}
                className="absolute inset-0"
              ></div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                {participant.name}
              </div>
            </div>
          );
        })}

        {/* AI Participants */}
        {participants
          .filter((p) => p.is_ai)
          .map((aiParticipant) => (
            <div
              key={aiParticipant.id}
              className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                  <img
                    src="/ai-avatar.png"
                    alt="AI Avatar"
                    className="w-12 h-12"
                  />
                </div>
                <p className="text-gray-600">{aiParticipant.name}</p>
              </div>
            </div>
          ))}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Discussion Topic</h2>
        <p className="text-gray-700">{sessionStatus?.topic || "Loading..."}</p>
      </div>

      {/* Video Controls */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg px-6 py-3 flex gap-4">
        <button
          onClick={async () => {
            if (localAudioTrack) {
              await localAudioTrack.setEnabled(!localAudioTrack.enabled);
              setIsAudioEnabled(!isAudioEnabled);
            }
          }}
          className={`p-3 rounded-full ${
            isAudioEnabled ? "bg-blue-100" : "bg-red-100"
          }`}
        >
          {isAudioEnabled ? "🎤" : "🔇"}
        </button>
        <button
          onClick={async () => {
            if (localVideoTrack) {
              await localVideoTrack.setEnabled(!localVideoTrack.enabled);
              setIsVideoEnabled(!isVideoEnabled);
            }
          }}
          className={`p-3 rounded-full ${
            isVideoEnabled ? "bg-blue-100" : "bg-red-100"
          }`}
        >
          {isVideoEnabled ? "📹" : "🚫"}
        </button>
      </div>
    </div>
  );
}
