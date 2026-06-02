/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TenseTime = 'past' | 'present' | 'future';
export type TenseAspect = 'simple' | 'continuous' | 'perfect' | 'perfect_continuous';

export interface VerbForm {
  v1: string; // Base / Infinitive
  v2: string; // Past Simple
  v3: string; // Past Participle
  v4: string; // Present Participle (-ing)
  v5: string; // Third Person Singular (-s / -es)
  isIrregular: boolean;
  aiConjugations?: ConjugationCell[];
}

export interface ConjugationCell {
  tense: TenseTime;
  aspect: TenseAspect;
  formula: string;
  examples: {
    subject: string;
    text: string;
    helper?: string;
  }[];
  explanation: string;
}

export interface GrammarAnalysis {
  isValid: boolean;
  originalText: string;
  correctedText?: string;
  score: number; // 0 to 100 grammar score
  detectedTenses: {
    text: string;
    tense: TenseTime;
    aspect: TenseAspect;
    explanation: string;
  }[];
  issues: {
    original: string;
    correction: string;
    explanation: string;
    offset?: number;
    length?: number;
  }[];
  verbAnalysis: {
    verb: string;
    tenseUsed: string;
    baseForm: string;
    aspect: string;
  }[];
}
