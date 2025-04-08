// /src/app/api/session/mark-ready/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id } = await req.json();

    if (!session_id || !user_id) {
      return NextResponse.json({ error: "Missing session_id or user_id" }, { status: 400 });
    }

    // 1. Mark this participant as ready
    const { error: updateError } = await supabase
      .from("participants")
      .update({ ready: true })
      .eq("session_id", session_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("❌ Failed to update participant ready:", updateError);
      return NextResponse.json({ error: "Failed to update ready" }, { status: 500 });
    }

    // 2. Check if all real (non-AI) participants are ready
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
      return NextResponse.json({ message: "Marked as ready. Waiting for others..." });
    }

    // 3. Update session status to 'discussion' and set start time
    const discussionStartTime = new Date().toISOString();
    const { error: statusError } = await supabase
      .from("sessions")
      .update({ status: "discussion", discussion_start_time: discussionStartTime })
      .eq("id", session_id);

    if (statusError) {
      console.error("❌ Failed to update session status:", statusError);
      return NextResponse.json({ error: "Failed to update session status" }, { status: 500 });
    }

    // 4. Broadcast the new session status with start time
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
    console.error("❌ Internal error in mark-ready:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}