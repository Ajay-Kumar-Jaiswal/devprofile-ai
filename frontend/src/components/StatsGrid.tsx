import React from 'react';
import type { AggregateStats, PortfolioScore } from '../types/api';
import { Award, Star, BookOpen, Code2 } from 'lucide-react';

interface StatsGridProps {
  stats: AggregateStats;
  score?: PortfolioScore;
  onViewScoreDetails?: () => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, score, onViewScoreDetails }) => {
  const cards = [
    {
      title: 'Portfolio Score',
      value: score ? `${score.overall_score}` : '—',
      suffix: '/ 100',
      badge: score?.tier,
      subtext: 'Deterministic 5-pillar rule audit',
      icon: Award,
      iconColor: 'text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20',
      accentBorder: 'hover:border-violet-500/40',
      onClick: onViewScoreDetails,
      clickable: Boolean(onViewScoreDetails),
    },
    {
      title: 'Public Repositories',
      value: stats.total_public_repos.toLocaleString(),
      badge: `${stats.total_analyzed_repos} analyzed`,
      subtext: 'Audited public repositories',
      icon: BookOpen,
      iconColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
      accentBorder: 'hover:border-indigo-500/40',
    },
    {
      title: 'Total Stars',
      value: stats.total_stars.toLocaleString(),
      badge: `${stats.total_forks} forks`,
      subtext: `Avg ${stats.average_stars_per_repo} stars / repository`,
      icon: Star,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      accentBorder: 'hover:border-amber-500/40',
    },
    {
      title: 'Primary Language',
      value: stats.primary_language || 'Multi-stack',
      badge: `${stats.detected_languages_count} detected`,
      subtext: `${stats.detected_languages_count} languages across code`,
      icon: Code2,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      accentBorder: 'hover:border-emerald-500/40',
      isTextVal: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            onClick={card.onClick}
            className={`glass-panel rounded-2xl p-5 border border-slate-800 transition-all ${card.accentBorder} ${
              card.clickable ? 'cursor-pointer hover:bg-navy-900/90 active:scale-[0.99]' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.bgColor}`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-2xl sm:text-3xl font-extrabold text-white tracking-tight ${card.isTextVal ? '' : 'font-mono'}`}>
                  {card.value}
                </span>
                {card.suffix && (
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {card.suffix}
                  </span>
                )}
                {card.badge && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400 truncate">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
