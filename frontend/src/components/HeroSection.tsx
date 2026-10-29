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

  const extractHandle = (val: string): string => {
    const trimmed = val.trim();
    const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})(?:\/.*)?$/i);
    if (urlMatch && urlMatch[1]) return urlMatch[1];
    return trimmed.startsWith('@') ? trimmed.slice(1).trim() : trimmed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = extractHandle(inputVal);
    if (handle) {
      if (handle.toLowerCase() === 'alex-dev-demo' || handle.toLowerCase() === 'demo') {
        onLoadDemo();
      } else {
        onAnalyze(handle);
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

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto pt-1">
          <div className="relative flex items-center p-1.5 rounded-2xl bg-input backdrop-blur-xl border border-border focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/20 shadow-subtle transition-all duration-180">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter GitHub URL or handle"
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder-slate-500 font-mono text-xs sm:text-sm focus:outline-none py-2 px-3 disabled:opacity-50"
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
              className="px-2.5 py-1 rounded-lg bg-card hover:bg-neutral-900 text-slate-300 hover:text-white border border-border hover:border-[#477F7C] transition-all duration-180 font-mono text-[11px] disabled:opacity-40"
            >
              {ex.isDemo ? 'Alex Dev (Demo)' : `@${ex.username}`}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
