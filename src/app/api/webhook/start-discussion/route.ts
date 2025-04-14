// src/app/api/session/ready-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    acquireResourceId,
    startIndividualRecording,
    startCompositeRecording,
  } from "@/lib/agora/cloudRecording";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // 1. Check if all real (non-AI) participants are ready
    const { data: participants, error: fetchError } = await supabase
      .from("participants")
      .select("user_id, ready, is_ai")
      .eq("session_id", session_id);

    if (fetchError || !participants) {
      return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
    }

    const realParticipants = participants.filter((p) => !p.is_ai);
    const allReady = realParticipants.every((p) => p.ready);

    if (!allReady) {
      return NextResponse.json({ message: "Not all participants are ready yet." });
    }

    // 2. Acquire resource ID for Cloud Recording
    const resourceId = await acquireResourceId(session_id);

    // 3. Update session status to 'discussion'
    const discussionStartTime = new Date().toISOString();
    const { error: statusError } = await supabase
      .from("sessions")
      .update({ status: "discussion", discussion_start_time: discussionStartTime, cloud_resource_id: resourceId })
      .eq("id", session_id);

    if (statusError) {
      console.error("❌ Failed to update session status:", statusError);
      return NextResponse.json({ error: "Failed to update session status" }, { status: 500 });
    }

    // 4. Start Cloud Recording
    await startIndividualRecording(resourceId, session_id);
    await startCompositeRecording(resourceId, session_id);

    // 5. Broadcast ready
    const channel = supabase.channel(`session_status_${session_id}`);
    await channel.send({
      type: "broadcast",
      event: "status",
      payload: {
        status: "ready",
        discussion_start_time: discussionStartTime,
      },
    });

    return NextResponse.json({ message: "All participants ready. Discussion started." });
  } catch (error) {
    console.error("❌ Internal error in ready-check:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
