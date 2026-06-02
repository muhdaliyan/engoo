import type { Context } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        hasGrammarIssue: false,
        grammarNote: { original: "", corrected: "", issueType: "", explanation: "" },
        reply:
          "I need a GEMINI_API_KEY to chat. Please set it in your Netlify environment variables and redeploy.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

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

User's latest message: "${userMessage}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasGrammarIssue: {
              type: Type.BOOLEAN,
              description: "True if the user made a grammar mistake, false if the message is correct.",
            },
            grammarNote: {
              type: Type.OBJECT,
              description: "Grammar correction details. Always present; check hasGrammarIssue before displaying.",
              properties: {
                original: {
                  type: Type.STRING,
                  description: "The incorrect phrase or sentence as the user wrote it. Empty string if no issue.",
                },
                corrected: {
                  type: Type.STRING,
                  description: "The grammatically correct version. Empty string if no issue.",
                },
                issueType: {
                  type: Type.STRING,
                  description: "Short label for the grammar rule violated, e.g. 'Present Continuous', 'Past Simple'. Empty string if no issue.",
                },
                explanation: {
                  type: Type.STRING,
                  description: "1-2 sentences explaining why the correction is needed and the tense/rule involved. Empty string if no issue.",
                },
              },
              required: ["original", "corrected", "issueType", "explanation"],
            },
            reply: {
              type: Type.STRING,
              description: "Your warm, natural conversational reply to the user. 1-3 sentences.",
            },
          },
          required: ["hasGrammarIssue", "grammarNote", "reply"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from Gemini");

    const data = JSON.parse(responseText.trim());

    return new Response(
      JSON.stringify({
        hasGrammarIssue: data.hasGrammarIssue,
        grammarNote: data.hasGrammarIssue ? data.grammarNote : null,
        reply: data.reply,
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
