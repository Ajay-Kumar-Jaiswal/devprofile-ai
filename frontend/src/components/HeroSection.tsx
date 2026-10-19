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
    <section className="relative pt-12 pb-10 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-violet-600/15 via-blue-600/15 to-transparent blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Placement Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-navy-800/80 border border-slate-700/70 text-slate-300 text-xs font-medium backdrop-blur-sm shadow-subtle">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Deterministic Engineering Audits for Campus Placements</span>
        </div>

        {/* Hero Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Analyze Your GitHub.{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
            Level Up Your Career.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Comprehensive repository quality scoring, tech stack breakdown, and targeted 7-day &amp; 30-day action plans built to help students stand out during technical recruitment.
        </p>

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto pt-2">
          <div className="relative flex items-center p-1.5 rounded-2xl bg-navy-900/90 border border-slate-700/80 focus-within:border-violet-500/80 focus-within:ring-2 focus-within:ring-violet-500/20 shadow-card transition-all">
            <div className="pl-3.5 pr-2 text-slate-400">
              <svg className="w-5 h-5 text-slate-400 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </div>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter GitHub handle or profile URL (e.g. octocat or https://github.com/octocat)"
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none py-2 px-1 disabled:opacity-50"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />

            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-glow-violet disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Example Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-400">
          <span className="text-slate-400">Try sample profiles:</span>
          {EXAMPLE_USERS.map((ex) => (
            <button
              key={ex.username}
              onClick={() => handleSelectExample(ex.username, ex.isDemo)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-md bg-navy-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors font-mono disabled:opacity-40"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
