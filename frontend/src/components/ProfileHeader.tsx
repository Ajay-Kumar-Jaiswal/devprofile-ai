import React from 'react';
import type { UserProfile } from '../types/api';
import {
  ExternalLink,
  MapPin,
  Building,
  Link as LinkIcon,
  Calendar,
  Users,
  FolderGit2,
  CheckCircle2,
  Info,
  ShieldCheck,
  Globe,
} from 'lucide-react';

interface ProfileHeaderProps {
  profile: UserProfile;
  isDemoData: boolean;
  isConnectedAccount?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, isDemoData, isConnectedAccount = false }) => {
  const formattedCreatedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="relative glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-card overflow-hidden">
      {/* Top subtle banner if demo data or connection status */}
      {isDemoData ? (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>Demo Profile (Curated offline dataset for recruitment presentations)</span>
        </div>
      ) : isConnectedAccount ? (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Connected GitHub Account</span>
        </div>
      ) : (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>Public Profile Analysis</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Avatar + Main info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative group">
            <img
              src={profile.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
              alt={profile.login}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 shadow-glow-violet ${
                isConnectedAccount ? 'ring-emerald-500/40' : 'ring-violet-500/40'
              }`}
            />
            <div
              className={`absolute -bottom-1 -right-1 p-1 rounded-lg bg-navy-900 border ${
                isConnectedAccount
                  ? 'border-emerald-500/40 text-emerald-400'
                  : 'border-slate-700 text-slate-400'
              }`}
              title={isConnectedAccount ? 'Verified Connected Account' : 'Public Profile Audit'}
            >
              {isConnectedAccount ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Globe className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {profile.name || profile.login}
              </h2>
              <span className="text-slate-400 font-mono text-sm">@{profile.login}</span>
            </div>

            {profile.bio ? (
              <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                {profile.bio}
              </p>
            ) : (
              <p className="text-slate-500 text-sm italic">
                No bio provided on GitHub profile.
              </p>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 text-xs text-slate-400">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {profile.location}
                </span>
              )}
              {profile.company && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  {profile.company}
                </span>
              )}
              {profile.blog && (
                <a
                  href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[180px]">{profile.blog.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {formattedCreatedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Joined {formattedCreatedDate}
                  {profile.account_age_years ? ` (~${profile.account_age_years} yrs)` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side stats & View GitHub profile */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-300 bg-navy-900/60 px-4 py-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              <span>{profile.public_repos} Repos</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-violet-400" />
              <span>{profile.followers} Followers</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Following:</span>
              <span>{profile.following}</span>
            </div>
          </div>

          <a
            href={profile.html_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all shadow-subtle"
          >
            <span>View GitHub Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
