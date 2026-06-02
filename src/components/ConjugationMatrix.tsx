/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { VerbForm, TenseTime, TenseAspect, ConjugationCell } from '../types';
import { getConjugationsForVerb } from '../conjugator';
import { HelpCircle, Sparkles, BookOpen, User, CheckCircle } from 'lucide-react';

interface ConjugationMatrixProps {
  activeVerb: VerbForm;
  onSubjectChange: (subject: string) => void;
  selectedSubject: string;
}

const ASPECT_LABELS: Record<TenseAspect, string> = {
  simple: 'Simple',
  continuous: 'Continuous',
  perfect: 'Perfect',
  perfect_continuous: 'Perfect Continuous',
};

const TIME_LABELS: Record<TenseTime, string> = {
  past: 'Past',
  present: 'Present',
  future: 'Future',
};

/// Heatmap colors based on grammatical complexity/aspect row-wise (Optimized for light mode high contrast)
const ASPECT_COLORS: Record<TenseAspect, { bg: string; border: string; text: string; badgeBg: string; intensity: string; accent: string }> = {
  simple: {
    bg: 'bg-emerald-50/20 hover:bg-emerald-100/35',
    border: 'border-emerald-200/80',
    text: 'text-emerald-950 font-bold',
    badgeBg: 'bg-emerald-100 text-emerald-800 font-semibold',
    intensity: 'Low',
    accent: 'border-l-4 border-l-emerald-600',
  },
  continuous: {
    bg: 'bg-teal-50/20 hover:bg-teal-100/35',
    border: 'border-teal-200/80',
    text: 'text-teal-950 font-bold',
    badgeBg: 'bg-teal-100 text-teal-850 font-semibold',
    intensity: 'Medium-Low',
    accent: 'border-l-4 border-l-teal-600',
  },
  perfect: {
    bg: 'bg-blue-50/20 hover:bg-blue-100/35',
    border: 'border-blue-200/80',
    text: 'text-blue-950 font-bold',
    badgeBg: 'bg-blue-100 text-blue-800 font-semibold',
    intensity: 'Medium-High',
    accent: 'border-l-4 border-l-blue-600',
  },
  perfect_continuous: {
    bg: 'bg-indigo-50/25 hover:bg-indigo-100/35',
    border: 'border-indigo-200/80',
    text: 'text-indigo-950 font-bold',
    badgeBg: 'bg-indigo-100 text-indigo-850 font-semibold',
    intensity: 'High',
    accent: 'border-l-4 border-l-indigo-600',
  },
};

const SUBJECTS = ['I', 'You', 'He/She/It', 'We', 'They'];

export default function ConjugationMatrix({
  activeVerb,
  onSubjectChange,
  selectedSubject,
}: ConjugationMatrixProps) {
  // Store selected cell for deep dive / spotlight focus
  const [selectedCellKey, setSelectedCellKey] = useState<string>('present-simple');
  // Modal state for mobile/tablet screens
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dynamically compute the conjugations based on current settings (using AI-generated structures if available, or local fallback)
  const conjugations = useMemo(() => {
    if (activeVerb.aiConjugations && activeVerb.aiConjugations.length > 0) {
      return activeVerb.aiConjugations.map((cell) => {
        const match = cell.examples.find(
          (ex) => ex.subject.toLowerCase() === selectedSubject.toLowerCase()
        ) || cell.examples[0];
        
        return {
          ...cell,
          examples: [match],
        };
      });
    }
    return getConjugationsForVerb(activeVerb, selectedSubject);
  }, [activeVerb, selectedSubject]);

  // Index them by `tense-aspect` for fast layout rendering
  const dict = useMemo(() => {
    const record: Record<string, ConjugationCell> = {};
    conjugations.forEach((cell) => {
      record[`${cell.tense}-${cell.aspect}`] = cell;
    });
    return record;
  }, [conjugations]);

  const selectedCell = useMemo(() => {
    return dict[selectedCellKey] || conjugations[0];
  }, [dict, selectedCellKey, conjugations]);

  // Helpers to render conjugation formulas with highlights
  const formatFormula = (formula: string) => {
    return formula.replace(
      /(has|have|had|will be|will have|will have been|will|am|is|are|was|were|been)/g,
      '<strong class="text-amber-800 font-bold font-mono">$1</strong>'
    );
  };

  const colors = ASPECT_COLORS[selectedCell.aspect];

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full" id="conjugation-matrix-container">
      {/* Matrix Dashboard Layout */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Pronoun Selector Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-50 p-3 rounded-xl border border-stone-200" id="pronoun-selector">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-stone-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-sans">
              Pronoun Alignment
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {SUBJECTS.map((sub) => (
              <button
                key={sub}
                onClick={() => onSubjectChange(sub)}
                id={`btn-subject-${sub.replace('/', '-')}`}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedSubject === sub
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* The Conjugation Grid / Heat Map Style Table */}
        <div className="overflow-x-auto rounded-xl border border-stone-300 bg-white shadow-sm custom-scrollbar" id="heatmap-grid-table">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-300">
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono w-44 border border-stone-300">
                  Aspect \ Time
                </th>
                <th className="py-3 px-4 text-center text-xs font-extrabold uppercase tracking-wider text-red-750 font-mono border border-stone-300">
                  PAST
                </th>
                <th className="py-3 px-4 text-center text-xs font-extrabold uppercase tracking-wider text-emerald-750 font-mono border border-stone-300">
                  PRESENT
                </th>
                <th className="py-3 px-4 text-center text-xs font-extrabold uppercase tracking-wider text-blue-750 font-mono border border-stone-300">
                  FUTURE
                </th>
              </tr>
            </thead>
            <tbody>
              {(['simple', 'continuous', 'perfect', 'perfect_continuous'] as TenseAspect[]).map((aspect) => {
                const aspectColors = ASPECT_COLORS[aspect];
                return (
                  <tr
                    key={aspect}
                    className="border-b last:border-0 border-stone-300 transition-colors"
                  >
                    {/* Aspect Side Headers */}
                    <td className="py-4 px-4 font-sans font-medium text-stone-900 bg-stone-50 border border-stone-300 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-stone-850">{ASPECT_LABELS[aspect]}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-stone-200/60 w-max text-stone-550 bg-white font-semibold">
                          {aspectColors.intensity}
                        </span>
                      </div>
                    </td>

                    {/* Columns for Past, Present, Future */}
                    {(['past', 'present', 'future'] as TenseTime[]).map((time) => {
                      const key = `${time}-${aspect}`;
                      const cell = dict[key];
                      const isSelected = selectedCellKey === key;

                      if (!cell) return <td key={key} className="border border-stone-300" />;

                      return (
                        <td
                          key={key}
                          onClick={() => {
                            setSelectedCellKey(key);
                            setIsModalOpen(true);
                          }}
                          id={`heatmap-cell-${key}`}
                          className={`p-3.5 cursor-pointer transition-all duration-200 align-top border border-stone-300 ${
                            isSelected
                              ? 'ring-2 ring-cyan-500 bg-cyan-50/80 border-cyan-200 relative z-10'
                              : 'bg-white hover:bg-stone-50/60'
                          }`}
                        >
                          <div className="flex flex-col gap-1.5 justify-between h-full min-h-[96px]">
                            {/* Cell Formula Block */}
                            <div>
                              <div
                                className="text-xs text-stone-850 font-semibold font-mono"
                                dangerouslySetInnerHTML={{ __html: formatFormula(cell.formula) }}
                              />
                            </div>

                            {/* Conjugated Active Output */}
                            <div className="mt-1 bg-stone-50 border border-stone-200/80 p-2 rounded shadow-3xs">
                              <span className="text-xs font-bold text-stone-900 block truncate leading-tight">
                                {cell.examples[0].text}
                              </span>
                            </div>

                            {/* Aspect indicator */}
                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-stone-200/50">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                                {cell.examples[0].helper || 'plain'}
                              </span>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop Spotlight Panel (Visible only on lg screens and up) */}
      <div
        className="hidden lg:flex w-full lg:w-[350px] p-5 rounded-xl border border-stone-200 bg-white shadow-sm flex-col gap-4 self-stretch"
        id="tense-spotlight-card"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-amber-600 uppercase tracking-widest">
              Conjugation Focus
            </span>
            <h3 className="text-base font-bold text-stone-900 font-sans mt-0.5">
              {TIME_LABELS[selectedCell.tense]} {ASPECT_LABELS[selectedCell.aspect]}
            </h3>
          </div>
          <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Formula display helper */}
        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex flex-col gap-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-500">
            Structural Equation
          </span>
          <span
            className="text-xs font-semibold font-mono text-stone-850"
            dangerouslySetInnerHTML={{ __html: formatFormula(selectedCell.formula) }}
          />
        </div>

        {/* Usage analysis from conjugation mapping */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-850">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Usage Purpose</span>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed bg-stone-50/50 p-2.5 rounded-lg border border-stone-200">
            {selectedCell.explanation}
          </p>
        </div>

        {/* Personal Pronoun Conjugation Matrix for selected tense */}
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-550">
            Person Agreement Check
          </span>
          <div className="flex flex-col gap-1 text-[11px] font-mono border-t border-stone-200 pt-2">
            {SUBJECTS.map((sub) => {
              // Conjugate for each subject dynamically
              const generatedCell = getConjugationsForVerb(activeVerb, sub).find(
                (c) => c.tense === selectedCell.tense && c.aspect === selectedCell.aspect
              );
              const isCurrent = sub === selectedSubject;

              return (
                <div
                  key={sub}
                  className={`flex justify-between py-1.5 px-2.5 rounded transition-colors ${
                    isCurrent
                      ? 'bg-amber-50 border-l-2 border-amber-500 font-semibold text-amber-900 font-bold'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className="text-stone-500 shrink-0 w-16">{sub}</span>
                  <span className="text-right truncate max-w-[150px] font-bold text-stone-900" title={generatedCell?.examples[0].text}>
                    {generatedCell?.examples[0].text.substring(sub.length + 1) || 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap level check banner */}
        <div className="mt-auto pt-4 border-t border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-stone-400">
            <HelpCircle className="w-3 h-3 text-stone-400" />
            <span>Aspect complexity:</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              colors.badgeBg
            }`}
          >
            {ASPECT_LABELS[selectedCell.aspect]} ({colors.intensity})
          </span>
        </div>
      </div>

      {/* Mobile/Tablet Spotlight Modal (Visible only on screens smaller than lg, rendered via portal to blur the whole app) */}
      {isModalOpen && createPortal(
        <div 
          className="lg:hidden fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold text-amber-600 uppercase tracking-widest">
                  Conjugation Focus
                </span>
                <h3 className="text-base font-bold text-stone-900 font-sans mt-0.5">
                  {TIME_LABELS[selectedCell.tense]} {ASPECT_LABELS[selectedCell.aspect]}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-850 cursor-pointer text-xs font-bold font-sans uppercase tracking-wider"
              >
                Close
              </button>
            </div>

            {/* Formula Equation */}
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex flex-col gap-1">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-550">
                Structural Equation
              </span>
              <span
                className="text-xs font-semibold font-mono text-stone-855"
                dangerouslySetInnerHTML={{ __html: formatFormula(selectedCell.formula) }}
              />
            </div>

            {/* Usage Purpose */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-850">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Usage Purpose</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed bg-stone-50/50 p-2.5 rounded-lg border border-stone-200">
                {selectedCell.explanation}
              </p>
            </div>

            {/* Person Agreement Check */}
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-550">
                Person Agreement Check
              </span>
              <div className="flex flex-col gap-1 text-[11px] font-mono border-t border-stone-200 pt-2">
                {SUBJECTS.map((sub) => {
                  const generatedCell = getConjugationsForVerb(activeVerb, sub).find(
                    (c) => c.tense === selectedCell.tense && c.aspect === selectedCell.aspect
                  );
                  const isCurrent = sub === selectedSubject;

                  return (
                    <div
                      key={sub}
                      className={`flex justify-between py-1.5 px-2.5 rounded transition-colors ${
                        isCurrent
                          ? 'bg-amber-50 border-l-2 border-amber-500 font-semibold text-amber-900 font-bold'
                          : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span className="text-stone-500 shrink-0 w-16">{sub}</span>
                      <span className="text-right truncate max-w-[150px] font-bold text-stone-900" title={generatedCell?.examples[0].text}>
                        {generatedCell?.examples[0].text.substring(sub.length + 1) || 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aspect Badge */}
            <div className="mt-2 pt-3 border-t border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] text-stone-400">
                <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                <span>Complexity:</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  colors.badgeBg
                }`}
              >
                {ASPECT_LABELS[selectedCell.aspect]} ({colors.intensity})
              </span>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-2 w-full py-3 bg-stone-900 hover:bg-stone-850 text-white font-bold rounded-xl text-sm transition-all cursor-pointer text-center"
            >
              Close Window
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
