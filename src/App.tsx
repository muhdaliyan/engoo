/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  Award,
  AlertTriangle,
  Info,
  MessageCircle,
  Lock,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { VerbForm, GrammarAnalysis } from './types';
import { conjugateRegular } from './conjugator';
import ConjugationMatrix from './components/ConjugationMatrix';
import GrammarChatbot from './components/GrammarChatbot';

const SUGGESTED_VERBS = ['be', 'have', 'write', 'go', 'eat', 'see', 'speak', 'run', 'build', 'drive'];

const SAMPLE_SENTENCES = [
  {
    text: "He have been wrote a letter yesterday.",
    label: "Aspect/Tense Mesh"
  },
  {
    text: "She do not speaks English very well.",
    label: "Subject-Verb Agreement"
  },
  {
    text: "I will going to school tomorrow.",
    label: "Future Tense Error"
  },
  {
    text: "We have eaten lunch before he arrived.",
    label: "Perfect vs Simple Past"
  }
];

export default function App() {
  // Verb Conjugation States
  const [verbInput, setVerbInput] = useState('write');
  const [activeVerb, setActiveVerb] = useState<VerbForm>({
    v1: 'write',
    v2: 'wrote',
    v3: 'written',
    v4: 'writing',
    v5: 'writes',
    isIrregular: true
  });
  const [selectedSubject, setSelectedSubject] = useState('I');
  const [conjugating, setConjugating] = useState(false);
  const [aiGridLoading, setAiGridLoading] = useState(false);

  // Grammar Checker States
  const [sentenceInput, setSentenceInput] = useState('He have been wrote a letter yesterday.');
  const [grammarAnalysis, setGrammarAnalysis] = useState<GrammarAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Persistent Tab Navigation State
  const [activeTab, setActiveTab] = useState<'explorer' | 'matrix' | 'grammar' | 'talki'>('explorer');

  // Passcode Lock States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [verifyingPass, setVerifyingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const handleVerifyPass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode.trim()) return;
    setVerifyingPass(true);
    setPassError(null);
    try {
      const res = await fetch('/api/verify-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsUnlocked(true);
        } else {
          setPassError('Incorrect passcode. Please try again.');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setPassError(errorData.error || 'Incorrect passcode. Please try again.');
      }
    } catch {
      setPassError('Network error. Unable to contact verification server.');
    } finally {
      setVerifyingPass(false);
    }
  };

  // Initial conjugation load — local only, instant
  useEffect(() => {
    handleConjugate(verbInput);
  }, []);

  // V1–V5 display: local rule-based only, no API call
  const handleConjugate = (verb: string) => {
    if (!verb.trim()) return;
    setConjugating(true);
    setActiveVerb(conjugateRegular(verb.trim()));
    setConjugating(false);
  };

  // AI Grid: calls /api/conjugate for full Gemini-powered data, then navigates to matrix
  const handleAIGrid = async () => {
    if (!activeVerb.v1) return;
    setAiGridLoading(true);
    try {
      const response = await fetch('/api/conjugate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verb: activeVerb.v1 }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.aiConjugations && data.aiConjugations.length > 0) {
          setActiveVerb(data);
          setActiveTab('matrix');
        } else {
          alert("The server returned conjugation data without an AI Grid. Showing local fallback instead.");
          setActiveTab('matrix');
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`AI Grid Error: ${errData.error || 'Failed to fetch AI grid.'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message || 'Failed to contact the server.'}`);
    } finally {
      setAiGridLoading(false);
    }
  };

  const handleGrammarCheck = async (sentenceText: string) => {
    if (!sentenceText.trim()) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sentence: sentenceText.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        setGrammarAnalysis(data);
      } else {
        throw new Error("Failed to process grammar analysis on the server.");
      }
    } catch (err: any) {
      setAnalysisError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const navItems = [
    { id: 'explorer', label: 'Verb Explorer', icon: Search },
    { id: 'matrix', label: 'Tense Grid', icon: BookOpen },
    { id: 'grammar', label: 'Grammar AI', icon: Sparkles },
    { id: 'talki', label: 'Talki', icon: MessageCircle },
  ] as const;

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 selection:bg-amber-100 selection:text-amber-900" id="lock-screen">
        {/* Decorative background blurs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-stone-300/30 rounded-full blur-3xl" />

        <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-6 relative group overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 group-hover:scale-110 transition-transform duration-500" />
            <Lock className="w-6 h-6 animate-pulse" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Engooo App Locked
          </h1>
          <p className="text-xs text-stone-500 mt-2 max-w-xs leading-relaxed">
            Please enter your credentials passcode to gain access to the Real-Time Tense Synthesis suite.
          </p>

          <form onSubmit={handleVerifyPass} className="w-full mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider" htmlFor="passcode-input">
                Access Passcode
              </label>
              <div className="relative">
                <input
                  id="passcode-input"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (passError) setPassError(null);
                  }}
                  autoFocus
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-stone-200 font-mono text-sm bg-stone-50/50 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-stone-800"
                />
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-750 transition-colors cursor-pointer flex items-center justify-center"
                  title={showPasscode ? 'Hide Passcode' : 'Show Passcode'}
                >
                  {showPasscode ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {passError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start text-left text-red-800 animate-fade-in" id="pass-error-msg">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-snug">{passError}</p>
              </div>
            )}

            <button
              id="btn-verify-passcode"
              type="submit"
              disabled={verifyingPass || !passcode}
              className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 text-white font-semibold rounded-xl text-sm transition-all focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2 min-h-[48px]"
            >
              {verifyingPass ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Unlocking Suite...</span>
                </>
              ) : (
                <span>Unlock Application</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#fafaf8] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900 ${
      activeTab === 'talki' ? 'h-screen overflow-hidden' : 'min-h-screen'
    }`} id="app-root">
      {/* Elegantly Spaced Top Header */}
      <header className="border-b border-stone-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4" id="app-header">
        <div className="max-w-7xl mx-auto">
          {/* Desktop header version (Visible on lg and larger) */}
          <div className="hidden lg:grid grid-cols-3 items-center gap-4 w-full">
            <div></div> {/* Empty spacer to balance center alignment */}
            <div className="flex flex-col items-center text-center">
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
                Engooo
              </h1>
              <p className="text-[11px] font-mono text-stone-500 uppercase tracking-widest mt-0.5">
                Real-Time Tense Synthesis & Grammar Alignment
              </p>
            </div>
            {/* Header Status Widget */}
            <div className="flex justify-end items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-stone-500 font-mono bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI
              </span>
            </div>
          </div>

          {/* Mobile header version (Visible on screens smaller than lg) */}
          <div className="flex lg:hidden justify-center items-center w-full py-1">
            <h1 className="text-xl font-extrabold tracking-wide text-stone-900 font-sans">
              engooo
            </h1>
          </div>
        </div>
      </header>

      {/* Desktop sub-header navigation (Always visible, persistent) */}
      <div className="hidden lg:block bg-white border-b border-stone-200/60 sticky top-[73px] z-30 shadow-2xs" id="desktop-navbar">
        <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  id={`nav-tab-desktop-${item.id}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${isActive
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-950'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active verb indicator on the right of desktop tab bar */}
          <div className="flex items-center gap-2 text-xs font-mono text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/60">
            <span>Current Verb:</span>
            <strong className="text-amber-700 font-bold uppercase">{activeVerb.v1}</strong>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation (Persistent, never closes) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 z-50 py-2.5 px-4 shadow-lg flex justify-around items-center pb-safe" id="mobile-navbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              id={`nav-tab-mobile-${item.id}`}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${isActive
                ? 'text-stone-900 font-bold'
                : 'text-stone-500 hover:text-stone-800'
                }`}
            >
              <Icon className={`w-5.5 h-5.5 ${isActive ? 'scale-110 text-amber-500' : 'text-stone-400'} transition-transform`} />
              <span className="text-[10px] tracking-wide font-semibold mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Dynamic Workspace Area */}
      <main
        className={`flex-1 w-full mx-auto flex flex-col ${
          activeTab === 'talki'
            ? 'p-0 max-w-none overflow-hidden pb-[72px] lg:pb-0'
            : 'max-w-7xl p-4 sm:p-6 lg:p-8 gap-6 pb-24 lg:pb-8'
        }`}
        id="app-main"
      >

        {/* TAB 1: Verb Explorer (Level 1, Part 1) */}
        {activeTab === 'explorer' && (
          <section className="flex flex-col gap-6 animate-fade-in" id="verb-conjugator-section">
            {/* Header block with metadata. */}
            <div className="border-b border-stone-200/70 pb-4">
              <span className="text-[11px] font-mono text-amber-600 font-semibold uppercase tracking-widest">
                Level 1 • Part A
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 mt-1">
                Verb Forms Explorer
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-xl">
                Type any base English verb. The conjugation engine analyzes and outputs its five main lexical forms (V1–V5) instantly.
              </p>
            </div>

            {/* Interactive Input Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-2xs flex flex-col gap-5" id="conjugator-input-box">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                {/* Form verb field */}
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <label className="text-xs font-semibold text-stone-700" htmlFor="verb-search-input">
                    Type an English Verb (Base Form)
                  </label>
                  <div className="relative">
                    <input
                      id="verb-search-input"
                      type="text"
                      value={verbInput}
                      onChange={(e) => setVerbInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConjugate(verbInput)}
                      placeholder="e.g., swim, learn, run, write, build..."
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-stone-200 font-mono text-sm bg-stone-50/50 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                    />
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-4" />
                  </div>
                </div>

                <button
                  id="btn-trigger-conjugate"
                  onClick={() => handleConjugate(verbInput)}
                  disabled={conjugating || !verbInput}
                  className="w-full md:w-auto px-6 py-3.5 bg-stone-900 hover:bg-stone-850 text-white font-semibold rounded-xl text-sm transition-all focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                >
                  {conjugating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Conjugating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Explore Verb</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Suggestions presets */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100" id="suggested-presets">
                <span className="text-xs text-stone-400 font-medium">Quick Explore:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_VERBS.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setVerbInput(v);
                        handleConjugate(v);
                      }}
                      id={`btn-preset-${v}`}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer min-h-[32px] ${activeVerb.v1 === v
                        ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                        : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-stone-50/40 hover:bg-stone-100/50'
                        }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Lexical Forms Block (V1-V5 Display Card) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3" id="lexical-forms-card-set">
              {[
                { label: 'V1 / Base (Infinitive)', val: activeVerb.v1 },
                { label: 'V2 / Past Simple', val: activeVerb.v2 },
                { label: 'V3 / Past Participle', val: activeVerb.v3 },
                { label: 'V4 / Pres. Participle', val: activeVerb.v4 },
                { label: 'V5 / 3-Person Singular', val: activeVerb.v5 },
              ].map((f, i) => (
                <div
                  key={i}
                  className="bg-white border border-stone-200 p-4.5 rounded-xl flex flex-col gap-1 shadow-2xs hover:border-amber-300 transition-colors"
                  id={`lexical-form-box-${i + 1}`}
                >
                  <div className="flex justify-between items-center text-[10px] font-semibold text-stone-400 font-mono uppercase tracking-wider">
                    <span>{f.label}</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-stone-900 mt-1 select-all break-all text-amber-700">
                    {f.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Irregular indicator info tag */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${activeVerb.isIrregular
              ? 'bg-amber-50/60 border-amber-100 text-amber-900'
              : 'bg-stone-100/60 border-stone-200 text-stone-700'
              }`} id="irregular-tag-banner">
              <div className="flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 shrink-0 text-amber-700 mt-0.5" />
                <span className="text-xs font-medium leading-relaxed">
                  Lexical Category: <strong className="font-semibold">{activeVerb.isIrregular ? 'Irregular English Verb' : 'Regular English Verb'}</strong>.
                  {activeVerb.isIrregular
                    ? ' Forms deviate from regular -ed suffix standards.'
                    : ' Conforms to normal, predictable past and participle modifications (-ed suffix).'}
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest bg-white px-2.5 py-1 rounded shadow-3xs w-max shrink-0 self-start sm:self-center">
                {activeVerb.isIrregular ? 'Irregular' : 'Regular'}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2.5 ml-auto">
              {/* AI Grid button — calls /api/conjugate for Gemini-powered conjugation */}
              <button
                id="btn-ai-grid"
                onClick={handleAIGrid}
                disabled={aiGridLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {aiGridLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading AI…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Grid</span>
                  </>
                )}
              </button>

              {/* Generic Grid button — local data only, instant */}
              <button
                id="btn-generic-grid"
                onClick={() => setActiveTab('matrix')}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Generic Grid for "{activeVerb.v1.toUpperCase()}"</span>
                <span>&rarr;</span>
              </button>
            </div>
          </section>
        )}

        {/* TAB 2: Tense Grid Matrix (Level 1, Part 2) */}
        {activeTab === 'matrix' && (
          <section className="flex flex-col gap-6 animate-fade-in" id="tense-matrix-tab">
            {/* Header block with metadata. */}
            <div className="border-b border-stone-200/70 pb-4">
              <span className="text-[11px] font-mono text-amber-600 font-semibold uppercase tracking-widest">
                Level 1 • Part B
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 mt-1">
                Conjugation Matrix Grid
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-xl">
                Explore how the verb <span className="font-semibold text-stone-900 uppercase">"{activeVerb.v1}"</span> fits into different aspects and time tenses.
              </p>
            </div>

            {/* Quick mobile verb indicator */}
            <div className="lg:hidden flex items-center justify-between bg-white border border-stone-200 p-3 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-stone-600">
                  Active Verb: <strong className="font-semibold text-stone-900 uppercase">{activeVerb.v1}</strong>
                </span>
              </div>
              <button
                onClick={() => setActiveTab('explorer')}
                className="text-xs text-amber-700 font-semibold hover:underline cursor-pointer"
              >
                Change Verb
              </button>
            </div>

            {/* The main Heat map and Subject Alignment Table */}
            <ConjugationMatrix
              activeVerb={activeVerb}
              selectedSubject={selectedSubject}
              onSubjectChange={setSelectedSubject}
            />
          </section>
        )}

        {/* TAB 3: Grammar AI Checker (Level 2) */}
        {activeTab === 'grammar' && (
          <section className="flex flex-col gap-6 animate-fade-in" id="grammar-analyzer-section">
            <div className="border-b border-stone-200/70 pb-4">
              <span className="text-[11px] font-mono text-amber-600 font-semibold uppercase tracking-widest">
                Level 2 • Syntactic Feedback
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 mt-1">
                Grammar AI Analyzer
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-xl">
                Input any complete sentence. Powered by Gemini, this tool checks your grammar, highlights mistakes, and analyzes verb agreements.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start" id="grammar-analyzer-grid">
              {/* ── Left Panel: Grammar Analyzer ── */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-stone-700" htmlFor="sentence-search-input">
                      Write standard or complex sentences
                    </label>
                    <span className="text-[11px] text-stone-400">
                      Write anything to analyze grammar, correct aux/main verb agreement or tense contradictions.
                    </span>
                  </div>

                  <textarea
                    id="sentence-search-input"
                    rows={4}
                    value={sentenceInput}
                    onChange={(e) => setSentenceInput(e.target.value)}
                    placeholder="e.g., She has been ran three miles when I see her yesterday..."
                    className="w-full p-3 font-sans text-sm rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium leading-relaxed"
                  />

                  <div className="flex items-center justify-between gap-2">
                    {/* Clean text action */}
                    <button
                      onClick={() => setSentenceInput('')}
                      className="text-xs text-stone-400 hover:text-stone-600 underline cursor-pointer"
                    >
                      Clear Input
                    </button>

                    <button
                      id="btn-trigger-analyze"
                      onClick={() => handleGrammarCheck(sentenceInput)}
                      disabled={analyzing || !sentenceInput.trim()}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white font-semibold rounded-xl text-sm transition-all focus:ring-2 disabled:opacity-50 flex items-center gap-2 shadow-2xs cursor-pointer min-h-[42px]"
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Analyze Grammar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sample Sentences helper presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider font-semibold">
                    Common Blunders (Tap to Try):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLE_SENTENCES.map((samp, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSentenceInput(samp.text);
                          handleGrammarCheck(samp.text);
                        }}
                        className="p-3 bg-stone-50 border border-stone-200 hover:border-amber-300 hover:bg-white text-left rounded-xl transition-all group flex flex-col gap-1 cursor-pointer min-h-[72px]"
                      >
                        <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 group-hover:bg-amber-50 group-hover:text-amber-800 px-1.5 py-0.5 rounded w-max">
                          {samp.label}
                        </span>
                        <p className="text-xs italic text-stone-600 line-clamp-2 mt-1 leading-tight">
                          &ldquo;{samp.text}&rdquo;
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Response Analysis Segment (Results render here) */}
              <div className="flex flex-col gap-4">
                {analyzing ? (
                  <div
                    className="bg-white border border-stone-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 h-full min-h-[300px] transition-all duration-300 animate-pulse"
                    id="analysis-loading-state"
                  >
                    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-sm font-semibold text-stone-700">Synthesizing Grammar Structure</p>
                    <p className="text-xs text-stone-400 max-w-xs">
                      Gemini is generating syntactic analysis, looking up verb participle agreements, and diagnosing issues...
                    </p>
                  </div>
                ) : analysisError ? (
                  <div
                    className="bg-red-50 border border-red-100 rounded-xl p-6 flex flex-col gap-3 h-full min-h-[300px] text-red-800 transition-all duration-300"
                    id="analysis-error-state"
                  >
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider font-sans">
                      Analysis Timeout or Configuration Block
                    </h3>
                    <p className="text-xs text-red-600 leading-relaxed">
                      {analysisError}
                    </p>
                    <div className="text-[11px] font-mono text-red-500 mt-2 bg-white/50 p-2.5 border border-red-100 rounded">
                      Ensure your API credentials are correct in Settings. You can click on the example sentence buttons to see local formatting or try another phrase.
                    </div>
                  </div>
                ) : grammarAnalysis ? (
                  <div
                    className="flex flex-col gap-4 transition-all duration-300"
                    id="analysis-success-state"
                  >
                    {/* General Diagnostic Card */}
                    <div className="bg-white rounded-xl border border-stone-250/80 p-5 shadow-xs flex flex-col gap-4">
                      {/* Diagnostic Score header */}
                      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                          {grammarAnalysis.isValid ? (
                            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-stone-500">Correctness Status</span>
                            <span className="text-sm font-bold text-stone-900 mt-0.5">
                              {grammarAnalysis.isValid ? 'Perfect Grammar Detected' : 'Grammatical Errors Found'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive score progress meter */}
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-stone-400 block uppercase">Grammar Score</span>
                            <span className="text-sm font-extrabold text-stone-850 font-mono">{grammarAnalysis.score}/100</span>
                          </div>
                          <div className="w-12 h-12 rounded-full border-4 border-stone-100 flex items-center justify-center relative overflow-hidden">
                            <div
                              className="absolute inset-0 bg-amber-500/10 origin-bottom transition-all duration-500"
                              style={{ height: `${grammarAnalysis.score}%` }}
                            />
                            <span className="text-[11px] font-mono font-bold z-10 text-amber-800">
                              {grammarAnalysis.score}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* original vs correction panel */}
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-stone-50 border border-stone-150">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">Your Sentence</span>
                          <p className="text-xs font-semibold leading-relaxed text-stone-800 italic">
                            &ldquo;{grammarAnalysis.originalText}&rdquo;
                          </p>
                        </div>

                        {grammarAnalysis.correctedText && grammarAnalysis.correctedText !== grammarAnalysis.originalText && (
                          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-650 font-bold">
                              Corrected Suggestion (Standardized Alignment)
                            </span>
                            <p className="text-xs font-semibold leading-relaxed text-emerald-800 select-all font-sans">
                              {grammarAnalysis.correctedText}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Issues & Explanations List if exist */}
                    {grammarAnalysis.issues && grammarAnalysis.issues.length > 0 ? (
                      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col gap-3">
                        <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider font-semibold">
                          Correction Log (Conjugation Breakdown)
                        </span>
                        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                          {grammarAnalysis.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/20 hover:border-amber-250 transition-colors flex gap-2.5 items-start"
                            >
                              <div className="mt-0.5 bg-amber-50 text-amber-600 p-1 rounded">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5 font-semibold text-stone-800">
                                  <span className="line-through text-stone-400 font-mono">{issue.original}</span>
                                  <span>&rarr;</span>
                                  <span className="text-emerald-750 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">{issue.correction}</span>
                                </div>
                                <p className="text-stone-500 font-sans leading-relaxed text-[11px] mt-0.5">
                                  {issue.explanation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex gap-3 items-center text-emerald-850">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="text-xs">
                          <span className="font-bold font-sans">Pristine Verb Combination!</span> There were no tense/aspect mismatch or concord issues detected in this input sentence text.
                        </div>
                      </div>
                    )}

                    {/* Detected Verb Conjugations & Aspects breakdown */}
                    {grammarAnalysis.verbAnalysis && grammarAnalysis.verbAnalysis.length > 0 && (
                      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col gap-3">
                        <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider font-semibold">
                          Action Verb Conjugation Analysis
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {grammarAnalysis.verbAnalysis.map((vb, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border border-stone-150 hover:border-amber-250 transition-colors bg-stone-50/20 flex flex-col gap-1"
                            >
                              <span className="text-[10px] font-mono font-medium text-stone-400">Lexical Entry #{idx + 1}</span>
                              <div className="flex justify-between items-center text-xs font-bold text-stone-850 mt-1">
                                <span className="text-amber-700 font-mono">{vb.verb}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">
                                  Base: {vb.baseForm}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5 mt-2 text-[11px] font-medium text-stone-600 border-t border-stone-100/50 pt-2 font-sans">
                                <div>Tense: <span className="font-semibold text-stone-800 font-mono text-[10px]">{vb.tenseUsed}</span></div>
                                <div>Aspect: <span className="font-semibold text-stone-800 font-mono text-[10px]">{vb.aspect}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detected Overall Sentence Tense/Aspects */}
                    {grammarAnalysis.detectedTenses && grammarAnalysis.detectedTenses.length > 0 && (
                      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                          <BookOpen className="w-4 h-4 text-amber-500" />
                          <span>Detected Sentential Tenses</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {grammarAnalysis.detectedTenses.map((dt, idx) => (
                            <div key={idx} className="p-3 bg-stone-50/60 border border-stone-100 rounded-lg flex flex-col gap-1 text-xs">
                              <div className="flex justify-between items-center bg-white/80 p-1.5 rounded border border-stone-200/50">
                                <span className="font-mono text-[11px] truncate max-w-[200px] italic text-stone-600">
                                  &ldquo;{dt.text}&rdquo;
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                                  {dt.tense} {dt.aspect}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-stone-500 mt-1.5 font-sans">
                                {dt.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="bg-white border border-stone-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 h-full min-h-[300px] transition-all duration-300"
                    id="analysis-empty-state"
                  >
                    <BookOpen className="w-10 h-10 text-stone-300" />
                    <p className="text-sm font-semibold text-stone-700">Syntactic Feedback Waiting</p>
                    <p className="text-xs text-stone-400 max-w-xs">
                      Enter a sentence on the left or select one of the common mistakes presets to run active tense-aspect parsing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: Talki (Level 3) */}
        {activeTab === 'talki' && (
          <div className="flex-1 flex flex-col h-full w-full overflow-hidden" id="talki-section">
            <GrammarChatbot />
          </div>
        )}

      </main>

      {/* Persistent Static Desk Footer */}
      {activeTab !== 'talki' && (
        <footer className="border-t border-stone-200/60 bg-white/80 backdrop-blur-md px-6 py-6 mt-12 mb-20 md:mb-0" id="app-footer">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-mono">
                Dashboard layout • Heat Map Aspect complexity visualization
              </span>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              Tense & Agreement Toolset • AI Studio Native Integration
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
