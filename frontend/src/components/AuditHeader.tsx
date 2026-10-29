import React, { useState } from 'react';
import type { UserProfile, AggregateStats, PortfolioScore, RepoQualityChecklist } from '../types/api';
import {
  ExternalLink,
  MapPin,
  Building,
  Link as LinkIcon,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Globe,
  BookOpen,
  Star,
  GitFork,
  Code2,
} from 'lucide-react';

interface AuditHeaderProps {
  profile: UserProfile;
  stats: AggregateStats;
  score: PortfolioScore;
  qualityChecklist?: RepoQualityChecklist;
  analyzedAt?: string;
  isDemoData: boolean;
  isConnectedAccount?: boolean;
  topTopics?: string[];
}

export const AuditHeader: React.FC<AuditHeaderProps> = ({
  profile,
  stats,
  score,
  isDemoData,
  isConnectedAccount = false,
  topTopics = [],
}) => {
  const [avatarError, setAvatarError] = useState(false);

  const getScoreColor = (val: number) => {
    if (val >= 85) return { text: 'text-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
    if (val >= 70) return { text: 'text-violet-400', bar: 'bg-violet-400', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/40' };
    if (val >= 50) return { text: 'text-slate-100', bar: 'bg-slate-300', badge: 'bg-slate-800 text-slate-200 border-slate-700' };
    if (val >= 30) return { text: 'text-amber-400', bar: 'bg-amber-400', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40' };
    return { text: 'text-rose-400', bar: 'bg-rose-400', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40' };
  };

  const theme = getScoreColor(score.overall_score);

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      })
    : null;

  const initials = (profile.name || profile.login || 'Dev')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const displayTopics = topTopics.length > 0
    ? topTopics.slice(0, 5)
    : [
        'Open Source',
        stats.primary_language || 'Full Stack',
        stats.detected_languages_count > 1 ? `${stats.detected_languages_count} Languages` : null,
        score.overall_score >= 70 ? 'High Hygiene' : null,
      ].filter(Boolean) as string[];

  return (
    <section className="space-y-3.5">
      {/* Main Audit Dossier Card (3-Column Layout on Desktop) */}
      <div className="surface-card rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card p-4 sm:p-5 overflow-hidden backdrop-blur-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* Column 1: Candidate Identity, Bio & Skill Pills (5 cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 min-w-0">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                {!avatarError && profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.login}
                    onError={() => setAvatarError(true)}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border border-slate-700 ring-1 ring-slate-800"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#141b28]/45 border border-[rgba(148,163,184,0.18)] flex items-center justify-center font-mono font-bold text-lg sm:text-xl text-violet-300 ring-1 ring-slate-800 select-none">
                    {initials}
                  </div>
                )}
                <div
                  className={`absolute -bottom-1 -right-1 p-1 rounded-lg bg-[#101723]/80 border ${
                    isConnectedAccount ? 'border-emerald-500/40 text-emerald-400' : 'border-[rgba(148,163,184,0.18)] text-slate-400'
                  }`}
                  title={isConnectedAccount ? 'Verified Connected Account' : 'Public Profile Audit'}
                >
                  {isConnectedAccount ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Globe className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight truncate">
                    {profile.name || profile.login}
                  </h1>
                  <a
                    href={profile.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-slate-400 hover:text-violet-400 transition-colors inline-flex items-center gap-1"
                  >
                    <span>@{profile.login}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {isDemoData ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Demo
                    </span>
                  ) : isConnectedAccount ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Connected</span>
                    </span>
                  ) : null}
                </div>

                {profile.bio ? (
                  <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-slate-500 text-xs italic">
                    No public bio configured on GitHub profile.
                  </p>
                )}

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-400">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{profile.location}</span>
                    </span>
                  )}
                  {profile.company && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-500" />
                      <span>{profile.company}</span>
                    </span>
                  )}
                  {profile.blog && (
                    <a
                      href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">{profile.blog.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {memberSince && (
                    <span className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                      <Calendar className="w-3 h-3" />
                      <span>Since {memberSince}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Topic / Skill Pill Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {displayTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] text-[11px] font-mono text-slate-200"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* Column 2: Overall Score Card (3 cols on desktop) */}
          <div className="lg:col-span-3 p-3.5 sm:p-4 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] hover:border-[rgba(148,163,184,0.28)] transition-all duration-180 flex flex-col justify-between space-y-2.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                Overall Score
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border shrink-0 ${theme.badge}`}>
                {score.tier}
              </span>
            </div>

            <div className="space-y-1.5 my-auto py-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${theme.text}`}>
                  {score.overall_score}
                </span>
                <span className="text-xs font-mono font-medium text-slate-500">
                  / 100 max points
                </span>
              </div>

              {/* Linear Progress Bar */}
              <div className="w-full bg-[#0E1017] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                  style={{ width: `${Math.max(5, score.overall_score)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              {score.summary}
            </p>
          </div>

          {/* Column 3: 2x2 Metric Mini-Cards Grid (4 cols on desktop) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-2 sm:gap-2.5 h-full min-w-0">
            {/* Card 1: Public Repositories */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] hover:border-[rgba(148,163,184,0.28)] transition-all duration-180 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Public Repos</span>
              </span>
              <div className="pt-0.5">
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-100">
                  {stats.total_public_repos}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {stats.total_analyzed_repos} audited
                </div>
              </div>
            </div>

            {/* Card 2: Total Stars */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] hover:border-[rgba(148,163,184,0.28)] transition-all duration-180 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400/90" />
                <span>Total Stars</span>
              </span>
              <div className="pt-0.5">
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-100">
                  {stats.total_stars}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  across all repos
                </div>
              </div>
            </div>

            {/* Card 3: Total Forks */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] hover:border-[rgba(148,163,184,0.28)] transition-all duration-180 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-slate-400" />
                <span>Total Forks</span>
              </span>
              <div className="pt-0.5">
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-100">
                  {stats.total_forks}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  community forks
                </div>
              </div>
            </div>

            {/* Card 4: Primary Language */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] hover:border-[rgba(148,163,184,0.28)] transition-all duration-180 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Primary Stack</span>
              </span>
              <div className="pt-0.5">
                <div className="text-base sm:text-lg font-bold text-slate-100 truncate max-w-[130px]">
                  {stats.primary_language || 'Multi-stack'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {stats.detected_languages_count} detected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
