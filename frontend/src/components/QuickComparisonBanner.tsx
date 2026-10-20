import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalysisHistory } from '../services/api';
import type { AnalysisRunSummary } from '../types/api';
import { TrendingUp, TrendingDown, GitCompare, ArrowRight } from 'lucide-react';

interface QuickComparisonBannerProps {
  username: string;
  currentScore: number;
  isDemo?: boolean;
}

export const QuickComparisonBanner: React.FC<QuickComparisonBannerProps> = ({
  username,
  currentScore,
  isDemo = false,
}) => {
  const [priorRun, setPriorRun] = useState<AnalysisRunSummary | null>(null);

  useEffect(() => {
    if (isDemo || !username) return;

    let mounted = true;

    const handleHistoryCleared = () => {
      if (mounted) setPriorRun(null);
    };
    window.addEventListener('devprofile:history-cleared', handleHistoryCleared);

    getAnalysisHistory(username, 2, 0)
      .then((data) => {
        if (!mounted) return;
        // If there are at least 2 runs, the second run in descending order is the previous run
        if (data.runs && data.runs.length >= 2) {
          setPriorRun(data.runs[1]);
        } else {
          setPriorRun(null);
        }
      })
      .catch(() => {
        // Silently catch
      });

    return () => {
      mounted = false;
      window.removeEventListener('devprofile:history-cleared', handleHistoryCleared);
    };
  }, [username, isDemo, currentScore]);

  if (!priorRun) {
    return null;
  }

  const scoreDelta = currentScore - priorRun.overall_score;
  const prevDate = new Date(priorRun.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="p-3.5 rounded-xl bg-navy-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <GitCompare className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Previous Run Comparison ({prevDate}):</span>
          <span
            className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded text-[11px] ${
              scoreDelta > 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : scoreDelta < 0
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {scoreDelta > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : scoreDelta < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>
              {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts (was {priorRun.overall_score}/100)
            </span>
          </span>
        </div>
      </div>

      <Link
        to="/history"
        className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-semibold transition-colors"
      >
        <span>View History &amp; Deltas</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};
