/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { conjugateRegular } from './src/conjugator';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize OpenAI API Key on the server
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: OPENAI_API_KEY environment variable is not set. All AI operations will be skipped or simulated.");
}

async function callOpenAI(messages: { role: string; content: string }[]) {
  if (!apiKey) {
    return null;
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }
  return content;
}

app.use(express.json());

// API endpoints

// Verb conjugation endpoint - merges fast local heuristic with smart OpenAI check
app.post('/api/conjugate', async (req, res) => {
  try {
    const { verb } = req.body;
    if (!verb || typeof verb !== 'string') {
      return res.status(400).json({ error: 'Verb parameter is required' });
    }

    const cleanVerb = verb.trim().toLowerCase();
    
    // First, look up through our local rule-based system
    const localResult = conjugateRegular(cleanVerb);

    // Check if API key is present and not the placeholder
    if (!apiKey || apiKey.includes('YOUR_OPENAI_API_KEY')) {
      return res.status(400).json({ error: 'AI Grid requires a valid OPENAI_API_KEY configured in your local .env file.' });
    }

    // Otherwise, we query OpenAI to get the custom tense grid
    try {
      const prompt = `Identify the true infinitive base form (V1) of the English verb: "${cleanVerb}" (even if it was provided as an inflected form like "running", "wrote", "writes", etc.). Then, provide the first (V1 - base), second (V2 - past simple), third (V3 - past participle), fourth (V4 - present participle), and fifth (V5 - third-person singular) forms for this base verb.
Also, generate the list of all 12 English tense conjugations (aiConjugations) customized specifically for this verb, including structural formulas displaying the verb, usage explanations, and examples for each of the subject pronouns: 'I', 'You', 'He/She/It', 'We', 'They'.

CRITICAL PERFORMANCE REQUIREMENT:
- Keep all "explanation" fields extremely short, simple, and concise (maximum 8-10 words).
- Keep all "text" example sentences very short and simple (maximum 5-6 words).
This is crucial to minimize API output generation latency and avoid network timeout limits.

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

      const responseText = await callOpenAI([
        { role: 'system', content: 'You are a professional English linguist. You must reply ONLY with a valid JSON object matching the requested schema.' },
        { role: 'user', content: prompt }
      ]);

      if (responseText) {
        const data = JSON.parse(responseText.trim());
        return res.json(data);
      }
      throw new Error('Empty response from OpenAI');
    } catch (apiError: any) {
      console.error('OpenAI conjugation failed:', apiError);
      return res.status(500).json({ error: `OpenAI API call failed: ${apiError.message}` });
    }
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

    if (!apiKey) {
      return res.json({
        hasGrammarIssue: false,
        grammarNote: null,
        reply: 'Grammar checking requires OPENAI_API_KEY to be configured.',
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

    const responseText = await callOpenAI([
      { role: 'system', content: 'You are a warm, friendly English conversation partner and grammar tutor. You must reply ONLY with a valid JSON object matching the requested schema.' },
      { role: 'user', content: prompt }
    ]);

    if (!responseText) throw new Error('No response from OpenAI');

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

// Sentence grammar check and analysis API endpoint using OpenAI
app.post('/api/grammar-check', async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence || typeof sentence !== 'string') {
      return res.status(400).json({ error: 'Sentence parameter is required' });
    }

    if (!apiKey) {
      // In absence of API key, provide a friendly warning simulation
      return res.json({
        isValid: true,
        originalText: sentence,
        correctedText: sentence,
        score: 100,
        detectedTenses: [
          { text: sentence, tense: 'present', aspect: 'simple', explanation: 'Grammar checking requires active OPENAI_API_KEY configured in Settings panel.' }
        ],
        issues: [],
        verbAnalysis: []
      });
    }

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

    const responseText = await callOpenAI([
      { role: 'system', content: 'You are an advanced English grammar analyzer. You must reply ONLY with a valid JSON object matching the requested schema.' },
      { role: 'user', content: prompt }
    ]);

    if (!responseText) {
      throw new Error("No response output from OpenAI API");
    }

    const data = JSON.parse(responseText.trim());
    return res.json(data);
  } catch (err: any) {
    console.error('Error in /api/grammar-check route:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze text' });
  }
});

// Verification endpoint for App Passcode
app.post('/api/verify-pass', (req, res) => {
  const { password } = req.body;
  const correctPass = process.env.ENTER_PASS || 'engooo@03495144509';
  if (password === correctPass) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Incorrect password' });
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
