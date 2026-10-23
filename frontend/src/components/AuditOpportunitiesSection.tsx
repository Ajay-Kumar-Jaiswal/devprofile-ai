import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  ExternalLink,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { getInternships } from '../services/api';
import type { InternshipListingSummaryOut } from '../types/api';

interface AuditOpportunitiesSectionProps {
  primaryLanguage?: string | null;
  detectedLanguagesCount?: number;
}

export const AuditOpportunitiesSection: React.FC<AuditOpportunitiesSectionProps> = ({
  primaryLanguage,
  detectedLanguagesCount = 0,
}) => {
  const [vacancies, setVacancies] = useState<InternshipListingSummaryOut[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getInternships({ limit: 2, sort_by: 'match' })
      .then((res) => {
        if (!isMounted) return;
        setVacancies(res.items || []);
        setTotalCount(res.total || 0);
      })
      .catch((err) => {
        console.warn('Could not fetch preview opportunities:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getFitBadge = (fit?: string) => {
    if (fit === 'Strong Match') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (fit === 'Good Match') return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-violet-400 tracking-widest uppercase">
            05 /
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Career Opportunities
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Official ATS Feeds
          </span>
        </div>

        <Link
          to="/internships"
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-mono transition-colors self-start sm:self-auto"
        >
          <span>Explore All Opportunities {totalCount > 0 ? `(${totalCount})` : ''}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Compact Personalized Preview Card */}
      <div className="surface-card p-5 sm:p-5.5 rounded-2xl border border-slate-800 shadow-card space-y-4">
        {/* Top Info Bar: Stack Alignment & Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>Skill-Matched Internship Preview</span>
              {primaryLanguage && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/30">
                  Target: {primaryLanguage}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Opportunities computed against verified repository telemetry in{' '}
              <strong className="text-white font-mono">{primaryLanguage || 'your stack'}</strong>{' '}
              {detectedLanguagesCount > 0 && `(with ${detectedLanguagesCount} detected languages)`} across official Greenhouse &amp; Lever ATS feeds with 0 web scraping.
            </p>
          </div>

          <Link
            to="/internships"
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-semibold transition-colors shadow-subtle border border-violet-500/30"
          >
            <span>Explore Live Vacancies</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Live Matched Vacancies Preview if available */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-navy-950/60 border border-slate-800/80 animate-pulse space-y-2">
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-5 bg-slate-700 rounded w-2/3" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : vacancies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {vacancies.map((job) => {
              const fitLevel = job.match?.fit_level || 'Good Match';
              const matchScore = job.match?.match_score;
              const applyUrl = job.application_url || job.original_url;

              return (
                <div
                  key={job.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-navy-950/70 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-2.5 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-navy-900 text-slate-400 border border-slate-800">
                        {job.source_type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getFitBadge(fitLevel)}`}>
                        {matchScore ? `${matchScore}% Match` : fitLevel}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span>{job.company_name}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm leading-snug group-hover:text-violet-300 transition-colors">
                        {job.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{job.location || 'Remote'}</span>
                      <span>&bull;</span>
                      <span className="capitalize">{job.work_mode}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {job.match?.matched_skills && job.match.matched_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {job.match.matched_skills.slice(0, 2).map((s, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Official Board Feed</span>
                    )}

                    <a
                      href={applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <span>Apply on ATS</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-navy-950/50 border border-slate-800/60 flex items-center justify-between gap-3 text-xs text-slate-400 font-mono">
            <span>Direct employer feed syncing available on the dedicated internships board.</span>
            <Link to="/internships" className="text-violet-400 hover:text-violet-300 shrink-0 flex items-center gap-1">
              <span>View Board</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
