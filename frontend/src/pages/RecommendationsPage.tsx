import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrackedRecommendations, updateRecommendationStatus, ApiError } from '../services/api';
import type { TrackedRecommendationOut } from '../types/api';
import {
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  EyeOff,
  Eye,
  Loader2,
  Filter,
  Info,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [recs, setRecs] = useState<TrackedRecommendationOut[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'recurring' | 'dismissed'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTrackedRecommendations(filter === 'all' ? undefined : filter);
      setRecs(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to load recommendation progress.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [filter]);

  const handleToggleDismiss = async (rec: TrackedRecommendationOut) => {
    const targetStatus = rec.status === 'dismissed' ? 'open' : 'dismissed';
    try {
      const updated = await updateRecommendationStatus(rec.id, targetStatus);
      setRecs((prev) => prev.map((r) => (r.id === rec.id ? updated : r)));
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Grouping metrics
  const openCount = recs.filter((r) => r.status === 'open' && r.recurrence_count === 0).length;
  const recurringCount = recs.filter((r) => r.status === 'open' && r.recurrence_count > 0).length;
  const resolvedCount = recs.filter((r) => r.status === 'resolved').length;
  const dismissedCount = recs.filter((r) => r.status === 'dismissed').length;
  const totalActionable = openCount + recurringCount + resolvedCount;
  const resolutionRate = totalActionable > 0 ? Math.round((resolvedCount / totalActionable) * 100) : 0;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ListChecks className="w-7 h-7 text-violet-400" />
            <span>Personalized Action Progress</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Deterministic progress tracking that adapts to actual GitHub commits, repository hygiene, and profile fixes.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard?refresh=true')}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-subtle self-start sm:self-auto cursor-pointer"
        >
          <span>Run Fresh Analysis</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Telemetry Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="surface-card p-4 rounded-2xl border border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Open</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">{openCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">items</span>
          </div>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Recurring Regressions</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-rose-400">{recurringCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">reappeared</span>
          </div>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verified Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">{resolvedCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">fixed</span>
          </div>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Resolution Rate</span>
            <span className="text-[10px] font-mono font-bold text-violet-400">{resolutionRate}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-violet-300">{resolutionRate}%</span>
            <span className="text-[11px] text-slate-500 font-mono">cleared</span>
          </div>
          <div className="w-full bg-navy-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, resolutionRate))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Verification Notice */}
      <div className="p-4 rounded-2xl bg-navy-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-3 leading-relaxed shadow-card">
        <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block mb-0.5">Automated Evidence Verification</span>
          <p className="text-slate-400 text-[11px]">
            Findings cannot be manually checked off as &quot;fixed&quot; while the underlying issue still exists on GitHub.
            Make changes to your GitHub repositories or profile (e.g. adding descriptions, licenses, bio), then click <strong>&quot;Run Fresh Analysis&quot;</strong> to automatically verify and resolve them.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Counters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Findings', count: recs.length, icon: Filter },
          { id: 'open', label: 'Active Open', count: openCount, icon: AlertTriangle, color: 'text-amber-400' },
          { id: 'recurring', label: 'Recurring Regressions', count: recurringCount, icon: RotateCcw, color: 'text-rose-400' },
          { id: 'resolved', label: 'Verified Resolved', count: resolvedCount, icon: CheckCircle2, color: 'text-emerald-400' },
          { id: 'dismissed', label: 'Dismissed', count: dismissedCount, icon: EyeOff, color: 'text-slate-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all shrink-0 ${
                isSelected
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-subtle'
                  : 'bg-navy-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab.color || ''}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading tracked recommendations...</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && recs.length === 0 && (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-4 max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Tracked Recommendations Found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {filter === 'all'
              ? 'Analyze a GitHub profile while signed in to generate actionable recommendations tracked across runs.'
              : `No recommendations match the filter "${filter}".`}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            Analyze Profile Now
          </button>
        </div>
      )}

      {/* Recommendations Cards Grid */}
      {!isLoading && recs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recs.map((rec) => {
            const isResolved = rec.status === 'resolved';
            const isDismissed = rec.status === 'dismissed';
            const isRecurring = rec.recurrence_count > 0 && rec.status === 'open';

            const firstDate = new Date(rec.first_detected_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const lastDate = new Date(rec.last_detected_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={rec.id}
                className={`surface-card p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-card hover:shadow-card-hover ${
                  isResolved
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : isRecurring
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : isDismissed
                    ? 'border-slate-800/60 opacity-60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 font-bold bg-navy-900 px-2 py-0.5 rounded border border-slate-800">
                        @{rec.analyzed_login}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        [{rec.category}]
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isRecurring && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>Reappeared ({rec.recurrence_count}x)</span>
                        </span>
                      )}

                      {isResolved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Fixed</span>
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rec.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : rec.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className={`font-bold text-sm leading-snug ${isResolved ? 'text-slate-300 line-through' : 'text-white'}`}>
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>

                  {/* Evidence & Action Box */}
                  <div className="p-3 rounded-xl bg-navy-950 border border-slate-800/80 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Observed Evidence:
                      </span>
                      <p className="text-slate-300 text-[11px] mt-0.5">{rec.evidence}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                        Action Plan:
                      </span>
                      <p className="text-slate-200 text-[11px] mt-0.5 leading-relaxed">{rec.suggested_action}</p>
                    </div>
                  </div>
                </div>

                {/* Footer with timestamps & Dismiss Toggle */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>First: {firstDate}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Checked: {lastDate}</span>
                    </span>
                  </div>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => handleToggleDismiss(rec)}
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      {isDismissed ? (
                        <>
                          <Eye className="w-3 h-3 text-violet-400" />
                          <span>Restore</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-slate-500" />
                          <span>Dismiss</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
