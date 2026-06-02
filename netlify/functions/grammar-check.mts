import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sentence: string;
  try {
    const body = await req.json();
    sentence = body?.sentence;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!sentence || typeof sentence !== "string") {
    return new Response(
      JSON.stringify({ error: "Sentence parameter is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Graceful fallback when no key is set
    return new Response(
      JSON.stringify({
        isValid: true,
        originalText: sentence,
        correctedText: sentence,
        score: 100,
        detectedTenses: [
          {
            text: sentence,
            tense: "present",
            aspect: "simple",
            explanation:
              "Grammar checking requires OPENAI_API_KEY to be set in Netlify environment variables.",
          },
        ],
        issues: [],
        verbAnalysis: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const prompt = `Perform a detailed English grammar, tense, and conjugation analysis on the following text: "${sentence}".
Analyze if there are any grammatical, orthographical, or syntactic mistakes.
Determine its overall correctness score (0 to 100), corrected text, specific issues, detected English tenses (past/present/future with simple/continuous/perfect/perfect_continuous aspect), and action verbs.

You MUST respond with a JSON object matching this schema:
{
  "isValid": boolean, // Is the sentence grammatically correct with zero mistakes?
  "originalText": string,
  "correctedText": string, // The fully corrected version of the input sentence. Empty or same if already perfect.
  "score": number, // Grammar score from 0 (very corrupted) to 100 (flawless).
  "detectedTenses": Array<{
    "text": string, // The clause or phrase exhibiting this tense
    "tense": "past" | "present" | "future",
    "aspect": "simple" | "continuous" | "perfect" | "perfect_continuous",
    "explanation": string // Why this tense aspect is used in this context
  }>,
  "issues": Array<{
    "original": string, // Incorrect substring / mistake
    "correction": string, // Corrected form
    "explanation": string // Reason for the mistake/correction
  }>,
  "verbAnalysis": Array<{
    "verb": string, // Verb as written in the text
    "tenseUsed": string, // What tense is applied to this verb
    "baseForm": string, // Infinitive base form of this verb (V1)
    "aspect": string // Aspect used (Simple, Continuous, Perfect)
  }>
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
          { role: "system", content: "You are an advanced English grammar analyzer. You must reply ONLY with a valid JSON object matching the requested schema." },
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
      throw new Error("No response output from OpenAI API");
    }

    const parsedData = JSON.parse(content.trim());
    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in grammar-check function:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to analyze text" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
