import type { Context } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify(localResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Identify the true infinitive base form (V1) of the English verb: "${cleanVerb}" (even if it was provided as an inflected form like "running", "wrote", "writes", etc.). Then, provide the first (V1 - base), second (V2 - past simple), third (V3 - past participle), fourth (V4 - present participle), and fifth (V5 - third-person singular) forms for this base verb. Format the output as JSON. Indicate whether it is an irregular verb in English isIrregular: true/false. Also, generate the list of all 12 English tense conjugations (aiConjugations) customized specifically for this verb, including structural formulas displaying the verb, usage explanations, and examples for each of the subject pronouns: 'I', 'You', 'He/She/It', 'We', 'They'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            v1: {
              type: Type.STRING,
              description: "Base / Infinitive form. e.g. write, play",
            },
            v2: {
              type: Type.STRING,
              description: "Past simple form (V2). e.g. wrote, played",
            },
            v3: {
              type: Type.STRING,
              description:
                "Past participle form (V3). e.g. written, played",
            },
            v4: {
              type: Type.STRING,
              description:
                "Present participle (-ing) form. e.g. writing, playing",
            },
            v5: {
              type: Type.STRING,
              description:
                "Third person singular (-s/-es) form. e.g. writes, plays",
            },
            isIrregular: {
              type: Type.BOOLEAN,
              description:
                "Is this verb classified as an irregular verb in English?",
            },
            aiConjugations: {
              type: Type.ARRAY,
              description:
                "Complete list of 12 English tenses customized specifically for this verb.",
              items: {
                type: Type.OBJECT,
                properties: {
                  tense: {
                    type: Type.STRING,
                    description:
                      "Must be: 'past', 'present', or 'future'",
                  },
                  aspect: {
                    type: Type.STRING,
                    description:
                      "Must be: 'simple', 'continuous', 'perfect', or 'perfect_continuous'",
                  },
                  formula: {
                    type: Type.STRING,
                    description:
                      "Tense formula showing the active verb. e.g. 'Subject + write/writes'",
                  },
                  explanation: {
                    type: Type.STRING,
                    description:
                      "Detailed explanation of why this verb is used in this tense.",
                  },
                  examples: {
                    type: Type.ARRAY,
                    description:
                      "List of example sentences for each subject pronoun ('I', 'You', 'He/She/It', 'We', 'They').",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        subject: {
                          type: Type.STRING,
                          description:
                            "One of: 'I', 'You', 'He/She/It', 'We', 'They'",
                        },
                        text: {
                          type: Type.STRING,
                          description:
                            "Complete, natural sentence using the verb and subject. e.g. 'I write in my journal.'",
                        },
                        helper: {
                          type: Type.STRING,
                          description:
                            "Optional main auxiliary verbs highlighted. e.g. 'write'",
                        },
                      },
                      required: ["subject", "text"],
                    },
                  },
                },
                required: ["tense", "aspect", "formula", "explanation", "examples"],
              },
            },
          },
          required: [
            "v1",
            "v2",
            "v3",
            "v4",
            "v5",
            "isIrregular",
            "aiConjugations",
          ],
        },
      },
    });

    const responseText = response.text;
    if (responseText) {
      const data = JSON.parse(responseText.trim());
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (apiError) {
    console.error(
      "Gemini conjugation failed, falling back to rule-based logic:",
      apiError
    );
  }

  // Fallback to local rule-based results
  return new Response(JSON.stringify(localResult), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
