import type { Context } from "@netlify/functions";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let messages: Array<{ role: string; content: string }>;
  let userMessage: string;

  try {
    const body = await req.json();
    messages = body?.messages || [];
    userMessage = body?.userMessage;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!userMessage || typeof userMessage !== "string") {
    return new Response(
      JSON.stringify({ error: "userMessage is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        hasGrammarIssue: false,
        grammarNote: { original: "", corrected: "", issueType: "", explanation: "" },
        reply:
          "I need an OPENAI_API_KEY to chat. Please set it in your Netlify environment variables and redeploy.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const historyText = messages
      .slice(-12) // Keep last 12 messages for context
      .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
      .join("\n");

    const prompt = `You are a warm, friendly English conversation partner and grammar tutor.

Your two tasks every turn:
1. CHECK the user's latest message for ANY grammar mistakes (wrong tense, wrong verb form, missing auxiliary, subject-verb disagreement, wrong preposition, etc.)
   - If there IS a mistake: fill grammarNote with the original phrase, the corrected version, a short label for the issue type (e.g. "Present Continuous", "Past Simple", "Subject-Verb Agreement"), and a clear 1-2 sentence explanation mentioning the grammar rule and tense.
   - If the message is perfectly correct: set hasGrammarIssue to false and still fill grammarNote fields with empty strings (the schema requires the object).
2. REPLY naturally and warmly as a human friend who happens to be an English expert. Keep your reply conversational (1-3 sentences), respond directly to what the user said, and ask a relevant follow-up question to keep the conversation going.

Conversation history:
${historyText || "(conversation just started)"}

User's latest message: "${userMessage}"

You MUST respond with a JSON object matching this schema:
{
  "hasGrammarIssue": boolean,
  "grammarNote": {
    "original": string, // The incorrect phrase or sentence as the user wrote it. Empty string if no issue.
    "corrected": string, // The grammatically correct version. Empty string if no issue.
    "issueType": string, // Short label for the grammar rule violated, e.g. 'Present Continuous', 'Past Simple'. Empty string if no issue.
    "explanation": string // 1-2 sentences explaining why the correction is needed and the tense/rule involved. Empty string if no issue.
  },
  "reply": string // Your warm, natural conversational reply to the user. 1-3 sentences.
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a warm, friendly English conversation partner and grammar tutor. You must reply ONLY with a valid JSON object matching the requested schema." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsedData = JSON.parse(content.trim());

    return new Response(
      JSON.stringify({
        hasGrammarIssue: parsedData.hasGrammarIssue,
        grammarNote: parsedData.hasGrammarIssue ? parsedData.grammarNote : null,
        reply: parsedData.reply,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Chat function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Chat failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
