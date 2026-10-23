import React, { useState } from 'react';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onAnalyze: (username: string) => void;
  onLoadDemo: () => void;
  isLoading: boolean;
  currentUsername?: string;
}

const EXAMPLE_USERS = [
  { label: 'Demo Profile', username: 'alex-dev-demo', isDemo: true },
  { label: 'octocat', username: 'octocat', isDemo: false },
  { label: 'gaearon', username: 'gaearon', isDemo: false },
  { label: 'torvalds', username: 'torvalds', isDemo: false },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onAnalyze,
  onLoadDemo,
  isLoading,
  currentUsername = '',
}) => {
  const [inputVal, setInputVal] = useState(currentUsername);

  React.useEffect(() => {
    if (currentUsername) {
      setInputVal(currentUsername);
    }
  }, [currentUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) {
      if (trimmed.toLowerCase() === 'alex-dev-demo' || trimmed.toLowerCase() === 'demo') {
        onLoadDemo();
      } else {
        onAnalyze(trimmed);
      }
    }
  };

  const handleSelectExample = (username: string, isDemo: boolean) => {
    setInputVal(username);
    if (isDemo) {
      onLoadDemo();
    } else {
      onAnalyze(username);
    }
  };

  return (
    <section className="relative pt-10 pb-8 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Product Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-navy-900 border border-slate-700/80 text-slate-300 text-xs font-medium shadow-subtle">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Developer Career Intelligence &amp; GitHub Portfolio Audits</span>
        </div>

        {/* Hero Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Benchmark Your GitHub.{' '}
          <span className="text-violet-400">
            Elevate Your Career.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Deterministic 5-pillar repository quality scoring, tech stack verification, and actionable AI roadmaps engineered for technical recruitment readiness.
        </p>

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto pt-2">
          <div className="relative flex items-center p-1.5 rounded-2xl bg-navy-900 border border-slate-700/90 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 shadow-card transition-all">
            <div className="pl-3.5 pr-2 text-slate-400 select-none flex items-center gap-1.5 font-mono text-xs text-slate-400">
              <span className="text-violet-400 font-bold">$</span>
              <span>audit</span>
            </div>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter GitHub handle (e.g. octocat)"
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder-slate-500 font-mono text-xs sm:text-sm focus:outline-none py-2 px-2 disabled:opacity-50"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />

            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm border border-violet-500/30 transition-all shadow-subtle disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Example Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-400">
          <span className="text-slate-400">Sample candidate audits:</span>
          {EXAMPLE_USERS.map((ex) => (
            <button
              key={ex.username}
              onClick={() => handleSelectExample(ex.username, ex.isDemo)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors font-mono text-[11px] disabled:opacity-40"
            >
              {ex.isDemo ? 'Alex Dev (Demo)' : `@${ex.username}`}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
