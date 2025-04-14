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
      .select("cloud_recording_resource_id, cloud_recording_sid")
      .eq("id", session_id)
      .single();

    if (error || !session) {
      console.error("❌ Failed to fetch session resource info:", error || "session not found");
      return NextResponse.json({ error: "Session not found or missing resource info" }, { status: 404 });
    }

    const { cloud_recording_resource_id: resourceId, cloud_recording_sid: sid } = session;

    console.log("🔍 Retrieved recording info:", {
      resourceId,
      sid,
    });

    if (!resourceId || !sid) {
      console.warn("⚠️ resourceId or sid is missing in session record", session);
      return NextResponse.json({ error: "Missing recording resourceId or sid" }, { status: 400 });
    }

    const stopResult = await stopCloudRecording({
      resourceId,
      sid,
      mode,
      cname,
      uid,
    });

    console.log("✅ Successfully stopped recording:", stopResult);

    return NextResponse.json({ message: "Cloud recording stopped", stopResult });
  } catch (err) {
    console.error("❌ Internal error in stop-recording route:", err);
    return NextResponse.json({ error: "Failed to stop recording" }, { status: 500 });
  }
}