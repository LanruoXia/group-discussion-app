// src/app/api/session/ready-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    acquireResourceId,
    startCompositeRecording,
    startIndividualRecording,
  } from "@/lib/agora/cloudRecording";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
      const payload = await req.json();
      const session_id = payload.record.session_id;
  
      console.log("📥 Incoming ready-check for session:", session_id); 
  
      if (!session_id) {
        console.warn("⚠️ Missing session_id in request payload"); 
        return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
      }
  
      // 1. Check if all real (non-AI) participants are ready
      const { data: participants, error: fetchError } = await supabase
        .from("participants")
        .select("user_id, ready, is_ai")
        .eq("session_id", session_id);
  
      if (fetchError || !participants) {
        console.error("❌ Failed to fetch participants:", fetchError); 
        return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
      }
  
      const realParticipants = participants.filter((p) => !p.is_ai);
      const allReady = realParticipants.every((p) => p.ready);
  
      console.log("✅ Real participants readiness:", realParticipants, "→ allReady =", allReady);
  
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
        console.error("❌ Failed to fetch session code:", sessionError); 
        return NextResponse.json({ error: "Failed to fetch session code" }, { status: 500 });
      }
  
      const session_code = sessionData.session_code;
      console.log("🎯 Session code retrieved:", session_code); 

      // 3. Check if session is already in discussion mode
      const { data: sessionCheck, error: checkError } = await supabase
        .from("sessions")
        .select("status")
        .eq("id", session_id)
        .maybeSingle();
      if (checkError) {
        console.error("❌ Error checking session status:", checkError);
        return NextResponse.json({ error: "Failed to check session status" }, { status: 500 });
      }

      if (sessionCheck?.status === "discussion") {
        console.log("⏩ Session already started. Skipping duplicate recording trigger.");
        return NextResponse.json({ message: "Session already in discussion mode." });
      }
  
      // 4. Acquire Cloud Recording resource ID
      const compositeResourceId  = await acquireResourceId(session_code, "123");
      const individualResourceId = await acquireResourceId(session_code, "456");
      console.log("🆔 Acquired Composite Recording resourceId:", compositeResourceId );
      console.log("🆔 Acquired Individual Recording resourceId:", individualResourceId );
  
      // 5. Update session status
      const discussionStartTime = new Date().toISOString();

      // 原子更新并加锁：只有 status 为 preparation 时才更新
      const { data: updatedSession, error: lockError } = await supabase
        .from("sessions")
        .update({ status: "discussion", discussion_start_time: discussionStartTime })
        .eq("id", session_id)
        .eq("status", "preparation") // 加锁条件
        .select()
        .maybeSingle();

      if (lockError) {
      console.error("❌ Error updating session with lock:", lockError);
      return NextResponse.json({ error: "Failed to update session with lock (session status is not preparation)" }, { status: 500 });
      }

      if (!updatedSession) {
      console.log("⏩ Session already started. Skipping duplicate recording trigger.");
      return NextResponse.json({ message: "Session already in discussion mode." });
      }
  
      console.log("🕒 Session status updated to 'discussion' at", discussionStartTime); 
  
      // 6. Start Cloud Recording
      const compositeInfo = await startCompositeRecording(compositeResourceId, session_code, "123");
      const individualInfo = await startIndividualRecording(individualResourceId, session_code, "456");
      console.log("📹 Started Cloud Recording:", compositeInfo); 
      console.log("📹 Started Individual Recording:", individualInfo); 
  
      await supabase
      .from("sessions")
      .update({
        cloud_recording_resource_id: compositeResourceId,
        cloud_recording_sid: compositeInfo.taskId,
        individual_recording_resource_id: individualResourceId,
        individual_recording_sid: individualInfo.taskId,
      })
      .eq("id", session_id);
  
      console.log("💾 Recording info saved to Supabase"); 
  
      // 7. Broadcast to session_status channel
      const channel = supabase.channel(`session_status_${session_id}`);
      await channel.send({
        type: "broadcast",
        event: "status",
        payload: {
          status: "ready",
          discussion_start_time: discussionStartTime,
        },
      });
  
      console.log("📡 Broadcasted 'ready' status to session_status_" + session_id); 
  
      return NextResponse.json({ message: "All participants ready. Discussion started." });
    } catch (error) {
      console.error("❌ Internal error in start-recording:", error); 
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }