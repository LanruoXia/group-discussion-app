import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get("code");

  if (!session_id) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_id", session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: participants } = await supabase
      .from("session_participants")
      .select("username, is_ai, user_id, joined_at")
      .eq("session_id", session_id);

    return NextResponse.json({
      session_id,
      test_topic: session.test_topic,
      created_at: session.created_at,
      participants,
    });
  } catch (err: any) {
    console.error("❌ Error fetching session status:", err.message);
    return NextResponse.json({ error: "Session status fetch failed" }, { status: 500 });
  }
}