import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTrackedRecommendations } from '../services/api';
import type { TrackedRecommendationOut } from '../types/api';
import { CheckCircle2, AlertTriangle, RotateCcw, ArrowRight, ListChecks } from 'lucide-react';

interface ProgressSummaryCardProps {
  username: string;
  isDemo?: boolean;
}

export const ProgressSummaryCard: React.FC<ProgressSummaryCardProps> = ({ username, isDemo = false }) => {
  const [recs, setRecs] = useState<TrackedRecommendationOut[]>([]);
  useEffect(() => {
    if (isDemo || !username) return;

    let mounted = true;
    getTrackedRecommendations(undefined, username)
      .then((data) => {
        if (mounted) setRecs(data);
      })
      .catch(() => {
        // Silently catch if guest
      });

    return () => {
      mounted = false;
    };
  }, [username, isDemo]);

  if (isDemo || recs.length === 0) {
    return null;
  }

  const openCount = recs.filter((r) => r.status === 'open' && r.recurrence_count === 0).length;
  const recurringCount = recs.filter((r) => r.status === 'open' && r.recurrence_count > 0).length;
  const resolvedCount = recs.filter((r) => r.status === 'resolved').length;
  const total = recs.length;
  const resolvedPct = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Recommendation Progress Summary</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                @{username}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {resolvedCount} of {total} identified hygiene findings resolved ({resolvedPct}% resolution rate)
            </p>
          </div>
        </div>

        <Link
          to={`/recommendations?username=${encodeURIComponent(username)}`}
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors self-start sm:self-auto"
        >
          <span>View Progress Tracker</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 rounded-full bg-navy-900 border border-slate-800 overflow-hidden flex">
          <div
            style={{ width: `${resolvedPct}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
          />
          <div
            style={{ width: `${total > 0 ? ((openCount + recurringCount) / total) * 100 : 0}%` }}
            className="h-full bg-amber-500/40"
          />
        </div>
      </div>

      {/* Three Metric Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-navy-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">Active Open</span>
          </div>
          <span className="font-extrabold text-white text-sm">{openCount}</span>
        </div>

        <div className="p-3 rounded-xl bg-navy-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">Verified Resolved</span>
          </div>
          <span className="font-extrabold text-white text-sm">{resolvedCount}</span>
        </div>

        <div className="p-3 rounded-xl bg-navy-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span className="text-slate-300">Recurring Regressions</span>
          </div>
          <span className="font-extrabold text-white text-sm">{recurringCount}</span>
        </div>
      </div>
    </div>
  );
};
