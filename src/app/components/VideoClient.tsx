"use client";

import { useSearchParams } from "next/navigation";
import { useAgora } from "../hooks/useAgora";
import RemoteVideoPlayer from "../components/agora/RemoteVideoPlayer";

export default function VideoClient() {
  const searchParams = useSearchParams();
  const channel = searchParams.get("channel") || "default-room";
  const uid = searchParams.get("uid");

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const { joined, remoteUsers, join, leave, localRef } = useAgora(
    appId,
    channel,
    uid || ""
  );

  if (!uid) {
    if (typeof window !== "undefined") {
      alert("Please login first.");
      window.location.href = "/auth";
    }
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Agora Video Call</h1>
      <p className="mb-4 text-gray-500">
        Channel: <strong>{channel}</strong>
      </p>

      <div className="space-x-4 mb-4">
        {!joined ? (
          <button
            onClick={join}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Join
          </button>
        ) : (
          <button
            onClick={leave}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Leave
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {joined && (
          <div className="relative w-[320px] h-[240px] bg-black text-white">
            <div ref={localRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-60 px-2 py-1 rounded">
              You: {uid}
            </div>
          </div>
        )}

        {remoteUsers.map((user) => (
          <RemoteVideoPlayer key={user.uid} user={user} />
        ))}
      </div>
    </div>
  );
}
