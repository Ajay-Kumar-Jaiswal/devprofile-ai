import React, { useState } from 'react';
import type { RecommendationItem } from '../types/api';
import { Lightbulb, AlertTriangle, Flame, CheckCircle2 } from 'lucide-react';

interface RecommendationsSectionProps {
  recommendations: RecommendationItem[];
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  recommendations,
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filteredRecs = recommendations.filter((r) => {
    if (filterPriority === 'all') return true;
    return r.priority === filterPriority;
  });

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Flame className="w-3 h-3 text-rose-400" />
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Medium Priority
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            Low Priority
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-card space-y-6">
      {/* Header and Filter pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Prioritized Placement Improvements
            </h3>
            <p className="text-xs text-slate-400">
              Targeted optimizations generated directly from your profile data
            </p>
          </div>
        </div>

        {/* Priority Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-900 border border-slate-800 self-start sm:self-auto text-xs">
          {['all', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                filterPriority === p
                  ? 'bg-violet-600 text-white shadow-subtle'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p === 'all' ? `All (${recommendations.length})` : p}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards */}
      {filteredRecs.length > 0 ? (
        <div className="space-y-4">
          {filteredRecs.map((rec) => (
            <div
              key={rec.id}
              className="p-5 rounded-xl bg-navy-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {getPriorityBadge(rec.priority)}
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {rec.category}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-white tracking-tight">
                  {rec.title}
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {rec.description}
                </p>
              </div>

              {/* Placement Impact & Actionable step */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="p-3 rounded-lg bg-navy-950/60 border border-slate-800/60">
                  <span className="font-semibold text-violet-300 block mb-1">
                    Placement Drive Impact:
                  </span>
                  <p className="text-slate-400 leading-relaxed">{rec.impact}</p>
                </div>

                <div className="p-3 rounded-lg bg-navy-950/60 border border-slate-800/60">
                  <span className="font-semibold text-emerald-300 block mb-1">
                    Action Plan:
                  </span>
                  <p className="text-slate-400 leading-relaxed">{rec.action}</p>
                </div>
              </div>

              {rec.evidence && (
                <div className="text-[11px] text-slate-400 bg-navy-950/40 px-3 py-2 rounded-lg border border-slate-800/40 flex items-start gap-1.5">
                  <span className="font-semibold text-slate-300 shrink-0">Observed Evidence:</span>
                  <span className="text-slate-400">{rec.evidence}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-sm">
          No recommendations found for priority "{filterPriority}".
        </div>
      )}
    </div>
  );
};
