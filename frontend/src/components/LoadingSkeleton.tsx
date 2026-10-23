import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
      {/* Progress feedback banner */}
      <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-violet-950/30 border border-violet-500/20 text-violet-300 text-sm font-medium">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        <span>Querying GitHub REST API &amp; computing deterministic portfolio score...</span>
      </div>

      {/* Profile Header skeleton */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-800" />
          <div className="space-y-2 flex-1">
            <div className="w-48 h-6 bg-slate-800 rounded" />
            <div className="w-32 h-4 bg-slate-800/60 rounded" />
            <div className="w-96 max-w-full h-4 bg-slate-800/40 rounded" />
          </div>
        </div>
      </div>

      {/* 4 Stats Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="w-24 h-4 bg-slate-800 rounded" />
            <div className="w-16 h-8 bg-slate-800 rounded" />
            <div className="w-32 h-3 bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>

      {/* Score and charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 border border-slate-800 h-72 flex flex-col items-center justify-center">
          <div className="w-36 h-36 rounded-full border-4 border-slate-800" />
        </div>
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800 h-72 space-y-3">
          <div className="w-48 h-5 bg-slate-800 rounded" />
          <div className="w-full h-44 bg-slate-800/40 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
