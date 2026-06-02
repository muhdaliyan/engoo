import type { Context } from "@netlify/functions";
import { conjugateRegular } from "../../src/conjugator";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let verb: string;
  try {
    const body = await req.json();
    verb = body?.verb;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!verb || typeof verb !== "string") {
    return new Response(
      JSON.stringify({ error: "Verb parameter is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const cleanVerb = verb.trim().toLowerCase();

  // Always compute local result first as fallback
  const localResult = conjugateRegular(cleanVerb);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify(localResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const prompt = `Identify the true infinitive base form (V1) of the English verb: "${cleanVerb}" (even if it was provided as an inflected form like "running", "wrote", "writes", etc.). Then, provide the first (V1 - base), second (V2 - past simple), third (V3 - past participle), fourth (V4 - present participle), and fifth (V5 - third-person singular) forms for this base verb.
Also, generate the list of all 12 English tense conjugations (aiConjugations) customized specifically for this verb, including structural formulas displaying the verb, usage explanations, and examples for each of the subject pronouns: 'I', 'You', 'He/She/It', 'We', 'They'.

You MUST respond with a JSON object matching this schema:
{
  "v1": string, // Base / Infinitive form. e.g. write, play
  "v2": string, // Past simple form (V2). e.g. wrote, played
  "v3": string, // Past participle form (V3). e.g. written, played
  "v4": string, // Present participle (-ing) form. e.g. writing, playing
  "v5": string, // Third person singular (-s/-es) form. e.g. writes, plays
  "isIrregular": boolean, // Is this verb classified as an irregular verb in English?
  "aiConjugations": Array<{
    "tense": "past" | "present" | "future",
    "aspect": "simple" | "continuous" | "perfect" | "perfect_continuous",
    "formula": string, // Tense formula showing the active verb. e.g. 'Subject + write/writes'
    "explanation": string, // Detailed explanation of why this verb is used in this tense.
    "examples": Array<{
      "subject": "I" | "You" | "He/She/It" | "We" | "They",
      "text": string, // Complete, natural sentence using the verb and subject. e.g. 'I write in my journal.'
      "helper": string // Optional main auxiliary verbs highlighted. e.g. 'write'
    }>
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
          { role: "system", content: "You are a professional English linguist. You must reply ONLY with a valid JSON object matching the requested schema." },
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
  } catch (apiError) {
    console.error(
      "OpenAI conjugation failed, falling back to logic:",
      apiError
    );
  }

  // Fallback to local rule-based results
  return new Response(JSON.stringify(localResult), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
