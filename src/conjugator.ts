/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VerbForm, TenseTime, TenseAspect, ConjugationCell } from './types';

// Large static dictionary of common English irregular verbs
export const IRREGULAR_VERBS: Record<string, Omit<VerbForm, 'isIrregular'>> = {
  be: { v1: 'be', v2: 'was/were', v3: 'been', v4: 'being', v5: 'is/am/are' },
  have: { v1: 'have', v2: 'had', v3: 'had', v4: 'having', v5: 'has' },
  do: { v1: 'do', v2: 'did', v3: 'done', v4: 'doing', v5: 'does' },
  go: { v1: 'go', v2: 'went', v3: 'gone', v4: 'going', v5: 'goes' },
  write: { v1: 'write', v2: 'wrote', v3: 'written', v4: 'writing', v5: 'writes' },
  eat: { v1: 'eat', v2: 'ate', v3: 'eaten', v4: 'eating', v5: 'eats' },
  run: { v1: 'run', v2: 'ran', v3: 'run', v4: 'running', v5: 'runs' },
  fly: { v1: 'fly', v2: 'flew', v3: 'flown', v4: 'flying', v5: 'flies' },
  make: { v1: 'make', v2: 'made', v3: 'made', v4: 'making', v5: 'makes' },
  see: { v1: 'see', v2: 'saw', v3: 'seen', v4: 'seeing', v5: 'sees' },
  buy: { v1: 'buy', v2: 'bought', v3: 'bought', v4: 'buying', v5: 'buys' },
  speak: { v1: 'speak', v2: 'spoke', v3: 'spoken', v4: 'speaking', v5: 'speaks' },
  read: { v1: 'read', v2: 'read', v3: 'read', v4: 'reading', v5: 'reads' },
  cut: { v1: 'cut', v2: 'cut', v3: 'cut', v4: 'cutting', v5: 'cuts' },
  get: { v1: 'get', v2: 'got', v3: 'gotten', v4: 'getting', v5: 'gets' },
  take: { v1: 'take', v2: 'took', v3: 'taken', v4: 'taking', v5: 'takes' },
  sleep: { v1: 'sleep', v2: 'slept', v3: 'slept', v4: 'sleeping', v5: 'sleeps' },
  sing: { v1: 'sing', v2: 'sang', v3: 'sung', v4: 'singing', v5: 'sings' },
  build: { v1: 'build', v2: 'built', v3: 'built', v4: 'building', v5: 'builds' },
  drive: { v1: 'drive', v2: 'drove', v3: 'driven', v4: 'driving', v5: 'drives' },
  drink: { v1: 'drink', v2: 'drank', v3: 'drunk', v4: 'drinking', v5: 'drinks' },
  break: { v1: 'break', v2: 'broke', v3: 'broken', v4: 'breaking', v5: 'breaks' },
  know: { v1: 'know', v2: 'knew', v3: 'known', v4: 'knowing', v5: 'knows' },
  wear: { v1: 'wear', v2: 'wore', v3: 'worn', v4: 'wearing', v5: 'wears' },
  say: { v1: 'say', v2: 'said', v3: 'said', v4: 'saying', v5: 'says' },
  come: { v1: 'come', v2: 'came', v3: 'come', v4: 'coming', v5: 'comes' },
  think: { v1: 'think', v2: 'thought', v3: 'thought', v4: 'thinking', v5: 'thinks' },
  find: { v1: 'find', v2: 'found', v3: 'found', v4: 'finding', v5: 'finds' },
  give: { v1: 'give', v2: 'gave', v3: 'given', v4: 'giving', v5: 'gives' },
  tell: { v1: 'tell', v2: 'told', v3: 'told', v4: 'telling', v5: 'tells' },
  feel: { v1: 'feel', v2: 'felt', v3: 'felt', v4: 'feeling', v5: 'feels' },
  leave: { v1: 'leave', v2: 'left', v3: 'left', v4: 'leaving', v5: 'leaves' },
  put: { v1: 'put', v2: 'put', v3: 'put', v4: 'putting', v5: 'puts' },
  bring: { v1: 'bring', v2: 'brought', v3: 'brought', v4: 'bringing', v5: 'brings' },
  begin: { v1: 'begin', v2: 'began', v3: 'begun', v4: 'beginning', v5: 'begins' },
  keep: { v1: 'keep', v2: 'kept', v3: 'kept', v4: 'keeping', v5: 'keeps' },
  hold: { v1: 'hold', v2: 'held', v3: 'held', v4: 'holding', v5: 'holds' },
  write_typo: { v1: 'writting', v2: 'wrote', v3: 'written', v4: 'writing', v5: 'writes' }
};

/**
 * Resolves the true base (infinitive) form of a verb, even if it is entered as an inflected form.
 */
export function getBaseForm(input: string): string {
  const word = input.trim().toLowerCase();
  
  // 1. Direct irregular check
  if (IRREGULAR_VERBS[word]) return word;
  
  // 2. Scan irregular forms to see if it is an inflected form of an irregular verb
  for (const base in IRREGULAR_VERBS) {
    const forms = IRREGULAR_VERBS[base];
    const v2s = forms.v2.split('/');
    const v5s = forms.v5.split('/');
    if (
      forms.v1 === word ||
      v2s.includes(word) ||
      forms.v3 === word ||
      forms.v4 === word ||
      v5s.includes(word)
    ) {
      return base;
    }
  }
  
  // 3. Regular verb inflection heuristics
  // Present participle (-ing)
  if (word.endsWith('ing') && word.length > 5) {
    let base = word.slice(0, -3);
    // Doubled consonant check (e.g. running -> run, planning -> plan)
    if (base.length > 3 && base.slice(-1) === base.slice(-2, -1) && !isVowel(base.slice(-1))) {
      base = base.slice(0, -1);
    }
    // tying -> tie
    if (word.endsWith('ying') && word.length >= 5) {
      return word.slice(0, -4) + 'ie';
    }
    return base;
  }
  
  // Past simple/participle (-ed)
  if (word.endsWith('ed') && word.length > 4) {
    if (word.endsWith('ied')) {
      return word.slice(0, -3) + 'y';
    }
    let base = word.slice(0, -2);
    // Doubled consonant (e.g., planned -> plan)
    if (base.length > 3 && base.slice(-1) === base.slice(-2, -1) && !isVowel(base.slice(-1))) {
      base = base.slice(0, -1);
    }
    return base;
  }
  
  // Third-person singular (-s / -es)
  if (word.endsWith('s') && word.length > 3) {
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    }
    if (word.endsWith('es')) {
      const base = word.slice(0, -2);
      if (base.endsWith('sh') || base.endsWith('ch') || base.endsWith('x') || base.endsWith('z') || base.endsWith('ss')) {
        return base;
      }
    }
    return word.slice(0, -1);
  }
  
  return word;
}

/**
 * Perform a grammar-rule based regular conjugation for a verb word
 */
export function conjugateRegular(rawVerb: string): VerbForm {
  const v1 = getBaseForm(rawVerb);
  
  // Check irregular dictionary first
  if (IRREGULAR_VERBS[v1]) {
    return {
      ...IRREGULAR_VERBS[v1],
      isIrregular: true
    };
  }

  // Conjugate Regular
  let v2 = v1 + 'ed';
  let v3 = v1 + 'ed';
  let v4 = v1 + 'ing';
  let v5 = v1 + 's';

  // 1. Rules for V2/V3 (Past Simple / Past Participle)
  if (v1.endsWith('e')) {
    v2 = v1 + 'd';
    v3 = v1 + 'd';
  } else if (v1.endsWith('y') && !isVowel(v1.charAt(v1.length - 2))) {
    const base = v1.substring(0, v1.length - 1);
    v2 = base + 'ied';
    v3 = base + 'ied';
  } else if (shouldDoubleConsonant(v1)) {
    v2 = v1 + v1.slice(-1) + 'ed';
    v3 = v1 + v1.slice(-1) + 'ed';
  }

  // 2. Rules for V4 (Present Participle -ing)
  if (v1.endsWith('e') && !v1.endsWith('ee') && !v1.endsWith('oe') && !v1.endsWith('ye')) {
    if (v1.endsWith('ie')) {
      v4 = v1.substring(0, v1.length - 2) + 'ying';
    } else {
      v4 = v1.substring(0, v1.length - 1) + 'ing';
    }
  } else if (shouldDoubleConsonant(v1)) {
    v4 = v1 + v1.slice(-1) + 'ing';
  }

  // 3. Rules for V5 (Third Person Singular -s)
  if (v1.endsWith('y') && !isVowel(v1.charAt(v1.length - 2))) {
    v5 = v1.substring(0, v1.length - 1) + 'ies';
  } else if (v1.endsWith('s') || v1.endsWith('sh') || v1.endsWith('ch') || v1.endsWith('x') || v1.endsWith('z') || v1.endsWith('o')) {
    v5 = v1 + 'es';
  }

  return {
    v1,
    v2,
    v3,
    v4,
    v5,
    isIrregular: false
  };
}

function isVowel(c: string): boolean {
  return typeof c === 'string' && ['a', 'e', 'i', 'o', 'u'].includes(c.toLowerCase());
}

// Simple heuristic to determine doubling consonants like swim -> swimming, plan -> planning
function shouldDoubleConsonant(word: string): boolean {
  if (word.length < 3) return false;
  const last = word.slice(-1);
  const secondLast = word.charAt(word.length - 2);
  const thirdLast = word.charAt(word.length - 3);

  // Exclude words ending in w, x, y
  if (['w', 'x', 'y', 'h'].includes(last)) return false;

  // CVC rule (consonant-vowel-consonant)
  return !isVowel(last) && isVowel(secondLast) && !isVowel(thirdLast);
}

/**
 * Build the full conjugation table dataset for a customized verb and optional Pronoun
 */
export function getConjugationsForVerb(verb: VerbForm, subject: string = 'I'): ConjugationCell[] {
  const sub = subject.trim();
  const lowerSub = sub.toLowerCase();

  const isThirdPersonSingular = ['he', 'she', 'it', 'john', 'mary', 'my friend', 'the student'].includes(lowerSub);
  const isFirstSingular = lowerSub === 'i';
  const isPluralOrSecond = ['we', 'they', 'you'].includes(lowerSub);

  // Extract verb strings
  const v1 = verb.v1;
  const v2 = verb.v2;
  const v3 = verb.v3;
  const v4 = verb.v4;
  const v5 = verb.v5;

  // Determine standard subject markers for 'be'
  const isBe = v1 === 'be';
  const amIsAre = isFirstSingular ? 'am' : isThirdPersonSingular ? 'is' : 'are';
  const wasWere = (isFirstSingular || isThirdPersonSingular) ? 'was' : 'were';

  const haveHas = isThirdPersonSingular ? 'has' : 'have';

  const cells: ConjugationCell[] = [
    // --- PRESENT TENSE ---
    {
      tense: 'present',
      aspect: 'simple',
      formula: isBe ? `S + ${amIsAre}` : isThirdPersonSingular ? `S + V5 (Third Person Form)` : `S + V1 (Base Form)`,
      explanation: 'Used to express habits, general truths, and unchanging situations.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} ${amIsAre} a student.` : isThirdPersonSingular ? `${sub} ${v5} every day.` : `${sub} ${v1} every day.`,
          helper: isBe ? `${amIsAre}` : undefined
        }
      ]
    },
    {
      tense: 'present',
      aspect: 'continuous',
      formula: `S + ${amIsAre} + V-ing`,
      explanation: 'Describes an action happening right now or a planned future event.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} ${amIsAre} being helpful.` : `${sub} ${amIsAre} ${v4} right now.`,
          helper: `${amIsAre} ...ing`
        }
      ]
    },
    {
      tense: 'present',
      aspect: 'perfect',
      formula: `S + ${haveHas} + V3 (Past Participle)`,
      explanation: 'Connects the past to the present, indicating actions completed in the past with current consequence.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} ${haveHas} been there.` : `${sub} ${haveHas} ${v3} a magnificent response.`,
          helper: `${haveHas} ...-ed/v3`
        }
      ]
    },
    {
      tense: 'present',
      aspect: 'perfect_continuous',
      formula: `S + ${haveHas} been + V-ing`,
      explanation: 'Shows an ongoing action that started in the past and continues or has immediate relevance to the present.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} ${haveHas} been being tested.` : `${sub} ${haveHas} been ${v4} since morning.`,
          helper: `${haveHas} been ...ing`
        }
      ]
    },

    // --- PAST TENSE ---
    {
      tense: 'past',
      aspect: 'simple',
      formula: isBe ? `S + ${wasWere}` : `S + V2 (Past Form)`,
      explanation: 'Used to specify something that happened and was completed in a definite past period.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} ${wasWere} at school yesterday.` : `${sub} ${v2} yesterday afternoon.`,
          helper: isBe ? `${wasWere}` : undefined
        }
      ]
    },
    {
      tense: 'past',
      aspect: 'continuous',
      formula: `S + ${wasWere} + V-ing`,
      explanation: 'Highlights actions that were in progress at a specific time in the past.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} ${wasWere} being cautious.` : `${sub} ${wasWere} ${v4} when the phone rang.`,
          helper: `${wasWere} ...ing`
        }
      ]
    },
    {
      tense: 'past',
      aspect: 'perfect',
      formula: `S + had + V3 (Past Participle)`,
      explanation: 'Indicates that one past event happened before another past event.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} had been ready.` : `${sub} had ${v3} before they arrived.`,
          helper: `had ...-ed/v3`
        }
      ]
    },
    {
      tense: 'past',
      aspect: 'perfect_continuous',
      formula: `S + had been + V-ing`,
      explanation: 'Describes an action that was going on for some time before another action occurred in the past.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} had been being trained.` : `${sub} had been ${v4} for two hours.`,
          helper: `had been ...ing`
        }
      ]
    },

    // --- FUTURE TENSE ---
    {
      tense: 'future',
      aspect: 'simple',
      formula: `S + will + V1 (Base Form)`,
      explanation: 'Used to express an action or event that will happen in the future.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} will be there soon.` : `${sub} will ${v1} tomorrow morning.`,
          helper: `will`
        }
      ]
    },
    {
      tense: 'future',
      aspect: 'continuous',
      formula: `S + will be + V-ing`,
      explanation: 'Refers to actions that will be ongoing or in progress at a specific point in the future.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} will be being quiet.` : `${sub} will be ${v4} this evening.`,
          helper: `will be ...ing`
        }
      ]
    },
    {
      tense: 'future',
      aspect: 'perfect',
      formula: `S + will have + V3 (Past Participle)`,
      explanation: 'Indicates an action that will be completed some time before a specific future time.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} will have been completed.` : `${sub} will have ${v3} by next week.`,
          helper: `will have ...-ed/v3`
        }
      ]
    },
    {
      tense: 'future',
      aspect: 'perfect_continuous',
      formula: `S + will have been + V-ing`,
      explanation: 'Represents a continuous future action continuing up to a particular point in the future.',
      examples: [
        {
          subject: sub,
          text: isBe ? `${sub} will have been being good.` : `${sub} will have been ${v4} for five years soon.`,
          helper: `will have been ...ing`
        }
      ]
    }
  ];

  return cells;
}
