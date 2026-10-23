import React, { useState } from 'react';
import type { RepositoryItem } from '../types/api';
import {
  FolderGit2,
  Star,
  GitFork,
  ExternalLink,
  Search,
  Scale,
} from 'lucide-react';

interface RepositoryListProps {
  repositories: RepositoryItem[];
}

export const RepositoryList: React.FC<RepositoryListProps> = ({ repositories }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<string>('all');

  // Collect unique languages for filter
  const languages = Array.from(
    new Set(repositories.map((r) => r.language).filter(Boolean) as string[])
  );

  const filteredRepos = repositories.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      repo.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLang = filterLang === 'all' || repo.language === filterLang;

    return matchesSearch && matchesLang;
  });

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-card space-y-6">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Public Repositories ({repositories.length})
              </h3>
              <p className="text-xs text-slate-400">
                Sorted by community stars and interaction metrics
              </p>
            </div>
          </div>
        </div>

        {/* Search & Language Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter repositories..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-navy-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 w-full sm:w-48 font-mono text-[11px]"
            />
          </div>

          {languages.length > 0 && (
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono text-[11px]"
            >
              <option value="all">All Languages ({repositories.length})</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Repo Cards Grid */}
      {filteredRepos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="glass-panel-interactive rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-3 group"
            >
              <div>
                {/* Title & Link */}
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-sm sm:text-base text-white hover:text-violet-400 transition-colors flex items-center gap-1.5 group-hover:text-violet-300"
                  >
                    <span className="truncate">{repo.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>

                  {repo.is_fork && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      Fork
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-2 text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {repo.description || (
                    <span className="text-slate-500 italic">No description provided</span>
                  )}
                </p>

                {/* Topic tags */}
                {repo.topics && repo.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {repo.topics.slice(0, 4).map((topic, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-navy-950/80 text-[11px] font-mono text-violet-300 border border-violet-500/20"
                      >
                        #{topic}
                      </span>
                    ))}
                    {repo.topics.length > 4 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{repo.topics.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom metadata footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  {repo.language && (
                    <span className="flex items-center gap-1.5 font-medium text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      {repo.language}
                    </span>
                  )}
                  {repo.license_name && (
                    <span className="flex items-center gap-1 truncate max-w-[100px]" title={repo.license_name}>
                      <Scale className="w-3 h-3 text-slate-500" />
                      {repo.license_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono font-medium">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <GitFork className="w-3.5 h-3.5 text-slate-400" />
                    {repo.forks_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">No repositories found matching your filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterLang('all');
            }}
            className="mt-2 text-xs text-violet-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};
