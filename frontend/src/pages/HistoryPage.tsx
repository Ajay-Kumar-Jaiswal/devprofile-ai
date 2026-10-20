import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAnalysisHistory,
  compareHistoryRuns,
  deleteHistoryRun,
  clearAnalysisHistory,
  ApiError,
} from '../services/api';
import type { AnalysisRunSummary, RunComparisonResponse } from '../types/api';
import {
  History,
  Award,
  Star,
  BookOpen,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Trash2,
  GitCompare,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [totalRuns, setTotalRuns] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Comparison state
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);
  const [comparisonData, setComparisonData] = useState<RunComparisonResponse | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);

  // Clear all history modal state
  const [clearModalOpen, setClearModalOpen] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAnalysisHistory();
      setRuns(data.runs);
      setTotalRuns(data.total_runs);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to load analysis history.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleOpenReport = (run: AnalysisRunSummary) => {
    navigate(`/dashboard?run_id=${run.id}&username=${encodeURIComponent(run.analyzed_login)}`);
  };

  const handleDeleteRun = async (runId: number) => {
    if (!confirm('Are you sure you want to delete this analysis snapshot from your history?')) {
      return;
    }
    try {
      await deleteHistoryRun(runId);
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      setSelectedRunIds((prev) => prev.filter((id) => id !== runId));
      setTotalRuns((prev) => Math.max(0, prev - 1));
    } catch (err) {
      alert('Failed to delete history run.');
    }
  };

  const handleClearAllHistory = async () => {
    setIsClearing(true);
    setClearError(null);
    try {
      const res = await clearAnalysisHistory();
      setRuns([]);
      setTotalRuns(0);
      setSelectedRunIds([]);
      setClearModalOpen(false);
      setClearSuccess(res.message || 'All analysis history snapshots have been permanently cleared.');
      setTimeout(() => setClearSuccess(null), 5000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setClearError(err.detail);
      } else {
        setClearError(err?.message || 'Failed to clear analysis history.');
      }
    } finally {
      setIsClearing(false);
    }
  };

  const toggleSelectRun = (id: number) => {
    setSelectedRunIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleCompareSelected = async () => {
    if (selectedRunIds.length !== 2) return;
    setIsComparing(true);
    try {
      // Order so newer run is current, older run is previous
      const [idA, idB] = selectedRunIds;
      const runA = runs.find((r) => r.id === idA);
      const runB = runs.find((r) => r.id === idB);
      const isANewer = new Date(runA?.created_at || 0) >= new Date(runB?.created_at || 0);

      const currentId = isANewer ? idA : idB;
      const previousId = isANewer ? idB : idA;

      const comp = await compareHistoryRuns(currentId, previousId);
      setComparisonData(comp);
      setComparisonModalOpen(true);
    } catch (err: any) {
      alert('Failed to calculate run comparison.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-violet-400" />
            <span>Analysis History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review previous portfolio snapshots, track score progression over time, and compare changes.
          </p>
        </div>

        {/* Actions: Clear History, Compare Selected, Analyze New Profile */}
        <div className="flex items-center flex-wrap gap-2.5">
          {runs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setClearError(null);
                setClearModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear History</span>
            </button>
          )}

          {selectedRunIds.length === 2 && (
            <button
              onClick={handleCompareSelected}
              disabled={isComparing}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle"
            >
              {isComparing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitCompare className="w-3.5 h-3.5" />
              )}
              <span>Compare Selected (2)</span>
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-navy-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Analyze New Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {clearSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{clearSuccess}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading analysis history snapshots...</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && runs.length === 0 && (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-4 max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/20">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Analysis Runs Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every profile you analyze while signed in is saved as an immutable audit snapshot. You can compare snapshots over time to measure improvement.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            Run Your First Analysis
          </button>
        </div>
      )}

      {/* History Runs List */}
      {!isLoading && runs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing {runs.length} of {totalRuns} total snapshots
            </span>
            <span>Select any 2 runs to compare changes</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {runs.map((run) => {
              const isSelected = selectedRunIds.includes(run.id);
              const formattedDate = new Date(run.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={run.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-violet-500/60 bg-violet-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Checkbox + User handle + Date */}
                  <div className="flex items-center gap-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRun(run.id)}
                      className="h-4 w-4 rounded border-slate-700 bg-navy-900 text-violet-600 focus:ring-violet-500/40 cursor-pointer"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          @{run.analyzed_login}
                        </span>
                        {run.is_demo_data && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            Demo Mode
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Metrics Chips */}
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900/80 border border-slate-800">
                      <Award className="w-4 h-4 text-violet-400" />
                      <span className="font-extrabold text-white">{run.overall_score}/100</span>
                      <span className="text-[10px] font-semibold text-slate-400">({run.score_tier})</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900/80 border border-slate-800">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-slate-300 font-medium">{run.public_repos} repos</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900/80 border border-slate-800">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-300 font-medium">{run.total_stars} stars</span>
                    </div>

                    {run.primary_language && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {run.primary_language}
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenReport(run)}
                      className="px-3.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <span>Open Report</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRun(run.id)}
                      className="p-1.5 rounded-xl bg-navy-900 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors"
                      title="Delete run snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {comparisonModalOpen && comparisonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Portfolio Run Comparison</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      @{comparisonData.analyzed_login}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparing Run #{comparisonData.previous_run_id} vs Run #{comparisonData.current_run_id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setComparisonModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Delta Highlight */}
            <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Overall Score Progression
                </span>
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-3xl font-extrabold flex items-center gap-1.5 ${
                      comparisonData.score_delta > 0
                        ? 'text-emerald-400'
                        : comparisonData.score_delta < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {comparisonData.score_delta > 0 ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : comparisonData.score_delta < 0 ? (
                      <TrendingDown className="w-6 h-6" />
                    ) : null}
                    <span>
                      {comparisonData.score_delta > 0 ? `+${comparisonData.score_delta}` : comparisonData.score_delta} pts
                    </span>
                  </span>

                  {comparisonData.tier_change && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-violet-300 border border-slate-700">
                      {comparisonData.tier_change}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {comparisonData.metrics_deltas.slice(1).map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{m.metric}</span>
                    <span className="font-bold text-white">
                      {m.current} ({m.change >= 0 ? `+${m.change}` : m.change})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Issue Deltas: Resolved, Newly Detected, Persistent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resolved Issues */}
              <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolved Findings ({comparisonData.resolved_issues.length})</span>
                </h4>
                {comparisonData.resolved_issues.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No issues were resolved between these two runs.</p>
                ) : (
                  <div className="space-y-2">
                    {comparisonData.resolved_issues.map((issue, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-navy-950 text-xs border border-emerald-500/20">
                        <span className="font-semibold text-white block">{issue.title}</span>
                        <span className="text-[10px] text-slate-400">[{issue.category}]</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Newly Detected or Recurring Issues */}
              <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>New or Recurring Issues ({comparisonData.newly_detected_issues.length})</span>
                </h4>
                {comparisonData.newly_detected_issues.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No new issues detected in the current run.</p>
                ) : (
                  <div className="space-y-2">
                    {comparisonData.newly_detected_issues.map((issue, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-navy-950 text-xs border border-rose-500/20">
                        <span className="font-semibold text-white block">{issue.title}</span>
                        <span className="text-[10px] text-slate-400">[{issue.category}]</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Persistent Issues */}
            {comparisonData.persistent_issues.length > 0 && (
              <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Persistent Open Issues ({comparisonData.persistent_issues.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {comparisonData.persistent_issues.map((issue, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-navy-950 border border-slate-800 text-slate-300 font-medium"
                    >
                      {issue.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setComparisonModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Confirmation Modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-rose-500/30 bg-navy-900 shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear Analysis History</h3>
                <p className="text-xs text-slate-400">Permanently delete all historical snapshots</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Warning: Permanent Deletion</span>
              </p>
              <p className="leading-relaxed">
                Are you sure you want to delete all <span className="font-bold text-white">{totalRuns}</span> analysis snapshot{totalRuns === 1 ? '' : 's'}? This will remove all saved scores, metrics, and comparisons. This action cannot be undone.
              </p>
              <p className="text-[11px] text-slate-400">
                Your user account, password, and connected profile settings will not be affected.
              </p>
            </div>

            {clearError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-200">
                {clearError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setClearModalOpen(false);
                  setClearError(null);
                }}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-glow-rose disabled:opacity-50 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing History...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear All History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
