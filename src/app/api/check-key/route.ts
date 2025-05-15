import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export async function GET() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: "Say 'API Key is working!'" }],
    });

    const content = response.choices?.[0]?.message?.content ?? "";

    if (content.includes("API Key is working")) {
      return new Response(JSON.stringify({ message: "API Key is working!" }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ message: "API Key test failed." }), { status: 500 });
    }
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return new Response(JSON.stringify({ message: "Error connecting to OpenAI API." }), { status: 500 });
  }
}