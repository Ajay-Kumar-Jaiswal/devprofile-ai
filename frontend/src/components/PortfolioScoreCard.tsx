import React from 'react';
import type { PortfolioScore } from '../types/api';
import { Award, AlertTriangle } from 'lucide-react';

interface PortfolioScoreCardProps {
  score: PortfolioScore;
}

export const PortfolioScoreCard: React.FC<PortfolioScoreCardProps> = ({ score }) => {
  // Determine color theme based on overall score
  const getScoreTheme = (val: number) => {
    if (val >= 85) return { text: 'text-emerald-400', stroke: '#34d399', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (val >= 70) return { text: 'text-blue-400', stroke: '#60a5fa', bg: 'bg-blue-500/10 border-blue-500/30' };
    if (val >= 50) return { text: 'text-violet-400', stroke: '#a78bfa', bg: 'bg-violet-500/10 border-violet-500/30' };
    if (val >= 30) return { text: 'text-amber-400', stroke: '#fbbf24', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { text: 'text-rose-400', stroke: '#f87171', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  const theme = getScoreTheme(score.overall_score);

  // SVG Gauge calculations
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score.overall_score / 100) * circumference;

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Deterministic Portfolio Score
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated across 5 documented repository and profile hygiene pillars
            </p>
          </div>
        </div>

        <div className={`self-start sm:self-auto px-3.5 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-2 ${theme.bg} ${theme.text}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>Tier: {score.tier}</span>
        </div>
      </div>

      {/* Main Score & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Circular Gauge (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#1e293b"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={theme.stroke}
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Score in center */}
            <div className="absolute flex flex-col items-center">
              <span className={`text-4xl font-extrabold tracking-tight ${theme.text}`}>
                {score.overall_score}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Out of 100
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400 text-center max-w-[220px] leading-relaxed">
            {score.summary}
          </p>
        </div>

        {/* Right 5 Category Bars (8 cols) */}
        <div className="lg:col-span-8 space-y-3.5">
          {score.breakdown.map((cat, idx) => (
            <div key={idx} className="bg-navy-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  {cat.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">
                    {cat.score} / {cat.max_score} pts
                  </span>
                  <span className="font-mono font-medium text-slate-300">
                    ({cat.percentage}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    cat.status === 'excellent'
                      ? 'bg-emerald-400'
                      : cat.status === 'good'
                      ? 'bg-blue-400'
                      : cat.status === 'average'
                      ? 'bg-violet-400'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.max(5, cat.percentage)}%` }}
                />
              </div>

              {/* Feedback description */}
              <p className="text-[11px] text-slate-400 leading-snug">
                {cat.feedback}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Hiring Disclaimer */}
      <div className="pt-2 border-t border-slate-800/70 flex items-start gap-2.5 text-xs text-slate-400 bg-navy-950/40 p-3.5 rounded-xl border border-slate-800">
        <AlertTriangle className="w-4 h-4 text-amber-400/90 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Scoring Algorithm Notice: </strong>
          {score.disclaimer}
        </p>
      </div>
    </div>
  );
};
