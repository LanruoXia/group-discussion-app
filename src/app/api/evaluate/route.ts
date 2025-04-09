//src/app/api/evaluate/route.ts
import OpenAI from "openai";
import { supabase } from "../../supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export async function POST(req: Request) {
  try {
    // const formData = await req.formData();
    // const rubricFile = formData.get("rubric");
    // const promptFile = formData.get("prompt");
    // const transcriptFile = formData.get("transcript");
    // const testTopic = formData.get("test_topic") as string;
    // // const studentIDs: string[] = JSON.parse(formData.get("student_ids") as string);
    // const studentIDs = JSON.parse(formData.get("student_ids") as string);

    // if (
    //   !(rubricFile instanceof File) ||
    //   !(promptFile instanceof File) ||
    //   !(transcriptFile instanceof File)
    // ) {
    //   return new Response(JSON.stringify({ error: "Invalid file upload." }), { status: 400 });
    // }

    // const rubric = await rubricFile.text();
    // const testPrompt = await promptFile.text();
    // const candidateResponse = await transcriptFile.text();

    // const sessionId = uuidv4();
    // const { error: sessionError } = await supabase.from("session").insert([
    //   {
    //     session_id: sessionId,
    //     test_topic: testTopic,
    //     participants: studentIDs,
    //   },
    // ]);

    // if (sessionError) {
    //   return new Response(JSON.stringify({ error: "Failed to create session" }), { status: 500 });
    // }

    const { session_id } = await req.json();

    // 1. 获取 session 信息
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("test_topic")
      .eq("id", session_id)
      .single();

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ error: "Session not found." }),
        { status: 404 }
      );
    }

    const testTopic = sessionData.test_topic;

    // 2. 获取 prompt 内容
    const { data: testPrompt, error: promptError } = await supabase
      .from("prompt")
      .select("content")
      .eq("test_topic", testTopic)
      .single();

    if (promptError || !testPrompt) {
      return new Response(
        JSON.stringify({ error: "Prompt not found for this topic." }),
        { status: 404 }
      );
    }

    // 3. 获取 rubric 内容
    const { data: rubric, error: rubricError } = await supabase
      .from("rubric")
      .select("content")
      .limit(1)
      .single();

    if (rubricError || !rubric) {
      return new Response(
        JSON.stringify({ error: "Rubric not found." }),
        { status: 404 }
      );
    }

    // 4. 获取合并后的 transcript 内容
    const { data: candidateResponse, error: transcriptError } = await supabase
      .from("merged_transcripts")
      .select("merged_transcript")
      .eq("session_id", session_id);

    if (transcriptError || !candidateResponse) {
      return new Response(
        JSON.stringify({ error: "Transcripts not found." }),
        { status: 404 }
      );
    }

    // 5. 获取所有真实参与者
    // 获取所有参与者（包括 AI），并根据加入顺序排序
    const { data: participants, error: participantError } = await supabase
      .from("participants")
      .select("user_id")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    if (participantError || !participants || participants.length < 4) {
      return new Response(
        JSON.stringify({ error: "Not enough participants (including AI)." }),
        { status: 400 }
      );
    }

    // 分配 A-D 映射
    const participantToUserId = {
      A: participants[0]?.user_id ?? "unknown-A",
      B: participants[1]?.user_id ?? "unknown-B",
      C: participants[2]?.user_id ?? "unknown-C",
      D: participants[3]?.user_id ?? "unknown-D",
    };

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
            ${testPrompt}

            Here is the candidate's transcribed response:
            ${candidateResponse}

            Please evaluate each participant (A, B, C, D) based on the HKDSE rubric:
            ${rubric}

            For each participant, analyze the following four criteria independently:
            1. Pronunciation & Delivery
            2. Communication Strategies
            3. Vocabulary & Language Patterns
            4. Ideas & Organization

            Do NOT assume the scores should be similar across all categories.

            Scoring Instructions:
            - Assign a number (0-7) for each category.
            - Provide a brief but meaningful explanation for each score.
            - Ensure the score follows the HKDSE rubric criteria.

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

            Ensure that the response contains no additional text outside the JSON object.
          `,
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return new Response(JSON.stringify({ error: "OpenAI API returned an empty response." }), {
        status: 500,
      });
    }
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

    let evaluationResult: { participants: Record<string, ParticipantScores> };
    try {
      evaluationResult = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse JSON from OpenAI." }), {
        status: 500,
      });
    }

    const insertData = Object.entries(evaluationResult.participants)
    .filter(([participant]) => {
      const userId = participantToUserId[participant as keyof typeof participantToUserId];
      return !userId.startsWith("unknown");
    })
    .map(([participant, scores]: [string, ParticipantScores]) => ({
      session_id: session_id,
      user_id: participantToUserId[participant as keyof typeof participantToUserId],
      participant,
      pronunciation_delivery_score: scores["Pronunciation & Delivery"].score,
      pronunciation_delivery_comment: scores["Pronunciation & Delivery"].comment,
      communication_strategies_score: scores["Communication Strategies"].score,
      communication_strategies_comment: scores["Communication Strategies"].comment,
      vocabulary_patterns_score: scores["Vocabulary & Language Patterns"].score,
      vocabulary_patterns_comment: scores["Vocabulary & Language Patterns"].comment,
      ideas_organization_score: scores["Ideas & Organization"].score,
      ideas_organization_comment: scores["Ideas & Organization"].comment,
    }));
    await supabase.from("evaluation").insert(insertData);

    return new Response(
      JSON.stringify({ message: "Evaluation completed successfully!" }),
      { status: 200 }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error." }), { status: 500 });
  }
}