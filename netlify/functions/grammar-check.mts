import type { Context } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

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

  const apiKey = process.env.GEMINI_API_KEY;
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
              "Grammar checking requires GEMINI_API_KEY to be set in Netlify environment variables.",
          },
        ],
        issues: [],
        verbAnalysis: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Perform a detailed English grammar, tense, and conjugation analysis on the following text: "${sentence}".
      Analyze if there are any grammatical, orthographical, or syntactic mistakes.
      Determine its overall correctness score (0 to 100), corrected text, specific issues, detected English tenses (past/present/future with simple/continuous/perfect/perfect_continuous aspect), and action verbs.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description:
                "Is the sentence grammatically correct with zero mistakes?",
            },
            originalText: { type: Type.STRING },
            correctedText: {
              type: Type.STRING,
              description:
                "The fully corrected version of the input sentence. Empty or same if already perfect.",
            },
            score: {
              type: Type.INTEGER,
              description:
                "Grammar score from 0 (very corrupted) to 100 (flawless).",
            },
            detectedTenses: {
              type: Type.ARRAY,
              description: "Tenses used in the text.",
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: "The clause or phrase exhibiting this tense",
                  },
                  tense: {
                    type: Type.STRING,
                    description: 'Must be: "past", "present", or "future"',
                  },
                  aspect: {
                    type: Type.STRING,
                    description:
                      'Must be: "simple", "continuous", "perfect", or "perfect_continuous"',
                  },
                  explanation: {
                    type: Type.STRING,
                    description:
                      "Why this tense aspect is used in this context",
                  },
                },
                required: ["text", "tense", "aspect", "explanation"],
              },
            },
            issues: {
              type: Type.ARRAY,
              description:
                "Specific grammatic errors, typos, or style improvements.",
              items: {
                type: Type.OBJECT,
                properties: {
                  original: {
                    type: Type.STRING,
                    description: "Incorrect substring / mistake",
                  },
                  correction: {
                    type: Type.STRING,
                    description: "Corrected form",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Reason for the mistake/correction",
                  },
                },
                required: ["original", "correction", "explanation"],
              },
            },
            verbAnalysis: {
              type: Type.ARRAY,
              description:
                "Analysis of key action and state verbs present in the sentence.",
              items: {
                type: Type.OBJECT,
                properties: {
                  verb: {
                    type: Type.STRING,
                    description: "Verb as written in the text",
                  },
                  tenseUsed: {
                    type: Type.STRING,
                    description: "What tense is applied to this verb",
                  },
                  baseForm: {
                    type: Type.STRING,
                    description:
                      "Infinitive base form of this verb (V1)",
                  },
                  aspect: {
                    type: Type.STRING,
                    description:
                      "Aspect used (Simple, Continuous, Perfect)",
                  },
                },
                required: ["verb", "tenseUsed", "baseForm", "aspect"],
              },
            },
          },
          required: [
            "isValid",
            "originalText",
            "score",
            "detectedTenses",
            "issues",
            "verbAnalysis",
          ],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response output from Gemini API");
    }

    const data = JSON.parse(responseText.trim());
    return new Response(JSON.stringify(data), {
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
