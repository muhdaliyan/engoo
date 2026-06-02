/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { conjugateRegular } from './src/conjugator';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Google Gemini Client on the server
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. All AI operations will be skipped or simulated.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

app.use(express.json());

// API endpoints

// Verb conjugation endpoint - merges fast local heuristic with smart Gemini check
app.post('/api/conjugate', async (req, res) => {
  try {
    const { verb } = req.body;
    if (!verb || typeof verb !== 'string') {
      return res.status(400).json({ error: 'Verb parameter is required' });
    }

    const cleanVerb = verb.trim().toLowerCase();
    
    // First, look up through our local rule-based system
    const localResult = conjugateRegular(cleanVerb);

    // If no API key is present, return the local rule-based result immediately
    const ai = getGeminiClient();
    if (!ai) {
      return res.json(localResult);
    }

    // Otherwise, we query Gemini to get the custom tense grid
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Identify the true infinitive base form (V1) of the English verb: "${cleanVerb}" (even if it was provided as an inflected form like "running", "wrote", "writes", etc.). Then, provide the first (V1 - base), second (V2 - past simple), third (V3 - past participle), fourth (V4 - present participle), and fifth (V5 - third-person singular) forms for this base verb. Format the output as JSON. Indicate whether it is an irregular verb in English isIrregular: true/false. Also, generate the list of all 12 English tense conjugations (aiConjugations) customized specifically for this verb, including structural formulas displaying the verb, usage explanations, and examples for each of the subject pronouns: 'I', 'You', 'He/She/It', 'We', 'They'.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              v1: { type: Type.STRING, description: "Base / Infinitive form. e.g. write, play" },
              v2: { type: Type.STRING, description: "Past simple form (V2). e.g. wrote, played" },
              v3: { type: Type.STRING, description: "Past participle form (V3). e.g. written, played" },
              v4: { type: Type.STRING, description: "Present participle (-ing) form. e.g. writing, playing" },
              v5: { type: Type.STRING, description: "Third person singular (-s/-es) form. e.g. writes, plays" },
              isIrregular: { type: Type.BOOLEAN, description: "Is this verb classified as an irregular verb in English?" },
              aiConjugations: {
                type: Type.ARRAY,
                description: "Complete list of 12 English tenses customized specifically for this verb.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tense: { type: Type.STRING, description: "Must be: 'past', 'present', or 'future'" },
                    aspect: { type: Type.STRING, description: "Must be: 'simple', 'continuous', 'perfect', or 'perfect_continuous'" },
                    formula: { type: Type.STRING, description: "Tense formula showing the active verb. e.g. 'Subject + write/writes'" },
                    explanation: { type: Type.STRING, description: "Detailed explanation of why this verb is used in this tense." },
                    examples: {
                      type: Type.ARRAY,
                      description: "List of example sentences for each subject pronoun ('I', 'You', 'He/She/It', 'We', 'They').",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          subject: { type: Type.STRING, description: "One of: 'I', 'You', 'He/She/It', 'We', 'They'" },
                          text: { type: Type.STRING, description: "Complete, natural sentence using the verb and subject. e.g. 'I write in my journal.'" },
                          helper: { type: Type.STRING, description: "Optional main auxiliary verbs highlighted. e.g. 'write'" }
                        },
                        required: ["subject", "text"]
                      }
                    }
                  },
                  required: ["tense", "aspect", "formula", "explanation", "examples"]
                }
              }
            },
            required: ["v1", "v2", "v3", "v4", "v5", "isIrregular", "aiConjugations"]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        const data = JSON.parse(responseText.trim());
        return res.json(data);
      }
    } catch (apiError) {
      console.error('Gemini conjugation failed, falling back to rule-based logic:', apiError);
    }

    // Fallback to local rule-based results in case of error
    return res.json(localResult);
  } catch (err: any) {
    console.error('Conjugation endpoint error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// English Conversation Partner chatbot endpoint with grammar correction
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userMessage } = req.body;
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        hasGrammarIssue: false,
        grammarNote: null,
        reply: 'Grammar checking requires GEMINI_API_KEY to be configured.',
      });
    }

    const historyText = (messages || [])
      .slice(-12)
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`
      )
      .join('\n');

    const prompt = `You are a warm, friendly English conversation partner and grammar tutor.

Your two tasks every turn:
1. CHECK the user's latest message for ANY grammar mistakes (wrong tense, wrong verb form, missing auxiliary, subject-verb disagreement, wrong preposition, etc.)
   - If there IS a mistake: fill grammarNote with the original phrase, the corrected version, a short label for the issue type (e.g. "Present Continuous", "Past Simple", "Subject-Verb Agreement"), and a clear 1-2 sentence explanation mentioning the grammar rule and tense.
   - If the message is perfectly correct: set hasGrammarIssue to false and still fill grammarNote fields with empty strings (the schema requires the object).
2. REPLY naturally and warmly as a human friend who happens to be an English expert. Keep your reply conversational (1-3 sentences), respond directly to what the user said, and ask a relevant follow-up question to keep the conversation going.

Conversation history:
${historyText || '(conversation just started)'}

User's latest message: "${userMessage}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasGrammarIssue: { type: Type.BOOLEAN },
            grammarNote: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                issueType: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['original', 'corrected', 'issueType', 'explanation'],
            },
            reply: { type: Type.STRING },
          },
          required: ['hasGrammarIssue', 'grammarNote', 'reply'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error('No response from Gemini');

    const data = JSON.parse(responseText.trim());
    return res.json({
      hasGrammarIssue: data.hasGrammarIssue,
      grammarNote: data.hasGrammarIssue ? data.grammarNote : null,
      reply: data.reply,
    });
  } catch (err: any) {
    console.error('Error in /api/chat route:', err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

// Sentence grammar check and analysis API endpoint using Gemini
app.post('/api/grammar-check', async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence || typeof sentence !== 'string') {
      return res.status(400).json({ error: 'Sentence parameter is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // In absence of API key, provide a friendly warning simulation
      return res.json({
        isValid: true,
        originalText: sentence,
        correctedText: sentence,
        score: 100,
        detectedTenses: [
          { text: sentence, tense: 'present', aspect: 'simple', explanation: 'Grammar checking requires active GEMINI_API_KEY configured in Settings panel.' }
        ],
        issues: [],
        verbAnalysis: []
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Perform a detailed English grammar, tense, and conjugation analysis on the following text: "${sentence}".
      Analyze if there are any grammatical, orthographical, or syntactic mistakes.
      Determine its overall correctness score (0 to 100), corrected text, specific issues, detected English tenses (past/present/future with simple/continuous/perfect/perfect_continuous aspect), and action verbs.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN, description: 'Is the sentence grammatically correct with zero mistakes?' },
            originalText: { type: Type.STRING },
            correctedText: { type: Type.STRING, description: 'The fully corrected version of the input sentence. Empty or same if already perfect.' },
            score: { type: Type.INTEGER, description: 'Grammar score from 0 (very corrupted) to 100 (flawless).' },
            detectedTenses: {
              type: Type.ARRAY,
              description: 'Tenses used in the text.',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: 'The clause or phrase exhibiting this tense' },
                  tense: { type: Type.STRING, description: 'Must be: "past", "present", or "future"' },
                  aspect: { type: Type.STRING, description: 'Must be: "simple", "continuous", "perfect", or "perfect_continuous"' },
                  explanation: { type: Type.STRING, description: 'Why this tense aspect is used in this context' }
                },
                required: ["text", "tense", "aspect", "explanation"]
              }
            },
            issues: {
              type: Type.ARRAY,
              description: 'Specific grammatic errors, typos, or style improvements.',
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: 'Incorrect substring / mistake' },
                  correction: { type: Type.STRING, description: 'Corrected form' },
                  explanation: { type: Type.STRING, description: 'Reason for the mistake/correction' }
                },
                required: ["original", "correction", "explanation"]
              }
            },
            verbAnalysis: {
              type: Type.ARRAY,
              description: 'Analysis of key action and state verbs present in the sentence.',
              items: {
                type: Type.OBJECT,
                properties: {
                  verb: { type: Type.STRING, description: 'Verb as written in the text' },
                  tenseUsed: { type: Type.STRING, description: 'What tense is applied to this verb' },
                  baseForm: { type: Type.STRING, description: 'Infinitive base form of this verb (V1)' },
                  aspect: { type: Type.STRING, description: 'Aspect used (Simple, Continuous, Perfect)' }
                },
                required: ["verb", "tenseUsed", "baseForm", "aspect"]
              }
            }
          },
          required: ["isValid", "originalText", "score", "detectedTenses", "issues", "verbAnalysis"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response output from Gemini API");
    }

    const data = JSON.parse(responseText.trim());
    return res.json(data);
  } catch (err: any) {
    console.error('Error in /api/grammar-check route:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze text' });
  }
});

// Configure Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
