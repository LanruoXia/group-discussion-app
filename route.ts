import OpenAI from "openai";
import { supabase } from "./src/app/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export async function POST(req: Request) {
  try {
    // ✅ Step 1: Parse Form Data
    const formData = await req.formData();

    const rubricFile = formData.get("rubric");
    const promptFile = formData.get("prompt");
    const transcriptFile = formData.get("transcript");

    if (!(rubricFile instanceof File) || !(promptFile instanceof File) || !(transcriptFile instanceof File)) {
      return new Response(JSON.stringify({ error: "Invalid file upload." }), { status: 400 });
    }

    const rubric = await rubricFile.text();
    const testPrompt = await promptFile.text();
    const candidateResponse = await transcriptFile.text();

    // ✅ Step 2: Call OpenAI API for Evaluation
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      response_format: { type: "json_object" }, // ✅ Ensure JSON output
      messages: [
        {
          role: "system",
          content:
            "You are an HKDSE speaking test examiner. " +
            "Score the candidate's speaking performance based on the official rubric. " +
            "Return only a JSON object with no additional text."
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

            **Scoring Instructions:**
            - Assign a **number (0-7)** for each category.
            - Provide a **brief but meaningful explanation** for each score.
            - Ensure the score follows the HKDSE rubric criteria.

            **Return the results in valid JSON format:** 
            \`\`\`json
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
            \`\`\`
            **Ensure that the response contains no additional text outside the JSON object.**
          `
        }
      ]
    });

    // ✅ Step 3: Validate OpenAI Response
    const content = response.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return new Response(JSON.stringify({ error: "OpenAI API returned an empty response." }), { status: 500 });
    }

    // ✅ Step 4: Parse OpenAI JSON Response
    let evaluationResult;
    try {
      evaluationResult = JSON.parse(content);
    } catch (error) {
      console.error("Invalid JSON from OpenAI:", content);
      return new Response(JSON.stringify({ error: "OpenAI API returned invalid JSON." }), { status: 500 });
    }

    // ✅ Step 5: Store Each Participant's Scores in Supabase
    const participants = evaluationResult.participants;

    if (!participants) {
      return new Response(JSON.stringify({ error: "Missing participants data in response." }), { status: 500 });
    }

    // ✅ Insert each participant's evaluation separately
    const insertData = Object.entries(participants).map(([participant, scores]: [string, any]) => ({
      participant: participant, // "A", "B", "C", or "D"
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

    return new Response(JSON.stringify({ message: "Evaluation completed successfully!", evaluations: insertData }), { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error." }), { status: 500 });
  }
}