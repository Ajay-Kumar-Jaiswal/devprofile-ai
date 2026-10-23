import React, { useState } from 'react';
import type { RepositoryItem, UserProfile } from '../types/api';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface AuditFindingsSectionProps {
  repositories: RepositoryItem[];
  profile: UserProfile;
  onViewAllAudits?: () => void;
}

export type FindingSeverity = 'high_defect' | 'medium_defect' | 'strength';

export interface AuditFinding {
  id: string;
  severity: FindingSeverity;
  category: 'Documentation' | 'Compliance' | 'Discoverability' | 'Activity' | 'Profile Identity';
  title: string;
  affectedRepos: Array<{ name: string; url: string }>;
  recruiterContext: string;
  actionableStep: string;
}

export const AuditFindingsSection: React.FC<AuditFindingsSectionProps> = ({
  repositories,
  profile,
  onViewAllAudits,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'defects' | 'strengths'>('all');

  // Derive findings deterministically from real repository and profile telemetry
  const findings: AuditFinding[] = [];

  // 1. Defect: Missing README
  const reposWithoutReadme = repositories.filter((r) => !r.has_readme);
  if (reposWithoutReadme.length > 0) {
    findings.push({
      id: 'defect-missing-readme',
      severity: 'high_defect',
      category: 'Documentation',
      title: `${reposWithoutReadme.length} ${
        reposWithoutReadme.length === 1 ? 'Repository Lacks' : 'Repositories Lack'
      } a README Documentation File`,
      affectedRepos: reposWithoutReadme.map((r) => ({ name: r.name, url: r.html_url })),
      recruiterContext:
        'Hiring managers and technical interviewers prioritize repositories with clear project overviews. An empty repo root causes 80% of evaluators to skip inspecting code.',
      actionableStep:
        'Add a structured README.md with project purpose, architecture diagram, local setup instructions, and demo GIF or screenshot.',
    });
  }

  // 2. Defect: Missing Open Source License
  const reposWithoutLicense = repositories.filter((r) => !r.has_license);
  if (reposWithoutLicense.length > 0) {
    findings.push({
      id: 'defect-missing-license',
      severity: 'high_defect',
      category: 'Compliance',
      title: `${reposWithoutLicense.length} ${
        reposWithoutLicense.length === 1 ? 'Repository Missing' : 'Repositories Missing'
      } Open Source License`,
      affectedRepos: reposWithoutLicense.map((r) => ({ name: r.name, url: r.html_url })),
      recruiterContext:
        'Unlicensed public code is legally ambiguous. Engineering teams cannot clone or run proprietary-like code during interview evaluations without an explicit open-source license.',
      actionableStep:
        'Add a standard permissive license (such as MIT or Apache-2.0) using GitHub’s "Add License" template.',
    });
  }

  // 3. Defect: Missing Description or Topics
  const reposWithoutMetadata = repositories.filter(
    (r) => !r.has_description || !r.has_topics || r.topics.length === 0
  );
  if (reposWithoutMetadata.length > 0) {
    findings.push({
      id: 'defect-missing-metadata',
      severity: 'medium_defect',
      category: 'Discoverability',
      title: `${reposWithoutMetadata.length} ${
        reposWithoutMetadata.length === 1 ? 'Project Has' : 'Projects Have'
      } Incomplete Metadata or Missing Topic Tags`,
      affectedRepos: reposWithoutMetadata.map((r) => ({ name: r.name, url: r.html_url })),
      recruiterContext:
        'Repository descriptions and technology topics are the first signals indexed by technical recruiter search engines and automated screeners.',
      actionableStep:
        'Edit repository "About" settings to provide a 1-sentence value proposition and add 3 to 5 stack keywords (e.g., #fastapi, #react, #typescript).',
    });
  }

  // 4. Defect: Stale Repository Momentum (> 180 days without a push)
  const staleRepos = repositories.filter(
    (r) => r.days_since_last_push !== null && r.days_since_last_push > 180
  );
  if (staleRepos.length > 0 && staleRepos.length === repositories.length) {
    findings.push({
      id: 'defect-stale-momentum',
      severity: 'medium_defect',
      category: 'Activity',
      title: 'Stale Repository Activity — No Recent Commits Detected in Past 6 Months',
      affectedRepos: staleRepos.slice(0, 4).map((r) => ({ name: r.name, url: r.html_url })),
      recruiterContext:
        'Dormant profiles signal potential lapse in engineering momentum. Recruiters prefer active builders who commit regularly to show continuous learning.',
      actionableStep:
        'Push a maintenance commit, upgrade outdated dependencies, or ship an active feature branch on your primary flagship project.',
    });
  }

  // 5. Defect: Profile Identity gaps
  if (!profile.bio || profile.bio.trim().length === 0) {
    findings.push({
      id: 'defect-empty-bio',
      severity: 'medium_defect',
      category: 'Profile Identity',
      title: 'Missing Professional Headline / GitHub Bio',
      affectedRepos: [],
      recruiterContext:
        'Profile bio is the primary anchor of candidate identity. Recruiters quickly scan bio to identify target role, seniority level, and primary specializations.',
      actionableStep:
        'Write a concise bio summarizing your specialty: e.g., "Full-Stack Engineer specializing in TypeScript, React, and Python distributed systems."',
    });
  }

  // 6. Strengths: Documented Repositories
  const fullyDocumented = repositories.filter(
    (r) => r.has_readme && r.has_license && r.has_description
  );
  if (fullyDocumented.length > 0) {
    findings.push({
      id: 'strength-well-documented',
      severity: 'strength',
      category: 'Documentation',
      title: `${fullyDocumented.length} ${
        fullyDocumented.length === 1 ? 'Repository Meets' : 'Repositories Meet'
      } Full Documentation & Licensing Standards`,
      affectedRepos: fullyDocumented.map((r) => ({ name: r.name, url: r.html_url })),
      recruiterContext:
        'Verified README, open-source license, and clear description demonstrate production readiness and high engineering rigor.',
      actionableStep:
        'Maintain this documentation standard across all future project releases.',
    });
  }

  // 7. Strengths: Active momentum / recent pushes
  const recentlyPushed = repositories.filter(
    (r) => r.days_since_last_push !== null && r.days_since_last_push <= 45
  );
  if (recentlyPushed.length > 0) {
    findings.push({
      id: 'strength-active-momentum',
      severity: 'strength',
      category: 'Activity',
      title: `High Momentum: Recent Code Commits Detected Within the Last 45 Days`,
      affectedRepos: recentlyPushed.map((r) => ({ name: r.name, url: r.html_url })),
      recruiterContext:
        'Active commits demonstrate continuous engineering engagement and enthusiasm for hands-on building.',
      actionableStep:
        'Pin your most active and polished project to the top of your GitHub profile.',
    });
  }

  // 8. Strengths: Community engagement or stars
  const engagedRepos = repositories.filter((r) => r.stargazers_count > 0 || r.forks_count > 0);
  if (engagedRepos.length > 0) {
    findings.push({
      id: 'strength-community-engagement',
      severity: 'strength',
      category: 'Discoverability',
      title: `Social Proof: ${engagedRepos.length} ${
        engagedRepos.length === 1 ? 'Project Has' : 'Projects Have'
      } Earned Community Stars or Forks`,
      affectedRepos: engagedRepos.map((r) => ({ name: r.name, url: r.html_url })),
      recruiterContext:
        'Community validation highlights that external developers find your code useful, well-architected, or educational.',
      actionableStep:
        'Add deployment links and setup badges to convert stargazers into active contributors.',
    });
  }

  // Calculate counts
  const defectCount = findings.filter(
    (f) => f.severity === 'high_defect' || f.severity === 'medium_defect'
  ).length;
  const strengthCount = findings.filter((f) => f.severity === 'strength').length;

  // Filter findings
  const filteredFindings = findings.filter((f) => {
    if (activeFilter === 'defects') return f.severity === 'high_defect' || f.severity === 'medium_defect';
    if (activeFilter === 'strengths') return f.severity === 'strength';
    return true;
  });

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-violet-400 tracking-widest uppercase">
              03 /
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Key Findings &amp; Evidence
            </h2>
          </div>
          {onViewAllAudits && (
            <button
              type="button"
              onClick={onViewAllAudits}
              className="hidden md:inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-mono transition-colors cursor-pointer"
            >
              <span>Full Repository Audit Checklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white bg-navy-950 border border-slate-900'
            }`}
          >
            All Findings ({findings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('defects')}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors flex items-center gap-1 ${
              activeFilter === 'defects'
                ? 'bg-rose-500/10 text-rose-300 font-bold border border-rose-500/30'
                : 'text-rose-400/70 hover:text-rose-300 bg-navy-950 border border-slate-900'
            }`}
          >
            <span>Defects ({defectCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('strengths')}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors flex items-center gap-1 ${
              activeFilter === 'strengths'
                ? 'bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-emerald-400/70 hover:text-emerald-300 bg-navy-950 border border-slate-900'
            }`}
          >
            <span>Strengths ({strengthCount})</span>
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3.5">
        {filteredFindings.map((finding) => {
          const isHighDefect = finding.severity === 'high_defect';
          const isMediumDefect = finding.severity === 'medium_defect';
          const isStrength = finding.severity === 'strength';

          return (
            <div
              key={finding.id}
              className={`p-5 rounded-2xl border shadow-card transition-all ${
                isStrength
                  ? 'surface-card border-emerald-500/20 hover:border-emerald-500/40'
                  : isHighDefect
                  ? 'surface-card border-rose-500/30 hover:border-rose-500/50'
                  : 'surface-card border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left block: Severity, category, title, affected repos & context */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity Badge */}
                    {isHighDefect && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>High Defect</span>
                      </span>
                    )}
                    {isMediumDefect && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Medium Defect</span>
                      </span>
                    )}
                    {isStrength && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Verified Strength</span>
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      [{finding.category}]
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">
                    {finding.title}
                  </h3>

                  {/* Affected Repositories Chips with Clickable Direct Links */}
                  {finding.affectedRepos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        Affected Projects ({finding.affectedRepos.length}):
                      </span>
                      {finding.affectedRepos.map((repo, idx) => (
                        <a
                          key={idx}
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-navy-950 border border-slate-700/80 hover:border-violet-400 text-slate-200 hover:text-white font-mono text-[11px] font-semibold transition-colors group"
                          title={`Open ${repo.name} on GitHub`}
                        >
                          <span>{repo.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-violet-400" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Recruiter Evaluation Context */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                    <strong className="text-slate-400 font-semibold font-mono text-xs">
                      Recruiter Impact:&nbsp;
                    </strong>
                    {finding.recruiterContext}
                  </p>
                </div>

                {/* Right / Bottom Action Block */}
                <div className="lg:w-80 shrink-0 p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5 self-stretch flex flex-col justify-center">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                      isStrength ? 'text-emerald-400' : 'text-violet-400'
                    }`}
                  >
                    {isStrength ? 'Recommended Best Practice' : 'Remediation Step'}
                  </span>
                  <p className="text-xs text-slate-200 leading-snug font-mono">
                    {finding.actionableStep}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {filteredFindings.length === 0 && (
          <div className="p-8 text-center surface-card rounded-2xl border border-slate-800 text-slate-400 text-xs font-mono">
            No items matching selected filter.
          </div>
        )}
      </div>
    </section>
  );
};
