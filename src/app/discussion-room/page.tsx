"use client";

import dynamic from "next/dynamic";

// Disable SSR: Component will only render on client-side to avoid window errors
const DiscussionClient = dynamic(
  () => import("../components/DiscussionClient"),
  {
    ssr: false,
  }
);

export default function DiscussionRoomPage() {
  return <DiscussionClient />;
}
