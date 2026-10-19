import React from 'react';
import type { RepoQualityChecklist as ChecklistType } from '../types/api';
import {
  CheckCircle2,
  FileText,
  Tag,
  Scale,
  Clock,
  GitBranch,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

interface RepoQualityChecklistProps {
  checklist: ChecklistType;
}

export const RepoQualityChecklist: React.FC<RepoQualityChecklistProps> = ({ checklist }) => {
  const items = [
    {
      title: 'Repository Descriptions',
      value: `${checklist.repos_with_description} / ${checklist.total_repos_analyzed}`,
      percentage: checklist.repos_with_description_pct,
      status: checklist.repos_with_description_pct >= 70 ? 'pass' : 'warn',
      description: 'Repositories featuring a clear one-sentence summary for recruiters.',
      icon: FileText,
    },
    {
      title: 'Topic Tags Coverage',
      value: `${checklist.repos_with_topics} / ${checklist.total_repos_analyzed}`,
      percentage: checklist.repos_with_topics_pct,
      status: checklist.repos_with_topics_pct >= 50 ? 'pass' : 'warn',
      description: 'Projects indexed with tech stack keywords (e.g., react, fastapi, docker).',
      icon: Tag,
    },
    {
      title: 'Open Source Licenses',
      value: `${checklist.repos_with_license} / ${checklist.total_repos_analyzed}`,
      percentage: checklist.repos_with_license_pct,
      status: checklist.repos_with_license_pct >= 50 ? 'pass' : 'warn',
      description: 'Projects carrying explicit open-source licensing (MIT, Apache, GPL).',
      icon: Scale,
    },
    {
      title: 'Recent Activity (< 6 mos)',
      value: `${checklist.repos_active_within_6_months} / ${checklist.total_repos_analyzed}`,
      percentage: checklist.repos_active_within_6_months_pct,
      status: checklist.repos_active_within_6_months_pct >= 40 ? 'pass' : 'warn',
      description: 'Projects pushed to within the past 180 days showing active momentum.',
      icon: Clock,
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Repository Quality &amp; Hygiene Checklist
          </h3>
          <p className="text-xs text-slate-400">
            Audit of documentation, discovery tags, licensing, and commit freshness
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-navy-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <GitBranch className="w-3.5 h-3.5 text-violet-400" />
          <span>
            {checklist.original_repos_count} Original &bull; {checklist.forked_repos_count} Forks
          </span>
        </div>
      </div>

      {/* Grid of 4 quality checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isPass = item.status === 'pass';
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-navy-900/60 border border-slate-800/80 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-200">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${isPass ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {item.percentage}%
                  </span>
                  {isPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isPass ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.max(4, item.percentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">{item.description}</span>
                <span className="font-mono ml-2 shrink-0">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pinned Repos API Notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-navy-950/40 border border-slate-800/80 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Public API Constraint Notice: </strong>
          {checklist.pinned_notice}
        </p>
      </div>
    </div>
  );
};
