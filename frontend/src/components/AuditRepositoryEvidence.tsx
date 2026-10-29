import React, { useState } from 'react';
import type { RepositoryItem } from '../types/api';
import {
  FolderGit2,
  Star,
  GitFork,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AuditRepositoryEvidenceProps {
  repositories: RepositoryItem[];
}

export const AuditRepositoryEvidence: React.FC<AuditRepositoryEvidenceProps> = ({
  repositories,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'starred' | 'issues'>('all');
  const [displayLimit, setDisplayLimit] = useState<number>(6);

  // Collect unique languages
  const languages = Array.from(
    new Set(repositories.map((r) => r.language).filter(Boolean) as string[])
  );

  const filteredRepos = repositories.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      repo.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLang = filterLang === 'all' || repo.language === filterLang;

    let matchesMode = true;
    if (filterMode === 'starred') {
      matchesMode = repo.stargazers_count > 0 || repo.forks_count > 0;
    } else if (filterMode === 'issues') {
      matchesMode = !repo.has_readme || !repo.has_license || !repo.has_description;
    }

    return matchesSearch && matchesLang && matchesMode;
  });

  const visibleRepos = filteredRepos.slice(0, displayLimit);
  const hasMore = filteredRepos.length > displayLimit;

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    if (score >= 60) return 'bg-violet-500/10 text-violet-300 border border-violet-500/30';
    if (score >= 40) return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
  };

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-violet-400 tracking-widest uppercase">
            06 /
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Repository Evidence
          </h2>
          <span className="text-xs font-mono text-slate-400">
            ({repositories.length} Analyzed Projects)
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Quick mode buttons */}
          <div className="flex items-center bg-navy-900 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                filterMode === 'all'
                  ? 'bg-violet-900/90 text-violet-100 border border-violet-500/50 font-bold shadow-subtle'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({repositories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('starred')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                filterMode === 'starred'
                  ? 'bg-violet-900/90 text-violet-100 border border-violet-500/50 font-bold shadow-subtle'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Starred
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('issues')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                filterMode === 'issues'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-subtle'
                  : 'text-rose-400/90 hover:text-rose-300'
              }`}
            >
              Needs Work
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories..."
              className="pl-8 pr-3 py-1 rounded-xl bg-navy-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono text-[11px] w-36 sm:w-44"
            />
          </div>

          {/* Language Filter */}
          {languages.length > 0 && (
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-navy-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-violet-500 font-mono text-[11px]"
            >
              <option value="all">All Stacks</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Grid */}
      {visibleRepos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 min-w-0">
          {visibleRepos.map((repo) => {
            const hasPushDays = repo.days_since_last_push !== null;
            const isStale = hasPushDays && repo.days_since_last_push! > 180;

            return (
              <div
                key={repo.id}
                className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-card hover:border-[#477F7C] hover:shadow-subtle-glow transition-all duration-180 group min-w-0 overflow-hidden"
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Repo Name & Quality Score */}
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-bold text-white text-base hover:text-violet-400 transition-colors flex items-center gap-1.5 break-all group-hover:text-violet-300"
                    >
                      <FolderGit2 className="w-4 h-4 text-violet-400 shrink-0" />
                      <span>{repo.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </a>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${getScoreBadge(
                        repo.quality_score
                      )}`}
                      title="Computed repository quality score"
                    >
                      Score: {repo.quality_score}/100
                    </span>
                  </div>

                  {/* Description or Warning only when issue exists */}
                  {repo.description ? (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {repo.description}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Missing description &bull; Recruiter discoverability impaired</span>
                    </div>
                  )}

                  {/* Topics Pills */}
                  {repo.topics.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {repo.topics.slice(0, 5).map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-navy-900 text-slate-200 border border-slate-700/80"
                        >
                          #{topic}
                        </span>
                      ))}
                      {repo.topics.length > 5 && (
                        <span className="text-[10px] font-mono text-slate-500 self-center">
                          +{repo.topics.length - 5}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Bottom Audit Meta: Language, Stars, License, README, Recency */}
                <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Language & Stats */}
                    <div className="flex items-center gap-3">
                      {repo.language && (
                        <span className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-violet-400" />
                          <span>{repo.language}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{repo.stargazers_count}</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                        <GitFork className="w-3 h-3 text-slate-400" />
                        <span>{repo.forks_count}</span>
                      </span>
                    </div>

                    {/* Recency */}
                    {hasPushDays && (
                      <span
                        className={`text-[10px] font-mono flex items-center gap-1 ${
                          isStale ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          {repo.days_since_last_push === 0
                            ? 'Pushed today'
                            : `Pushed ${repo.days_since_last_push}d ago`}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Hygiene checklist chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {repo.has_readme ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>README</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>No README</span>
                      </span>
                    )}

                    {repo.has_license ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{repo.license_name || 'License'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Unlicensed</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="surface-card p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs font-mono">
          No repositories found matching current filters.
        </div>
      )}

      {/* Show More / Show Less Toggle */}
      {filteredRepos.length > 6 && (
        <div className="flex justify-center pt-1">
          {hasMore ? (
            <button
              type="button"
              onClick={() => setDisplayLimit((prev) => prev + 6)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border text-slate-300 hover:text-white hover:border-[#477F7C] hover:shadow-subtle-glow text-xs font-mono transition-all duration-180 cursor-pointer"
            >
              <span>Show More Repositories ({filteredRepos.length - displayLimit} remaining)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDisplayLimit(6)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border text-slate-400 hover:text-white hover:border-[#477F7C] hover:shadow-subtle-glow text-xs font-mono transition-all duration-180 cursor-pointer"
            >
              <span>Show Less</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </section>
  );
};
