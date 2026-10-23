import React, { useState } from 'react';
import type { PortfolioScore } from '../types/api';
import { ShieldCheck, Cpu, ChevronDown, ChevronUp } from 'lucide-react';

interface PortfolioScoreCardProps {
  score: PortfolioScore;
}

export const PortfolioScoreCard: React.FC<PortfolioScoreCardProps> = ({ score }) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const getStatusBadge = (status: string, val: number) => {
    switch (status) {
      case 'excellent':
        return {
          label: 'Strong Area',
          text: 'text-emerald-400',
          bar: 'bg-emerald-400',
          badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
          border: 'border-emerald-500/30 hover:border-emerald-500/50',
        };
      case 'good':
        return {
          label: val >= 16 ? 'Solid' : 'Developing',
          text: 'text-violet-400',
          bar: 'bg-violet-400',
          badge: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
          border: 'border-slate-800 hover:border-slate-700',
        };
      case 'average':
        return {
          label: 'Needs Focus',
          text: 'text-amber-400',
          bar: 'bg-amber-400',
          badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
          border: 'border-amber-500/30 hover:border-amber-500/50',
        };
      default:
        return {
          label: 'Critical Gap',
          text: 'text-rose-400',
          bar: 'bg-rose-400',
          badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
          border: 'border-rose-500/30 hover:border-rose-500/50',
        };
    }
  };

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-violet-400 tracking-widest uppercase">
            02 /
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Five-Pillar Assessment
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span>20 pts each &bull; 100 max</span>
          </span>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-mono transition-colors cursor-pointer"
          >
            <span>{showDetails ? 'Hide Diagnostics' : 'Diagnostic Details'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 5-Pillar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {score.breakdown.map((cat, idx) => {
          const badge = getStatusBadge(cat.status, cat.score);
          const pillarNum = String(idx + 1).padStart(2, '0');

          return (
            <div
              key={idx}
              className={`surface-card p-4 rounded-2xl border shadow-card flex flex-col justify-between space-y-3 transition-colors ${badge.border} min-w-0`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                    Pillar #{pillarNum}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${badge.badge}`}>
                    {badge.label}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white leading-snug">
                  {cat.category}
                </h3>

                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-xl font-bold font-mono text-slate-100">
                    {cat.score}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    / {cat.max_score} pts
                  </span>
                  <span className="ml-auto font-mono text-xs font-semibold text-slate-400">
                    {cat.percentage}%
                  </span>
                </div>

                {/* Sleek 2px progress bar */}
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${badge.bar}`}
                    style={{ width: `${Math.max(5, cat.percentage)}%` }}
                  />
                </div>
              </div>

              {/* Feedback description - concise findings */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                  {cat.feedback}
                </p>
              </div>

              {/* Expandable Diagnostic Criteria if toggled */}
              {showDetails && (
                <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-1 animate-fadeIn">
                  <div className="flex justify-between">
                    <span>Target Weight:</span>
                    <span className="text-slate-300">20% of score</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Performance:</span>
                    <span className={badge.text}>{cat.percentage}% ({cat.status})</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Methodology Note */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-navy-900 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Scoring methodology: </strong>
          Rule-based assessment of public portfolio signals; not a hiring prediction.
        </p>
      </div>
    </section>
  );
};
