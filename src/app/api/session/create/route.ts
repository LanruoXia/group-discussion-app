import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const generateSessionCode = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      creator, 
      user_id, 
      testTopic = "Group Discussion", 
      aiCount = 0,
      instructions = "Please discuss the topic in English. Each participant should speak for about 2-3 minutes."
    } = body;

    if (!creator || !user_id) {
      return NextResponse.json({ error: "Missing creator or user_id" }, { status: 400 });
    }

    let sessionId: string | null = null;
    let sessionCode: string | null = null;
    let created = false;

    // Try maximum of 5 times to generate session_code
    for (let i = 0; i < 5; i++) {
      const newSessionCode = generateSessionCode();

      const { data: session, error: insertError } = await supabase.from("sessions").insert([
        {
          session_code: newSessionCode,
          created_by: user_id,
          status: "waiting",
          ai_count: aiCount,
          test_topic: testTopic,
          instructions,
          expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
        },
      ]).select().single();

      if (!insertError && session) {
        sessionId = session.id;
        sessionCode = newSessionCode;
        created = true;
        break;
      }

      if (insertError) {
        console.error("Failed to insert session:", insertError);
        
        if (insertError.code !== "23505") { // Not a duplicate error
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
        
        console.warn("Duplicate session_code, retrying...");
      }
    }

    if (!created || !sessionId || !sessionCode) {
      return NextResponse.json({ error: "Failed to generate unique session code" }, { status: 500 });
    }

    // Insert AI participants if any
    if (aiCount > 0) {
      const aiParticipants = Array.from({ length: aiCount }).map((_, index) => ({
        session_id: sessionId,
        user_id: null,
        is_ai: true,
        username: `AI-${index + 1}`, // AI-1, AI-2, etc.
      }));

      const { error: aiError } = await supabase.from("participants").insert(aiParticipants);
      
      if (aiError) {
        console.error("Failed to insert AI participants:", aiError);
        return NextResponse.json({ error: "Failed to add AI participants" }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      session_id: sessionId, 
      session_code: sessionCode 
    }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating session:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}