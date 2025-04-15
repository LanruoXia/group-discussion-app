import { NextRequest, NextResponse } from "next/server";
import { stopCloudRecording } from "@/lib/agora/cloudRecording";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { session_id, mode, cname, uid } = await req.json();

    console.log("📥 Incoming stop-recording request:", {
      session_id,
      mode,
      cname,
      uid,
    });

    if (!session_id || !cname || !uid) {
      console.warn("⚠️ Missing required fields", { session_id, cname, uid });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from("sessions")
      .select(`
        cloud_recording_resource_id,
        cloud_recording_sid,
        individual_recording_resource_id,
        individual_recording_sid
      `)
      .eq("id", session_id)
      .single();

    if (error || !session) {
      console.error("❌ Failed to fetch session resource info:", error || "session not found");
      return NextResponse.json({ error: "Session not found or missing resource info" }, { status: 404 });
    }
    
    let resourceId: string | null = null;
    let sid: string | null = null;
    
    if (mode === "individual") {
      resourceId = session.individual_recording_resource_id;
      sid = session.individual_recording_sid;
    } else {
      resourceId = session.cloud_recording_resource_id;
      sid = session.cloud_recording_sid;
    }
    
    // 如果已经被置空或者之前手动设为 null
    if (!resourceId || !sid) {
      console.warn(`⏭️ Recording for mode ${mode} already stopped or not started.`);
      return NextResponse.json({ message: `Recording for ${mode} already stopped or not started.` });
    }

    
    const stopResult = await stopCloudRecording({
      resourceId,
      sid,
      mode,
      cname,
      uid,
    });

    console.log("✅ Successfully stopped recording:", stopResult);
    // 更新数据库，清空对应 recording 资源字段，确保幂等性
    await supabase
    .from("sessions")
    .update({
      ...(mode === "mix"
        ? { cloud_recording_sid: null, cloud_recording_resource_id: null }
        : { individual_recording_sid: null, individual_recording_resource_id: null }),
    })
    .eq("id", session_id);

    console.log(`🧽 Cleared ${mode} recording info in session ${session_id}`);

    return NextResponse.json({ message: "Cloud recording stopped", stopResult });
  } catch (err) {
    console.error("❌ Internal error in stop-recording route:", err);
    return NextResponse.json({ error: "Failed to stop recording" }, { status: 500 });
  }
}