import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  ArrowRight,
  Compass,
  Terminal,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, openAuthDrawer } = useAuth();
  const navigate = useNavigate();
  const [heroInput, setHeroInput] = useState('');

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = heroInput.trim();
    if (!handle) return;
    if (handle.toLowerCase() === 'alex-dev-demo' || handle.toLowerCase() === 'demo') {
      navigate('/dashboard?demo=true');
    } else if (user) {
      navigate(`/dashboard?analyze=${encodeURIComponent(handle)}`);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(`/dashboard?analyze=${encodeURIComponent(handle)}`)}`);
    }
  };

  return (
    <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-between min-h-[calc(100vh-4rem-3.25rem)]">
      {/* Split-Screen Hero Section */}
      <section className="my-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Value Prop & Action Input (7 cols) */}
          <div className="lg:col-span-7 space-y-4 text-left">
            {/* Domain Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-900 border border-slate-800 text-xs font-mono font-medium text-slate-300 shadow-subtle">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Developer Career Intelligence Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-white leading-tight">
              Benchmark Your Code.{' '}
              <span className="text-violet-400">
                Prove Your Engineering Depth.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Technical recruiters review public GitHub portfolios in seconds. DevProfile AI executes deterministic 5-pillar repository audits, extracts verifiable skill evidence, and connects your tech stack to live vacancies.
            </p>

            {/* Quick Audit Command Form */}
            <form onSubmit={handleHeroSubmit} className="pt-0.5 max-w-xl">
              <div className="relative flex items-center p-1.5 rounded-xl bg-navy-900 border border-slate-700/80 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 shadow-card transition-all">
                <div className="pl-3 pr-1.5 select-none flex items-center gap-1.5 font-mono text-xs text-slate-400">
                  <span className="text-violet-400 font-bold">$</span>
                  <span>audit</span>
                </div>

                <input
                  type="text"
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  placeholder="Enter GitHub handle (e.g. octocat)"
                  className="w-full bg-transparent text-white placeholder-slate-500 font-mono text-xs sm:text-sm focus:outline-none py-1.5 px-2"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />

                <button
                  type="submit"
                  disabled={!heroInput.trim()}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm border border-violet-500/30 transition-all shadow-subtle disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <span>Audit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sample Profile Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs text-slate-400">
                <span className="text-slate-400 font-mono text-[11px]">Quick samples:</span>
                <Link
                  to="/dashboard?demo=true"
                  className="px-2 py-0.5 rounded-md bg-navy-900 hover:bg-slate-800 text-violet-300 border border-violet-500/20 font-mono text-[11px] transition-colors"
                >
                  alex-dev-demo (Placement Sample)
                </Link>
                {['octocat', 'gaearon', 'torvalds'].map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => {
                      if (user) {
                        navigate(`/dashboard?analyze=${handle}`);
                      } else {
                        navigate(`/login?redirect=${encodeURIComponent(`/dashboard?analyze=${handle}`)}`);
                      }
                    }}
                    className="px-2 py-0.5 rounded-md bg-navy-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 font-mono text-[11px] transition-colors cursor-pointer"
                  >
                    @{handle}
                  </button>
                ))}
              </div>
            </form>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              {user ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Open Developer Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuthDrawer('signup')}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Sign Up Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openAuthDrawer('signin')}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-700 bg-navy-900 hover:bg-slate-800 text-slate-200 font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Sign In</span>
                  </button>
                </>
              )}

              <Link
                to="/dashboard?demo=true"
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-navy-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-violet-400" />
                <span>Explore Placement Demo</span>
              </Link>
            </div>

            {/* Trust Points */}
            <div className="pt-1 flex flex-wrap items-center gap-y-1.5 gap-x-5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic 5-Pillar Rubric</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero AI Score Guessing</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Official Job Board APIs</span>
              </span>
            </div>
          </div>

          {/* Right Column: Live Interactive Audit Dossier Preview (5 cols) */}
          <div className="lg:col-span-5">
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-card space-y-3.5 relative">
              {/* Terminal Window Chrome */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400">audit-dossier://alex-dev-demo</span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LIVE BENCHMARK
                </span>
              </div>

              {/* Candidate Info Strip */}
              <div className="flex items-center justify-between gap-3 bg-navy-950 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-mono font-bold text-violet-300 text-xs">
                    AD
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Alex Dev</span>
                      <span className="text-slate-400 font-mono text-xs">@alex-dev-demo</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Full-Stack Engineer &bull; Bengaluru</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-emerald-400">88</span>
                  <span className="text-[10px] font-mono text-slate-400 block">/ 100 max</span>
                </div>
              </div>

              {/* 5-Pillar Score Mini Strip */}
              <div className="space-y-1.5 bg-navy-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 block">
                  Deterministic Score Pillars
                </span>
                {[
                  { name: 'Repo Documentation', score: 18, max: 20, pct: 90 },
                  { name: 'Commit Cadence & Momentum', score: 17, max: 20, pct: 85 },
                  { name: 'Code Quality & Structure', score: 22, max: 25, pct: 88 },
                  { name: 'Community Reach & Impact', score: 14, max: 15, pct: 93 },
                  { name: 'Profile Identity & Verification', score: 17, max: 20, pct: 85 },
                ].map((pillar, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span className="truncate">{pillar.name}</span>
                      <span className="font-mono text-slate-400">{pillar.score}/{pillar.max}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div className="bg-violet-400 h-full rounded-full" style={{ width: `${pillar.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Detected Language Stack */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Verified Language Telemetry
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'TypeScript', pct: '42%' },
                    { name: 'Python', pct: '31%' },
                    { name: 'Go', pct: '15%' },
                    { name: 'SQL', pct: '12%' },
                  ].map((lang) => (
                    <span
                      key={lang.name}
                      className="px-2 py-0.5 rounded bg-navy-950 text-slate-200 border border-slate-800 font-mono text-[10px] flex items-center gap-1"
                    >
                      <span>{lang.name}</span>
                      <span className="text-violet-400 font-semibold">{lang.pct}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Matched Internship Opportunity Preview */}
              <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase text-emerald-400 block">
                    Top Verified Opportunity
                  </span>
                  <span className="font-semibold text-white">Software Engineer Intern &bull; Cloudflare</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  92% Match
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrated Compact Callout Row: Visible Above The Fold On Desktop */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 text-center sm:text-left">
          <span className="font-semibold text-white">Ready to audit your GitHub profile?</span>
          <span className="hidden sm:inline text-slate-500">&bull;</span>
          <span className="text-slate-400">
            Get an objective 0–100 benchmark, concrete README recommendations, and live matched tech internships.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-subtle border border-violet-500/30 flex items-center gap-1"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthDrawer('signup')}
              className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-subtle border border-violet-500/30 flex items-center gap-1 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <Link
            to="/dashboard?demo=true"
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-navy-900 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors"
          >
            Explore Demo
          </Link>
        </div>
      </div>
    </div>
  );
};
