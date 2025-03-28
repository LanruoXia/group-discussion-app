import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { code } = await req.json();

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("session_id")
    .eq("session_code", code)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("sessions")
    .update({ status: "expired" })
    .eq("session_code", code);

  if (error) {
    console.error("Failed to expire session:", error.message);
    return NextResponse.json({ error: "Failed to expire session" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}