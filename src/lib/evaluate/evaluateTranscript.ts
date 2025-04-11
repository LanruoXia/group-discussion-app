// src/lib/evaluate/evaluateTranscript.ts
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type ScoreDetail = {
  score: number;
  comment: string;
};

type ParticipantScores = {
  "Pronunciation & Delivery": ScoreDetail;
  "Communication Strategies": ScoreDetail;
  "Vocabulary & Language Patterns": ScoreDetail;
  "Ideas & Organization": ScoreDetail;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function evaluateTranscript(session_id: string): Promise<void> {
  console.log("📊 [evaluateTranscript] Start evaluation for session:", session_id);

  // 1. 获取 session 信息
  console.log("🔍 [1] Fetching session info:", session_id);
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select("test_topic")
    .eq("id", session_id)
    .single();

  if (sessionError || !sessionData) {
    console.error("❌ Session not found:", sessionError);
    throw new Error("Session not found");
  }

  const testTopic = sessionData.test_topic;
  console.log("🧠 [2] Fetching prompt and rubric for:", testTopic);

  // 2. 获取 prompt 内容
  const { data: testPrompt, error: promptError } = await supabase
    .from("prompt")
    .select("content")
    .eq("test_topic", testTopic)
    .single();

  if (promptError || !testPrompt) throw new Error("Prompt not found");

  // 3. 获取 rubric 内容
  const { data: rubric, error: rubricError } = await supabase
    .from("rubric")
    .select("content")
    .limit(1)
    .single();

  if (rubricError || !rubric) throw new Error("Rubric not found");

  // 4. 获取合并 transcript
  const { data: merged, error: transcriptError } = await supabase
    .from("merged_transcripts")
    .select("merged_transcript")
    .eq("session_id", session_id)
    .single();

  if (transcriptError || !merged) throw new Error("Merged transcript not found");

  const candidateResponse = merged.merged_transcript;
  console.log("📜 [3] Fetched merged transcript length:", candidateResponse.length);

  // 5. 获取参与者
  const { data: participants, error: participantError } = await supabase
    .from("participants")
    .select("user_id")
    .eq("session_id", session_id)
    .order("created_at", { ascending: true });

  if (participantError || !participants || participants.length < 4)
    throw new Error("Insufficient participants");

  const participantToUserId = {
    A: participants[0]?.user_id ?? "unknown-A",
    B: participants[1]?.user_id ?? "unknown-B",
    C: participants[2]?.user_id ?? "unknown-C",
    D: participants[3]?.user_id ?? "unknown-D",
  };

  console.log("👥 [4] Mapped participants:", participantToUserId);

  // 6. 调用 OpenAI
  console.log("🤖 [5] Calling OpenAI with full prompt...");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an HKDSE speaking test examiner. Score the candidate's speaking performance based on the official rubric. Return only a JSON object with no additional text.",
      },
      {
        role: "user",
        content: `
        The assigned topic for discussion was:
        ${testPrompt.content}

        Here is the candidate's transcribed response:
        ${candidateResponse}

        Please evaluate each participant (A, B, C, D) based on the HKDSE rubric:
        ${rubric.content}

        For each participant, analyze the following four criteria independently:
        1. Pronunciation & Delivery
        2. Communication Strategies
        3. Vocabulary & Language Patterns
        4. Ideas & Organization

        Do NOT assume the scores should be similar across all categories.

        Return the results in valid JSON format: 
        {
            "participants": {
                "A": {
                    "Pronunciation & Delivery": {"score": integer, "comment": "Explanation"},
                    "Communication Strategies": {"score": integer, "comment": "Explanation"},
                    "Vocabulary & Language Patterns": {"score": integer, "comment": "Explanation"},
                    "Ideas & Organization": {"score": integer, "comment": "Explanation"}
                },
                "B": { ... },
                "C": { ... },
                "D": { ... }
            }
        }
        `,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from OpenAI");

  console.log("✅ [6] Received OpenAI response");

  let evaluationResult;
  try {
    evaluationResult = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse JSON");
  }

  console.log("📊 [7] Parsed evaluation result:", evaluationResult);

  console.log("📥 [8] Inserting evaluation to DB...");
  const insertData = Object.entries(evaluationResult.participants)
    .filter(([key]) => !participantToUserId[key as keyof typeof participantToUserId].startsWith("unknown"))
    .map(([participant, scores]) => ({
      session_id,
      user_id: participantToUserId[participant as keyof typeof participantToUserId],
      participant,
      pronunciation_delivery_score: (scores as ParticipantScores)["Pronunciation & Delivery"].score,
      pronunciation_delivery_comment: (scores as ParticipantScores)["Pronunciation & Delivery"].comment,
      communication_strategies_score: (scores as ParticipantScores)["Communication Strategies"].score,
      communication_strategies_comment: (scores as ParticipantScores)["Communication Strategies"].comment,
      vocabulary_patterns_score: (scores as ParticipantScores)["Vocabulary & Language Patterns"].score,
      vocabulary_patterns_comment: (scores as ParticipantScores)["Vocabulary & Language Patterns"].comment,
      ideas_organization_score: (scores as ParticipantScores)["Ideas & Organization"].score,
      ideas_organization_comment: (scores as ParticipantScores)["Ideas & Organization"].comment,
    }));

  const { error: insertError } = await supabase.from("evaluation").insert(insertData);

  if (insertError) {
    console.error("❌ Failed to insert evaluation:", insertError);
    throw new Error("Insert failed");
  }

  console.log("🎉 [9] Evaluation complete for session:", session_id);
}

export async function POST(req: Request) {
  const { session_id } = await req.json();
  await evaluateTranscript(session_id);
  return new Response(JSON.stringify({ message: "Evaluation complete" }), { status: 200 });
}
