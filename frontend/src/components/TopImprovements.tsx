import React from 'react';
import type {
  RecommendationItem,
  AIRecommendationItem,
  RepositoryItem,
  RoadmapPhase,
} from '../types/api';
import {
  ArrowRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Calendar,
} from 'lucide-react';

interface UnifiedImprovement {
  id: string;
  rank: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  reason: string;
  action: string;
  evidence?: string | null;
  isAiSource: boolean;
  affectedRepos: Array<{ name: string; url: string }>;
  matchingRoadmapStep?: { dayOrWeek: string; task: string } | null;
}

interface TopImprovementsProps {
  aiRecommendations?: AIRecommendationItem[];
  ruleRecommendations?: RecommendationItem[];
  repositories?: RepositoryItem[];
  roadmap7?: RoadmapPhase | null;
  onViewAll?: () => void;
}

export const TopImprovements: React.FC<TopImprovementsProps> = ({
  aiRecommendations,
  ruleRecommendations,
  repositories = [],
  roadmap7,
  onViewAll,
}) => {
  const items: UnifiedImprovement[] = [];

  // Helper to extract relevant repositories from text
  const findMatchingRepos = (text: string) => {
    if (!text || repositories.length === 0) return [];
    return repositories
      .filter((r) => text.toLowerCase().includes(r.name.toLowerCase()))
      .map((r) => ({ name: r.name, url: r.html_url }));
  };

  // Helper to match roadmap step
  const findRoadmapStep = (category: string, title: string) => {
    if (!roadmap7?.steps || roadmap7.steps.length === 0) return null;
    const catLower = category.toLowerCase();
    const titleLower = title.toLowerCase();
    const found = roadmap7.steps.find(
      (s) =>
        s.task.toLowerCase().includes(catLower) ||
        titleLower.includes(s.task.toLowerCase()) ||
        s.details.toLowerCase().includes(catLower)
    );
    return found ? { dayOrWeek: found.day_or_week, task: found.task } : null;
  };

  if (aiRecommendations && aiRecommendations.length > 0) {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const sorted = [...aiRecommendations].sort(
      (a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
    );

    sorted.slice(0, 3).forEach((item, idx) => {
      const fullText = `${item.title} ${item.reason} ${item.suggested_action}`;
      const matched = findMatchingRepos(fullText);
      const step = findRoadmapStep(item.category, item.title);

      items.push({
        id: `ai-${idx}`,
        rank: idx + 1,
        priority: item.priority,
        category: item.category,
        title: item.title,
        reason: item.reason,
        action: item.suggested_action,
        isAiSource: true,
        affectedRepos: matched,
        matchingRoadmapStep: step,
      });
    });
  } else if (ruleRecommendations && ruleRecommendations.length > 0) {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const sorted = [...ruleRecommendations].sort(
      (a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
    );

    sorted.slice(0, 3).forEach((item, idx) => {
      const fullText = `${item.title} ${item.impact || ''} ${item.description || ''} ${item.action || ''} ${item.evidence || ''}`;
      const matched = findMatchingRepos(fullText);
      const step = findRoadmapStep(item.category, item.title);

      items.push({
        id: item.id || `rule-${idx}`,
        rank: idx + 1,
        priority: item.priority,
        category: item.category,
        title: item.title,
        reason: item.impact || item.description,
        action: item.action,
        evidence: item.evidence,
        isAiSource: false,
        affectedRepos: matched,
        matchingRoadmapStep: step,
      });
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-violet-400 tracking-widest uppercase">
            03 /
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Priority Improvements
          </h2>
          {items[0]?.isAiSource ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span>AI Ranked</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <Sliders className="w-3 h-3 text-slate-400" />
              <span>Deterministic Rule Ranking</span>
            </span>
          )}
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-mono transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>View Full Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3 Vertically Stacked High-Density Full-Width Rows */}
      <div className="space-y-3">
        {items.map((item) => {
          const isHigh = item.priority === 'high';
          const isMed = item.priority === 'medium';

          return (
            <div
              key={item.id}
              className="surface-card p-4 sm:p-4.5 rounded-2xl border border-slate-800 shadow-card hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 sm:gap-5">
                {/* Left Side: Rank, Category, Title, Recruiter Impact & Affected Repos */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Rank Pill */}
                    <span className="flex items-center justify-center px-2 py-0.5 rounded-md bg-navy-950 border border-slate-800 text-xs font-mono font-bold text-white">
                      #{String(item.rank).padStart(2, '0')}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isHigh
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                          : isMed
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {item.priority} Priority
                    </span>

                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      [{item.category}]
                    </span>

                    {/* Roadmap sprint badge where supported */}
                    {item.matchingRoadmapStep && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        <Calendar className="w-2.5 h-2.5 text-violet-400" />
                        <span>Sprint: {item.matchingRoadmapStep.dayOrWeek}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">
                    {item.title}
                  </h3>

                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <strong className="text-slate-400 font-semibold font-mono text-xs">
                      Recruiter Impact:&nbsp;
                    </strong>
                    {item.reason}
                  </div>

                  {/* Relevant Repository Links when available */}
                  {item.affectedRepos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        Relevant Projects:
                      </span>
                      {item.affectedRepos.map((repo, idx) => (
                        <a
                          key={idx}
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-900 border border-slate-700/80 hover:border-violet-400 text-slate-200 hover:text-white font-mono text-[11px] font-medium transition-colors group"
                        >
                          <span>{repo.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-violet-300" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side: Concrete Action Box */}
                <div className="w-full lg:w-80 lg:min-w-[300px] lg:shrink-0 p-3.5 rounded-xl bg-navy-900 border border-slate-700/80 flex flex-col justify-center space-y-1 self-stretch">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                      Next Action Item
                    </span>
                  </div>
                  <p className="text-xs text-slate-100 font-mono leading-relaxed break-words">
                    {item.action}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
