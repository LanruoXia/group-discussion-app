import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { customAlphabet } from "nanoid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const generateSessionCode = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creator, user_id, test_topic = "Group Discussion", aiCount = 0 } = body;

    if (!creator || !user_id) {
      return NextResponse.json({ error: "Missing creator or user_id" }, { status: 400 });
    }

    let sessionId: string | null = null;
    let sessionCode: string | null = null;
    let created = false;

    // Try maximum of 5 times to generate session_code
    for (let i = 0; i < 5; i++) {
      const newSessionId = uuidv4();
      const newSessionCode = generateSessionCode();

      const { error: insertError } = await supabase.from("sessions").insert([
        {
          session_id: newSessionId,
          session_code: newSessionCode,
          test_topic,
        },
      ]);

      if (!insertError) {
        sessionId = newSessionId;
        sessionCode = newSessionCode;
        created = true;
        break;
      } else {
        console.error("Failed to insert session:", insertError); 
      }

      if (insertError.code !== "23505") {
        console.error("Database insert error:", insertError.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      console.warn("Duplicate session_code, retrying...");
    }

    if (!created || !sessionId || !sessionCode) {
      return NextResponse.json({ error: "Failed to generate unique session code" }, { status: 500 });
    }

    // Insert information of creator
    const { error: creatorError } = await supabase.from("session_participants").insert([
      {
        session_id: sessionId,
        username: creator,
        user_id,
        is_ai: false,
      },
    ]);
    if (creatorError) throw creatorError;

    // Insert AI participants
    const aiParticipants = Array.from({ length: aiCount }).map((_, idx) => ({
      session_id: sessionId,
      username: `AI-${idx + 1}`,
      is_ai: true,
    }));

    if (aiParticipants.length > 0) {
      const { error: aiError } = await supabase.from("session_participants").insert(aiParticipants);
      if (aiError) throw aiError;
    }

    return NextResponse.json({ session_id: sessionId, session_code: sessionCode }, { status: 200 });
  } catch (err: any) {
    console.error("Error creating session:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}