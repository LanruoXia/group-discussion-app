// src/app/api/session/ready-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    acquireResourceId,
    startCompositeRecording,
  } from "@/lib/agora/cloudRecording";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
      const payload = await req.json();
      const session_id = payload.record.session_id;
  
      console.log("📥 Incoming ready-check for session:", session_id); // 🔍 LOG
  
      if (!session_id) {
        console.warn("⚠️ Missing session_id in request payload"); // 🔍 LOG
        return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
      }
  
      // 1. Check if all real (non-AI) participants are ready
      const { data: participants, error: fetchError } = await supabase
        .from("participants")
        .select("user_id, ready, is_ai")
        .eq("session_id", session_id);
  
      if (fetchError || !participants) {
        console.error("❌ Failed to fetch participants:", fetchError); // 🔍 LOG
        return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
      }
  
      const realParticipants = participants.filter((p) => !p.is_ai);
      const allReady = realParticipants.every((p) => p.ready);
  
      console.log("✅ Real participants readiness:", realParticipants, "→ allReady =", allReady); // 🔍 LOG
  
      if (!allReady) {
        return NextResponse.json({ message: "Not all participants are ready yet." });
      }
  
      // 2. Get session code
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("session_code")
        .eq("id", session_id)
        .single();
  
      if (sessionError || !sessionData) {
        console.error("❌ Failed to fetch session code:", sessionError); // 🔍 LOG
        return NextResponse.json({ error: "Failed to fetch session code" }, { status: 500 });
      }
  
      const session_code = sessionData.session_code;
      console.log("🎯 Session code retrieved:", session_code); // 🔍 LOG
  
      // 3. Acquire Cloud Recording resource ID
      const resourceId = await acquireResourceId(session_code, "123");
      console.log("🆔 Acquired Cloud Recording resourceId:", resourceId); // 🔍 LOG
  
      // 4. Update session status
      const discussionStartTime = new Date().toISOString();
      const { error: statusError } = await supabase
        .from("sessions")
        .update({ status: "discussion", discussion_start_time: discussionStartTime })
        .eq("id", session_id);
  
      if (statusError) {
        console.error("❌ Failed to update session status:", statusError); // 🔍 LOG
        return NextResponse.json({ error: "Failed to update session status" }, { status: 500 });
      }
  
      console.log("🕒 Session status updated to 'discussion' at", discussionStartTime); // 🔍 LOG
  
      // 5. Start Cloud Recording
      const recordingInfo = await startCompositeRecording(resourceId, session_code, "123");
      console.log("📹 Started Cloud Recording:", recordingInfo); // 🔍 LOG
  
      await supabase
        .from("sessions")
        .update({
          cloud_recording_resource_id: resourceId,
          cloud_recording_sid: recordingInfo.taskId,
        })
        .eq("id", session_id);
  
      console.log("💾 Recording info saved to Supabase"); // 🔍 LOG
  
      // 6. Broadcast to session_status channel
      const channel = supabase.channel(`session_status_${session_id}`);
      await channel.send({
        type: "broadcast",
        event: "status",
        payload: {
          status: "ready",
          discussion_start_time: discussionStartTime,
        },
      });
  
      console.log("📡 Broadcasted 'ready' status to session_status_" + session_id); // 🔍 LOG
  
      return NextResponse.json({ message: "All participants ready. Discussion started." });
    } catch (error) {
      console.error("❌ Internal error in start-recording:", error); // 🔍 LOG
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }