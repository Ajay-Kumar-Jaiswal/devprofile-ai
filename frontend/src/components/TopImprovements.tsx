import React from 'react';
import type { RecommendationItem, AIRecommendationItem } from '../types/api';
import { Flame, ArrowRight, Sparkles, Sliders } from 'lucide-react';

interface UnifiedImprovement {
  id: string;
  rank: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  reason: string;
  action: string;
  isAiSource: boolean;
}

interface TopImprovementsProps {
  aiRecommendations?: AIRecommendationItem[];
  ruleRecommendations?: RecommendationItem[];
  onViewAll?: () => void;
}

export const TopImprovements: React.FC<TopImprovementsProps> = ({
  aiRecommendations,
  ruleRecommendations,
  onViewAll,
}) => {
  const items: UnifiedImprovement[] = [];

  if (aiRecommendations && aiRecommendations.length > 0) {
    // Sort high > medium > low
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const sorted = [...aiRecommendations].sort(
      (a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
    );

    sorted.slice(0, 3).forEach((item, idx) => {
      items.push({
        id: `ai-${idx}`,
        rank: idx + 1,
        priority: item.priority,
        category: item.category,
        title: item.title,
        reason: item.reason,
        action: item.suggested_action,
        isAiSource: true,
      });
    });
  } else if (ruleRecommendations && ruleRecommendations.length > 0) {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const sorted = [...ruleRecommendations].sort(
      (a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
    );

    sorted.slice(0, 3).forEach((item, idx) => {
      items.push({
        id: item.id || `rule-${idx}`,
        rank: idx + 1,
        priority: item.priority,
        category: item.category,
        title: item.title,
        reason: item.impact || item.description,
        action: item.action,
        isAiSource: false,
      });
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-card space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Top 3 Priority Improvements</span>
              {items[0]?.isAiSource ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span>AI Recommended</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                  <Sliders className="w-3 h-3 text-blue-400" />
                  <span>High Priority</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Highest-impact action items to elevate placement interview outcomes
            </p>
          </div>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold self-start sm:self-auto transition-colors"
          >
            <span>View All &amp; Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-navy-900/70 border border-slate-800 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-navy-950 border border-slate-700 text-xs font-bold text-white font-mono">
                  #{item.rank}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.priority === 'high'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : item.priority === 'medium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {item.priority} priority
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  [{item.category}]
                </span>
                <h4 className="font-bold text-white text-sm leading-snug">
                  {item.title}
                </h4>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-slate-400">Why: </strong>
                {item.reason}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-navy-950 border border-slate-800/80 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                Action:
              </span>
              <p className="text-slate-200 text-[11px] leading-snug">{item.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
