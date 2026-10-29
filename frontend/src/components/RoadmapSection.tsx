import React, { useState } from 'react';
import type { RoadmapPhase } from '../types/api';
import { CalendarDays, Clock, CheckCircle2, Sparkles } from 'lucide-react';

interface RoadmapSectionProps {
  roadmap7: RoadmapPhase;
  roadmap30: RoadmapPhase;
}

export const RoadmapSection: React.FC<RoadmapSectionProps> = ({ roadmap7, roadmap30 }) => {
  const [activeTab, setActiveTab] = useState<'7day' | '30day'>('7day');

  const currentRoadmap = activeTab === '7day' ? roadmap7 : roadmap30;

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-card space-y-6">
      {/* Actionable Roadmap Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20 text-xs">
        <div className="flex items-center gap-2 text-violet-300">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="font-semibold">Tailored Placement Roadmap</span>
        </div>
        <span className="text-[11px] text-slate-400 self-start sm:self-auto">
          Curated milestones to maximize your technical interview impact
        </span>
      </div>

      {/* Header and 7-day / 30-day toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Actionable Placement Roadmap
            </h3>
            <p className="text-xs text-slate-400">
              {currentRoadmap.objective}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-900 border border-slate-800 self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('7day')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === '7day'
                ? 'bg-violet-600 text-white shadow-subtle'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>7-Day Sprint</span>
          </button>
          <button
            onClick={() => setActiveTab('30day')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === '30day'
                ? 'bg-violet-600 text-white shadow-subtle'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>30-Day Growth</span>
          </button>
        </div>
      </div>

      {/* Step by Step Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {currentRoadmap.steps.map((step, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline bullet */}
            <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-navy-950 border-2 border-violet-500 flex items-center justify-center text-[11px] font-bold text-violet-400 group-hover:scale-110 transition-transform">
              {idx + 1}
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-navy-900/60 border border-slate-800 group-hover:border-[#477F7C] group-hover:shadow-subtle-glow transition-all duration-180 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  {step.day_or_week}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Milestone #{idx + 1}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {step.task}
              </h4>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {step.details}
              </p>

              <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-xs text-emerald-400/90">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-emerald-300">Expected Outcome: </strong>
                  {step.expected_outcome}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
