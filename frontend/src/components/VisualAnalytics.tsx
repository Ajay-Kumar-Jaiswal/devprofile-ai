import React from 'react';
import { Link } from 'react-router-dom';
import type { LanguageStat, RepositoryItem } from '../types/api';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface VisualAnalyticsProps {
  languages: LanguageStat[];
  repositories: RepositoryItem[];
  primaryLanguage?: string | null;
  detectedLanguagesCount?: number;
}

export const VisualAnalytics: React.FC<VisualAnalyticsProps> = ({
  languages,
  repositories,
  primaryLanguage,
  detectedLanguagesCount,
}) => {
  // Top 5 repositories for popularity / reach chart
  const popularityData = repositories.slice(0, 5).map((repo) => ({
    name: repo.name.length > 12 ? `${repo.name.slice(0, 10)}...` : repo.name,
    fullName: repo.name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language || 'Unknown',
  }));

  // Coordinated teal and turquoise doughnut & chart palette
  const TEAL_PALETTE = ['#79D8D4', '#5BC2BD', '#43A8A3', '#318D88', '#25746F', '#1C5C58', '#154542'];

  const detectedLanguage = primaryLanguage || (languages[0]?.language ?? 'Software Engineering');
  const totalLangs = detectedLanguagesCount || languages.length;

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-violet-400 tracking-widest uppercase">
            04 /
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Analytics and Reach
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <BarChart3 className="w-3.5 h-3.5 text-teal-accent" />
          <span>Portfolio metrics and market alignment</span>
        </div>
      </div>

      {/* 2-Column Grid: Left Column is Repository Reach; Right Column has Career Opportunities + Language Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-w-0">
        {/* Left Column: Repository Reach / Activity (Full Combined Height) */}
        <div className="surface-card rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-card hover:border-[#477F7C] hover:shadow-subtle-glow transition-all duration-180 flex flex-col justify-between space-y-4 h-full min-w-0">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-accent">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Repository Reach</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Stars and forks across top {popularityData.length} public projects
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Top {popularityData.length} Projects
              </span>
            </div>

            {/* Bar Chart */}
            <div className="h-64 sm:h-72 mt-3 w-full">
              {popularityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={popularityData}
                    margin={{ top: 12, right: 12, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#36383A" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#909198"
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#909198" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#242527',
                        borderColor: '#36383A',
                        borderRadius: '10px',
                        color: '#F5F5F5',
                        fontSize: '11px',
                        padding: '6px 10px',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', color: '#B3B3B8', paddingBottom: '8px' }}
                    />
                    <Bar dataKey="stars" name="Stars" fill="#79D8D4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="forks" name="Forks" fill="#477F7C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic font-mono">
                  No repositories available to display reach metrics.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Direct GitHub API Telemetry</span>
            <span>Deterministic Reach Signals</span>
          </div>
        </div>

        {/* Right Column: Stacked Career Opportunities (Top) + Language Distribution (Bottom) */}
        <div className="flex flex-col gap-4 justify-between min-w-0">
          {/* Top Panel: Career Opportunities */}
          <div className="surface-card rounded-2xl p-4 sm:p-4.5 border border-slate-800 shadow-card hover:border-[#477F7C] hover:shadow-subtle-glow transition-all duration-180 flex flex-col justify-between space-y-3 min-w-0">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Career Opportunities</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Market alignment &amp; skill-matched vacancies
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                    Target: {detectedLanguage}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ATS Feeds
                  </span>
                </div>
              </div>

              {/* Matched Signals Checklist */}
              <div className="space-y-1.5 py-0.5">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Telemetry matches active roles for{' '}
                    <strong className="text-white font-mono">{detectedLanguage}</strong> across {totalLangs} detected stack languages
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    100% verified official Greenhouse &amp; Lever feeds with 0 web scraping
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Instant match scoring &amp; direct employer application URLs
                  </span>
                </div>
              </div>
            </div>

            {/* Action link */}
            <Link
              to="/internships"
              className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 hover:text-white font-mono text-xs font-semibold transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Explore Internships</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Bottom Panel: Language Distribution */}
          <div className="surface-card rounded-2xl p-4 sm:p-4.5 border border-slate-800 shadow-card hover:border-[#477F7C] hover:shadow-subtle-glow transition-all duration-180 flex flex-col justify-between space-y-3 min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-accent">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Language Distribution</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Codebase breakdown by repository count
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {languages.length} Detected
              </span>
            </div>

            {/* Donut chart + Progress Bars side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center min-w-0">
              {/* Left: Donut Chart (5 cols) */}
              <div className="sm:col-span-5 h-28 sm:h-32 flex items-center justify-center min-w-0">
                {languages.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={languages}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={3}
                        dataKey="repo_count"
                        nameKey="language"
                      >
                        {languages.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={TEAL_PALETTE[index % TEAL_PALETTE.length]}
                            stroke="#242527"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#242527',
                          borderColor: '#36383A',
                          borderRadius: '10px',
                          color: '#F5F5F5',
                          fontSize: '11px',
                          padding: '6px 10px',
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val} repos (${item.payload.percentage}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-xs italic font-mono">
                    No language data
                  </div>
                )}
              </div>

              {/* Right: Language list with progress bars (7 cols) */}
              <div className="sm:col-span-7 space-y-1.5">
                {languages.slice(0, 4).map((lang, idx) => {
                  const color = TEAL_PALETTE[idx % TEAL_PALETTE.length];
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-slate-100 font-medium truncate">
                            {lang.language}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px] shrink-0">
                          {lang.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-navy-900 border border-slate-700/50 rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(4, lang.percentage)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono leading-normal">
              Telemetry based on byte-count distribution across public repositories.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
