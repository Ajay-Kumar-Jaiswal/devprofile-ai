import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Sparkles,
  ShieldCheck,
  History,
  CheckCircle2,
  ArrowRight,
  FolderGit2,
  Compass,
  BarChart3,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, openAuthDrawer } = useAuth();

  return (
    <div className="space-y-24 py-6 sm:py-12">
      {/* 1. Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-8">
        {/* Placement Drive Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-xs font-semibold text-violet-300 shadow-glow-violet animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Campus Placement Preparation &amp; Tech Interview Readiness</span>
        </div>

        {/* Hero Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] animate-fadeIn">
          Analyze Your GitHub.{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
            Level Up Your Career.
          </span>
        </h1>

        {/* Short Explanation for Students & Job Seekers */}
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Technical recruiters spend under 60 seconds reviewing your GitHub before deciding to interview you.
          DevProfile AI audits your repositories, reveals blind spots, scores portfolio hygiene (0–100), and generates AI roadmaps to help you stand out.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-glow-violet flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <span>Go to Your Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthDrawer('signup')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-glow-violet flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <span>Analyze Your Profile Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => openAuthDrawer('signin')}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-700 bg-navy-900/80 hover:bg-slate-800 text-slate-200 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Sign In to Account</span>
              </button>
            </>
          )}

          <Link
            to="/dashboard?demo=true"
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-violet-400" />
            <span>Explore Placement Demo</span>
          </Link>
        </div>

        {/* Feature Highlights Trust Strip */}
        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-xs text-slate-400">
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-navy-900/40 border border-slate-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>0–100 Objective Score</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-navy-900/40 border border-slate-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>AI Developer Insights</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-navy-900/40 border border-slate-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Progress Tracking</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-navy-900/40 border border-slate-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Private History</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Product Teaser Mockup */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/90 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Window Mockup Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-slate-400">devprofile.ai/dashboard</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-800 font-mono text-[11px] text-slate-300">
              Sample Candidate Audit
            </span>
          </div>

          {/* Teaser Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Portfolio Score Teaser */}
            <div className="p-5 rounded-2xl bg-navy-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Portfolio Score
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Exceptional Tier
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">88</span>
                <span className="text-sm font-medium text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Evaluated across 5 deterministic pillars: Branding, Hygiene, Reach, Stack Depth, and Freshness.
              </p>
            </div>

            {/* AI Insights Teaser */}
            <div className="p-5 rounded-2xl bg-navy-900/90 border border-violet-500/30 space-y-3">
              <div className="flex items-center gap-2 text-violet-400 text-xs uppercase font-bold tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI Portfolio Analysis</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed italic">
                "Strong backend architecture with demonstrated Go concurrency and async Python pipelines. Flagship projects prove real engineering depth over tutorial replicas."
              </p>
              <div className="text-[11px] text-violet-300 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Includes interviewer talking points</span>
              </div>
            </div>

            {/* Placement Roadmap Teaser */}
            <div className="p-5 rounded-2xl bg-navy-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-xs uppercase font-bold tracking-wider">
                <Compass className="w-4 h-4" />
                <span>7-Day Placement Sprint</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>Day 1–2: Deploy live demos to Vercel</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>Day 3–4: Add architecture diagrams</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>Day 5–7: Pin flagship repos in profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Feature Cards */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered Specifically For Developer Recruitment
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Everything you need to audit, polish, and verify your public repositories before submitting your resume.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: 5-Pillar Scoring */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Deterministic 5-Pillar Scoring
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Objective 0–100 scoring based strictly on reproducible rules across documentation, language depth, community reach, and commit momentum.
            </p>
          </div>

          {/* Card 2: Tech-Stack Telemetry */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Technology Stack Telemetry
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Interactive language donut charts and repository reach telemetry calculate specialization dominance vs. multi-discipline versatility.
            </p>
          </div>

          {/* Card 3: Project Improvement Suggestions */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Project Improvement Suggestions
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Detects repositories missing READMEs, MIT licenses, descriptions, and topic tags. Offers code-level suggestions for top repositories.
            </p>
          </div>

          {/* Card 4: Career Roadmaps & Interview Points */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Placement Roadmaps &amp; Talking Points
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Provides tailored 7-day tactical sprints and 30-day strategic timelines with exact topics to discuss during engineering interviews.
            </p>
          </div>

          {/* Card 5: Adaptive Reconciliation */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Adaptive Reconciliation Engine
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Findings adapt to actual repository changes. When you add a missing license, it auto-resolves. If a bug regresses, it reopens.
            </p>
          </div>

          {/* Card 6: Persistent Analysis History */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Persistent Analysis History
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every audit is saved in your private database account. Compare two runs side-by-side to visualize score jumps and closed issues.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold tracking-wider text-violet-400">
            Simple 3-Step Workflow
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How DevProfile AI Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-subtle">
              1
            </div>
            <h3 className="text-base font-bold text-white">Enter GitHub Profile</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect with GitHub OAuth or enter any public profile handle or URL (e.g. <code className="text-slate-300">github.com/username</code>).
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-subtle">
              2
            </div>
            <h3 className="text-base font-bold text-white">Dual-Engine Audit</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our deterministic engine verifies repository hygiene while AI analysis produces grounded qualitative project critiques and talking points.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-subtle">
              3
            </div>
            <h3 className="text-base font-bold text-white">Fix, Level Up, &amp; Track</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Implement recommended README, deployment, and testing steps. Re-analyze to watch resolved findings close and scores climb.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Placement Preparation Callout Banner */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-violet-500/30 shadow-glow-violet flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Preparing for campus placement drives or off-campus hiring?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Join students and junior engineers who use DevProfile AI to ensure their public code makes the strongest possible first impression on recruiters.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openAuthDrawer('signup')}
              className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle hover:shadow-glow-violet"
            >
              Get Started Free
            </button>
            <Link
              to="/dashboard?demo=true"
              className="px-5 py-3 rounded-xl border border-slate-700 bg-navy-900 hover:bg-slate-800 text-slate-200 font-medium text-xs sm:text-sm transition-colors text-center"
            >
              Explore Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
