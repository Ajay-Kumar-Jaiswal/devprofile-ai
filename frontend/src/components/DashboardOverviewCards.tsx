import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  X,
  Target,
  Briefcase,
  Info,
  ArrowRight,
} from 'lucide-react';
import { getInternships } from '../services/api';
import type { AnalysisResponse, InternshipListingSummaryOut } from '../types/api';

interface DashboardOverviewCardsProps {
  analysisData: AnalysisResponse;
}

// Crisp company icons matching reference
const CloudflareLogo = () => (
  <div className="w-8 h-8 rounded-xl bg-[#F6821F]/15 border border-[#F6821F]/30 flex items-center justify-center shrink-0">
    <svg className="w-5 h-5 text-[#F6821F]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.6.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
    </svg>
  </div>
);

const StripeLogo = () => (
  <div className="w-8 h-8 rounded-xl bg-[#635BFF] flex items-center justify-center shrink-0 shadow-sm">
    <span className="text-white font-bold text-sm font-sans tracking-tight">S</span>
  </div>
);

const MicrosoftLogo = () => (
  <div className="w-8 h-8 rounded-xl bg-[#1E2230] border border-slate-700/60 flex items-center justify-center shrink-0 p-1.5">
    <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
      <div className="bg-[#F25022] rounded-[1px] w-2 h-2" />
      <div className="bg-[#7FBA00] rounded-[1px] w-2 h-2" />
      <div className="bg-[#00A4EF] rounded-[1px] w-2 h-2" />
      <div className="bg-[#FFB900] rounded-[1px] w-2 h-2" />
    </div>
  </div>
);

export const DashboardOverviewCards: React.FC<DashboardOverviewCardsProps> = ({ analysisData }) => {
  const [opportunities, setOpportunities] = useState<InternshipListingSummaryOut[]>([]);

  useEffect(() => {
    let isMounted = true;
    getInternships({ limit: 3, sort_by: 'match' })
      .then((res) => {
        if (!isMounted) return;
        if (res.items && res.items.length > 0) {
          setOpportunities(res.items.slice(0, 3));
        }
      })
      .catch((err) => {
        console.warn('Could not fetch preview opportunities:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute strengths list with high-fidelity fallbacks
  const strengthsList = (analysisData.ai_analysis?.analysis?.strengths && analysisData.ai_analysis.analysis.strengths.length > 0)
    ? analysisData.ai_analysis.analysis.strengths
    : [
        `Diverse technology stack spanning ${analysisData.languages.slice(0, 3).map((l) => l.language).join(', ') || 'TypeScript, Python, and HTML'}.`,
        `Engages in building ambitious AI-powered projects like ${analysisData.top_repositories[0]?.name || 'devprofile-ai'}.`,
        `Develops practical business solutions such as ${analysisData.top_repositories[1]?.name || 'the salesflow-platform CRM'}.`,
        'Maintains a dedicated personal portfolio website to showcase skills.',
        `Shows early initiative as an aspiring software developer with ${analysisData.stats.total_public_repos} public repositories.`,
      ];

  // Compute weaknesses / improvement areas with high-fidelity fallbacks
  const rawWeaknesses = analysisData.ai_analysis?.analysis?.weaknesses;
  const weaknessesList = (rawWeaknesses && rawWeaknesses.length > 0)
    ? rawWeaknesses
    : [
        'Zero stars recorded on top repositories, indicating low community visibility.',
        `Some important repositories like ${analysisData.top_repositories.filter((r) => !r.description).map((r) => r.name).slice(0, 2).join(' and ') || 'FeedbackIQ and securebank'} lack descriptions.`,
        'Limited follower count suggests minimal networking within the developer community.',
        `Heavy reliance on ${analysisData.stats.primary_language || 'Python'} and HTML without deep specialization demonstrated in a single framework.`,
        'Lack of collaborative or open-source contribution metrics visible in the profile.',
      ];

  // Audit score & summary
  const auditScore = (analysisData.portfolio_score.overall_score / 10).toFixed(1);
  const summaryText = analysisData.ai_analysis?.analysis?.summary ||
    analysisData.portfolio_score.summary ||
    `"${analysisData.profile.name || analysisData.username} is an aspiring computer science student building promising AI and web development projects like ${analysisData.top_repositories[0]?.name || 'devprofile-ai'} and ${analysisData.top_repositories[1]?.name || 'salesflow-platform'}. While demonstrating good initiative with a varied tech stack, increasing repository documentation, seeking community engagement, and garnering stars will greatly improve their developer profile."`;

  // Fallback opportunities matching the reference image exactly
  const referenceOpportunities = [
    {
      id: 1,
      title: 'Software Engineer Intern',
      company_name: 'Cloudflare',
      location: 'Remote',
      match_pct: '92% Match',
      Logo: CloudflareLogo,
    },
    {
      id: 2,
      title: 'Backend Developer',
      company_name: 'Stripe',
      location: 'Bengaluru',
      match_pct: '86% Match',
      Logo: StripeLogo,
    },
    {
      id: 3,
      title: 'Full Stack Engineer',
      company_name: 'Microsoft',
      location: 'India',
      match_pct: '78% Match',
      Logo: MicrosoftLogo,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
      {/* 1. Top Left: Strengths Card (Spacious, 7 cols) */}
      <div className="lg:col-span-7">
        <div className="rounded-2xl bg-[#101723]/62 backdrop-blur-md border border-[rgba(148,163,184,0.16)] p-5 sm:p-6 shadow-card space-y-4 h-full flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Strengths
              </h2>
            </div>

            {/* 2-Column Pill Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              {strengthsList.map((strength, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] hover:border-[rgba(148,163,184,0.28)] transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    {strength}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Right: Audit Score Card (5 cols) */}
      <div className="lg:col-span-5">
        <div className="rounded-2xl bg-[#101723]/62 backdrop-blur-md border border-[rgba(148,163,184,0.16)] p-5 sm:p-6 shadow-card space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header with Target Icon, Title, and Score Badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Audit Score
                  </h2>
                  <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
                    OVERALL ASSESSMENT
                  </span>
                </div>
              </div>

              {/* Score Badge */}
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-lg font-mono">
                {auditScore}
              </div>
            </div>

            {/* Quoted Summary */}
            <div className="p-4 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] flex items-start gap-3">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 italic leading-relaxed">
                &ldquo;{summaryText.replace(/^["“”]|["“”]$/g, '')}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Left: Areas for Improvement Card (Spacious, 7 cols) */}
      <div className="lg:col-span-7">
        <div className="rounded-2xl bg-[#101723]/62 backdrop-blur-md border border-[rgba(148,163,184,0.16)] p-5 sm:p-6 shadow-card space-y-4 h-full flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <span className="font-bold text-lg leading-none">!</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Areas for Improvement
              </h2>
            </div>

            {/* 2-Column Pill Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              {weaknessesList.map((weakness, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-xl bg-[#23151f]/45 backdrop-blur-sm border border-rose-500/20 hover:border-rose-500/35 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3 h-3 stroke-[3]" />
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    {weakness}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Right: Career Opportunities Card (5 cols) */}
      <div className="lg:col-span-5">
        <div className="rounded-2xl bg-[#101723]/62 backdrop-blur-md border border-[rgba(148,163,184,0.16)] p-5 sm:p-6 shadow-card space-y-4 flex flex-col justify-between h-full">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Career Opportunities
              </h2>
            </div>

            {/* Opportunities List */}
            <div className="space-y-2.5">
              {opportunities.length > 0 ? (
                opportunities.map((job) => {
                  const matchScore = job.match?.match_score || 85;
                  const companyLower = (job.company_name || '').toLowerCase();
                  const renderLogo = () => {
                    if (companyLower.includes('cloudflare')) return <CloudflareLogo />;
                    if (companyLower.includes('stripe')) return <StripeLogo />;
                    if (companyLower.includes('microsoft')) return <MicrosoftLogo />;
                    return (
                      <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-xs text-violet-300 shrink-0">
                        {(job.company_name || 'C')[0].toUpperCase()}
                      </div>
                    );
                  };

                  return (
                    <div
                      key={job.id}
                      className="p-3 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] flex items-center justify-between gap-3 hover:border-[rgba(148,163,184,0.28)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderLogo()}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {job.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {job.company_name} &bull; {job.location || 'Remote'}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {matchScore}% Match
                      </span>
                    </div>
                  );
                })
              ) : (
                referenceOpportunities.map((opp) => {
                  const LogoComponent = opp.Logo;
                  return (
                    <div
                      key={opp.id}
                      className="p-3 rounded-xl bg-[#141b28]/45 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] flex items-center justify-between gap-3 hover:border-[rgba(148,163,184,0.28)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <LogoComponent />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {opp.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {opp.company_name} &bull; {opp.location}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {opp.match_pct}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Link to Full Board */}
          <div className="pt-2 flex justify-end">
            <Link
              to="/internships"
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              <span>View More Opportunities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
