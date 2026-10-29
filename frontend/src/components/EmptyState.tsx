import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onLoadDemo: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onLoadDemo }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      {/* Demo Callout banner */}
      <div className="p-6 sm:p-7 rounded-2xl bg-[#101723]/60 backdrop-blur-xl border border-[rgba(148,163,184,0.18)] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-card">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            College Placement Drive Demo
          </div>
          <h4 className="text-lg font-bold text-white">
            Want to see how an audited developer portfolio looks?
          </h4>
          <p className="text-xs sm:text-sm text-slate-300">
            Load our pre-configured demo student profile with sample repositories, metrics, and roadmap.
          </p>
        </div>

        <button
          onClick={onLoadDemo}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 active:scale-[0.99] cursor-pointer"
        >
          <span>Explore Demo Profile</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
