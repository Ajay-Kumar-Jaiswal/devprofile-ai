import React from 'react';
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
import { PieChart as PieIcon, BarChart3, Info } from 'lucide-react';

interface VisualAnalyticsProps {
  languages: LanguageStat[];
  repositories: RepositoryItem[];
}

export const VisualAnalytics: React.FC<VisualAnalyticsProps> = ({ languages, repositories }) => {
  // Prepare top 6 repositories for popularity chart
  const popularityData = repositories.slice(0, 6).map((repo) => ({
    name: repo.name.length > 14 ? `${repo.name.slice(0, 12)}...` : repo.name,
    fullName: repo.name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language || 'Unknown',
  }));

  // Predefined vibrant palette matching dark theme
  const PALETTE = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Language Distribution Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-base">Language Distribution</h3>
            </div>
            <span className="text-xs text-slate-400">
              {languages.length} Detected
            </span>
          </div>

          <div className="h-64 mt-4 w-full">
            {languages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={languages}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="repo_count"
                    nameKey="language"
                  >
                    {languages.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || PALETTE[index % PALETTE.length]}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} repos (${item.payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                No language data detected in analyzed repositories.
              </div>
            )}
          </div>
        </div>

        {/* Language legend pills */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
          {languages.slice(0, 6).map((lang, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-900/80 border border-slate-800 text-xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: lang.color || PALETTE[idx % PALETTE.length] }}
              />
              <span className="text-slate-300 font-medium">{lang.language}</span>
              <span className="text-slate-400">({lang.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Repository Popularity (Stars & Forks) */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-base">Repository Reach</h3>
            </div>
            <span className="text-xs text-slate-400">
              Top {popularityData.length} Projects
            </span>
          </div>

          <div className="h-64 mt-4 w-full">
            {popularityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={popularityData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingBottom: '8px' }}
                  />
                  <Bar dataKey="stars" name="Stars" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="forks" name="Forks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                No repositories available to display reach metrics.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Compares star attraction and forks across analyzed public repositories.</span>
        </div>
      </div>
    </div>
  );
};
