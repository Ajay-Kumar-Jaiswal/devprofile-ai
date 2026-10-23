import React, { useEffect, useState } from 'react';
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

interface DashboardHistoryTabProps {
  onLoadRun: (runId: number, login: string) => void;
  currentUsername?: string;
}

export const DashboardHistoryTab: React.FC<DashboardHistoryTabProps> = ({
  onLoadRun,
  currentUsername,
}) => {
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

  const handleDeleteRun = async (runId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this historical analysis snapshot?')) {
      return;
    }
    try {
      await deleteHistoryRun(runId);
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      setSelectedRunIds((prev) => prev.filter((id) => id !== runId));
      setTotalRuns((prev) => Math.max(0, prev - 1));
    } catch {
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
      window.dispatchEvent(new CustomEvent('devprofile:history-cleared'));
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

  const toggleSelectRun = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
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
      const [idA, idB] = selectedRunIds;
      const runA = runs.find((r) => r.id === idA);
      const runB = runs.find((r) => r.id === idB);
      const isANewer = new Date(runA?.created_at || 0) >= new Date(runB?.created_at || 0);

      const currentId = isANewer ? idA : idB;
      const previousId = isANewer ? idB : idA;

      const comp = await compareHistoryRuns(currentId, previousId);
      setComparisonData(comp);
      setComparisonModalOpen(true);
    } catch {
      alert('Failed to calculate run comparison.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-violet-400" />
            <span>Analysis Snapshots &amp; Progress History</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalRuns} total snapshot{totalRuns === 1 ? '' : 's'} recorded
            {currentUsername ? ` (viewing @${currentUsername})` : ''}. Select two to compare score progression and resolved defects.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {runs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setClearError(null);
                setClearModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear History</span>
            </button>
          )}

          {selectedRunIds.length === 2 && (
            <button
              onClick={handleCompareSelected}
              disabled={isComparing}
              className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle border border-violet-500/30 disabled:opacity-50"
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
            onClick={fetchHistory}
            className="px-3 py-1.5 rounded-xl bg-navy-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Refresh
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
        <div className="py-12 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
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
        <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800 space-y-3 max-w-md mx-auto">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/20">
            <History className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">No Analysis Snapshots Yet</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every audit you execute while signed in is saved as an immutable snapshot. You can compare snapshots over time to measure improvement.
          </p>
        </div>
      )}

      {/* Runs Grid */}
      {!isLoading && !error && runs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runs.map((run, idx) => {
            const isSelected = selectedRunIds.includes(run.id);
            const dateStr = new Date(run.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const priorRun = runs.slice(idx + 1).find(
              (r) => r.analyzed_login.toLowerCase() === run.analyzed_login.toLowerCase()
            );
            const delta = priorRun ? run.overall_score - priorRun.overall_score : null;

            return (
              <div
                key={run.id}
                onClick={() => onLoadRun(run.id, run.analyzed_login)}
                className={`surface-card p-5 rounded-2xl border transition-all cursor-pointer relative shadow-card hover:shadow-card-hover ${
                  isSelected
                    ? 'border-violet-500 ring-2 ring-violet-500/20 bg-navy-900/90'
                    : 'border-slate-800 hover:border-slate-700 bg-navy-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => toggleSelectRun(run.id, e)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'border-slate-700 bg-navy-950 text-transparent hover:border-slate-600'
                      }`}
                      title={isSelected ? 'Deselect for comparison' : 'Select to compare (choose 2)'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-white text-sm">
                          @{run.analyzed_login}
                        </span>
                        {run.is_demo_data && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Demo
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          #{run.id}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Score pill & Delta progression */}
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-xl font-black font-mono text-white">{run.overall_score}</span>
                      <span className="text-[10px] font-mono text-slate-400">/ 100</span>
                    </div>
                    {delta !== null ? (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          delta > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : delta < 0
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {delta > 0 ? (
                          <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                        ) : delta < 0 ? (
                          <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
                        ) : null}
                        <span>{delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'} pts</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-violet-300 block">
                        {run.score_tier}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-stats & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      <span>{run.public_repos} repos</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>{run.total_stars}</span>
                    </span>
                    {run.primary_language && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {run.primary_language}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRun(run.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-violet-400 hover:text-violet-300 font-semibold text-xs flex items-center gap-1">
                      <span>Load Report</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Modal */}
      {comparisonModalOpen && comparisonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Historical Snapshot Delta Comparison
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparing Run #{comparisonData.previous_run_id} vs Run #{comparisonData.current_run_id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setComparisonModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Score Delta Callout */}
            <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Overall Portfolio Score Shift</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">
                    {comparisonData.score_delta > 0 ? `+${comparisonData.score_delta}` : comparisonData.score_delta} pts
                  </span>
                  {comparisonData.tier_change && (
                    <span className="text-xs text-violet-300 font-medium">
                      ({comparisonData.tier_change})
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl flex items-center gap-1.5 text-xs font-bold ${
                  comparisonData.score_delta > 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : comparisonData.score_delta < 0
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {comparisonData.score_delta > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Improved</span>
                  </>
                ) : comparisonData.score_delta < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>Declined</span>
                  </>
                ) : (
                  <span>Unchanged</span>
                )}
              </div>
            </div>

            {/* Metrics Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Telemetry Variations
              </h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-navy-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Metric</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Previous</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Current</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Variation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-navy-950/40">
                    {comparisonData.metrics_deltas.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-4 font-medium text-slate-300">{m.metric}</td>
                        <td className="py-2.5 px-4 text-center text-slate-400">{m.previous}</td>
                        <td className="py-2.5 px-4 text-center font-semibold text-white">{m.current}</td>
                        <td
                          className={`py-2.5 px-4 text-right font-bold ${
                            m.improved === true
                              ? 'text-emerald-400'
                              : m.improved === false
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {m.change}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Issue Deltas: Resolved vs New */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolved Findings ({comparisonData.resolved_issues?.length || 0})</span>
                </div>
                {comparisonData.resolved_issues && comparisonData.resolved_issues.length > 0 ? (
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    {comparisonData.resolved_issues.map((iss) => (
                      <li key={iss.rule_id} className="text-emerald-300/90">
                        <span className="font-medium text-white">{iss.title}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({iss.category})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No issues were resolved between these runs.</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>New Defects Introduced ({comparisonData.newly_detected_issues?.length || 0})</span>
                </div>
                {comparisonData.newly_detected_issues && comparisonData.newly_detected_issues.length > 0 ? (
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    {comparisonData.newly_detected_issues.map((iss) => (
                      <li key={iss.rule_id} className="text-rose-300/90">
                        <span className="font-medium text-white">{iss.title}</span>
                        <span className="text-[10px] text-rose-400 ml-1">[{iss.priority}]</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Zero new defects detected.</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setComparisonModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
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
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle border border-rose-500/30 disabled:opacity-50 cursor-pointer"
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
