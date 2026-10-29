import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTrackedRecommendations,
  getTrackedProfiles,
  updateRecommendationStatus,
  ApiError,
} from '../services/api';
import { useAnalysis } from '../context/AnalysisContext';
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
  Calendar,
  Clock,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentAnalysis } = useAnalysis();

  const [profiles, setProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [allRecsForProfile, setAllRecsForProfile] = useState<TrackedRecommendationOut[]>([]);
  const [displayedRecs, setDisplayedRecs] = useState<TrackedRecommendationOut[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'recurring' | 'dismissed'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Discover all eligible real analyzed profiles
  useEffect(() => {
    let isMounted = true;
    const loadProfiles = async () => {
      try {
        const fetchedProfiles = await getTrackedProfiles();
        const profileSet = new Set(
          fetchedProfiles
            .map((p) => p.toLowerCase().trim())
            .filter((p) => p && p !== 'alex-dev-demo' && p !== 'demo')
        );

        if (
          currentAnalysis &&
          !currentAnalysis.is_demo_data &&
          currentAnalysis.username &&
          currentAnalysis.username.toLowerCase() !== 'alex-dev-demo' &&
          currentAnalysis.username.toLowerCase() !== 'demo'
        ) {
          profileSet.add(currentAnalysis.username.toLowerCase().trim());
        }

        const validProfiles = Array.from(profileSet);
        if (isMounted) {
          setProfiles(validProfiles);
          if (validProfiles.length > 0) {
            // Select current analysis if eligible, otherwise first in list
            if (
              currentAnalysis?.username &&
              validProfiles.includes(currentAnalysis.username.toLowerCase())
            ) {
              setSelectedProfile(currentAnalysis.username.toLowerCase());
            } else if (!selectedProfile || !validProfiles.includes(selectedProfile)) {
              setSelectedProfile(validProfiles[0]);
            }
          } else {
            setSelectedProfile('');
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        console.warn('Could not load tracked profiles:', err);
        if (isMounted) {
          if (
            currentAnalysis &&
            !currentAnalysis.is_demo_data &&
            currentAnalysis.username &&
            currentAnalysis.username.toLowerCase() !== 'alex-dev-demo'
          ) {
            const currentLogin = currentAnalysis.username.toLowerCase().trim();
            setProfiles([currentLogin]);
            setSelectedProfile(currentLogin);
          } else {
            setIsLoading(false);
          }
        }
      }
    };

    loadProfiles();
    return () => {
      isMounted = false;
    };
  }, [currentAnalysis]);

  // 2. Fetch findings for the strictly selected profile
  const fetchProfileFindings = useCallback(async () => {
    if (!selectedProfile) {
      setAllRecsForProfile([]);
      setDisplayedRecs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Fetch all to compute metrics accurately
      const allData = await getTrackedRecommendations(undefined, selectedProfile);
      setAllRecsForProfile(allData);

      // Filter for display
      if (filter === 'all') {
        setDisplayedRecs(allData);
      } else {
        const filteredData = await getTrackedRecommendations(filter, selectedProfile);
        setDisplayedRecs(filteredData);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to load recommendation progress for selected profile.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedProfile, filter]);

  useEffect(() => {
    if (selectedProfile) {
      fetchProfileFindings();
    }
  }, [fetchProfileFindings, selectedProfile]);

  const handleToggleDismiss = async (rec: TrackedRecommendationOut) => {
    const targetStatus = rec.status === 'dismissed' ? 'open' : 'dismissed';
    try {
      const updated = await updateRecommendationStatus(rec.id, targetStatus);
      setAllRecsForProfile((prev) => prev.map((r) => (r.id === rec.id ? updated : r)));
      setDisplayedRecs((prev) => prev.map((r) => (r.id === rec.id ? updated : r)));
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Grouping metrics strictly for selected profile
  const openCount = allRecsForProfile.filter((r) => r.status === 'open' && r.recurrence_count === 0).length;
  const recurringCount = allRecsForProfile.filter((r) => r.status === 'open' && r.recurrence_count > 0).length;
  const resolvedCount = allRecsForProfile.filter((r) => r.status === 'resolved').length;
  const dismissedCount = allRecsForProfile.filter((r) => r.status === 'dismissed').length;
  const totalActionable = openCount + recurringCount + resolvedCount;
  // Division-by-zero protection: outputs 0%, never NaN%
  const resolutionRate = totalActionable > 0 ? Math.round((resolvedCount / totalActionable) * 100) : 0;

  return (
    <div className="w-full max-w-[1360px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 text-slate-100 animate-fadeIn min-w-0 box-border">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0 max-w-full">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <ListChecks className="w-6 h-6 sm:w-7 sm:h-7 text-violet-400 shrink-0" />
            <span className="break-words">Personalized Action Progress</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">
            Deterministic progress tracking that adapts to actual GitHub commits, repository hygiene, and profile fixes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0 min-w-0">
          {profiles.length > 0 && (
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#101723]/60 backdrop-blur-md px-3 py-2 sm:py-1.5 rounded-xl border border-[rgba(148,163,184,0.18)] w-full sm:w-auto min-w-0">
              <div className="flex items-center gap-2 min-w-0 shrink-0">
                <UserCheck className="w-4 h-4 text-violet-400 shrink-0" />
                <label htmlFor="profile-select" className="text-xs text-slate-400 font-medium whitespace-nowrap">
                  Profile:
                </label>
              </div>
              <select
                id="profile-select"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="bg-transparent text-white font-mono text-xs font-semibold focus:outline-none cursor-pointer flex-1 sm:flex-initial min-w-0 truncate pr-2 text-right sm:text-left"
              >
                {profiles.map((p) => (
                  <option key={p} value={p} className="bg-[#101723] text-white font-mono">
                    @{p}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => navigate('/dashboard?refresh=true')}
            className="w-full sm:w-auto px-4 py-2 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-subtle border border-violet-500/30 cursor-pointer shrink-0"
          >
            <span>Run Fresh Analysis</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* When no real analyzed profiles exist */}
      {!isLoading && profiles.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center py-8 sm:py-10 px-2 sm:px-0 w-full min-w-0">
          <div className="w-full max-w-md bg-[#101723]/65 backdrop-blur-xl border border-[rgba(148,163,184,0.18)] rounded-2xl p-6 sm:p-9 text-center shadow-2xl shadow-black/70 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-navy-950 border border-[rgba(148,163,184,0.18)] flex items-center justify-center mx-auto text-violet-400 shadow-subtle mb-4 shrink-0">
              <ListChecks className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              No Tracked Profile Progress
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Analyze a GitHub profile to begin tracking actionable improvements, verified fixes, and resolution velocity.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 cursor-pointer active:scale-[0.99] w-full sm:w-auto"
            >
              <span>Analyze a Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Progress Telemetry Stat Strip */}
      {profiles.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-3.5 w-full min-w-0 max-w-full">
            <div className="surface-card p-3 sm:p-4 rounded-2xl border border-[rgba(148,163,184,0.18)] shadow-card w-full min-w-0 box-border flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                <span className="leading-tight text-[11px] sm:text-xs font-medium text-slate-400 break-words">Active Open</span>
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 mt-0.5" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2 min-w-0">
                <span className="text-xl sm:text-2xl font-black font-mono text-white">{openCount}</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">items</span>
              </div>
            </div>

            <div className="surface-card p-3 sm:p-4 rounded-2xl border border-[rgba(148,163,184,0.18)] shadow-card w-full min-w-0 box-border flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                <span className="leading-tight text-[11px] sm:text-xs font-medium text-slate-400 break-words">Recurring Regressions</span>
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0 mt-0.5" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2 min-w-0">
                <span className="text-xl sm:text-2xl font-black font-mono text-rose-400">{recurringCount}</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">reappeared</span>
              </div>
            </div>

            <div className="surface-card p-3 sm:p-4 rounded-2xl border border-[rgba(148,163,184,0.18)] shadow-card w-full min-w-0 box-border flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                <span className="leading-tight text-[11px] sm:text-xs font-medium text-slate-400 break-words">Verified Resolved</span>
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 mt-0.5" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2 min-w-0">
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{resolvedCount}</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">fixed</span>
              </div>
            </div>

            <div className="surface-card p-3 sm:p-4 rounded-2xl border border-[rgba(148,163,184,0.18)] shadow-card w-full min-w-0 box-border flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                <span className="leading-tight text-[11px] sm:text-xs font-medium text-slate-400 break-words">Resolution Rate</span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-violet-400 shrink-0 mt-0.5">{resolutionRate}%</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2 min-w-0">
                <span className="text-xl sm:text-2xl font-black font-mono text-violet-300">{resolutionRate}%</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">cleared</span>
              </div>
              <div className="w-full bg-navy-950 rounded-full h-1.5 mt-2 overflow-hidden border border-[rgba(148,163,184,0.18)]">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, resolutionRate))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filter Tabs & Counters */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full min-w-0">
            {[
              { id: 'all', label: 'All Findings', count: allRecsForProfile.length, icon: Filter },
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
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-medium transition-all shrink-0 cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-slate-800 text-white border border-[rgba(148,163,184,0.25)] shadow-subtle'
                      : 'bg-navy-900 border border-[rgba(148,163,184,0.18)] text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${tab.color || ''}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shrink-0 ${
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
            <div className="py-16 sm:py-20 text-center space-y-3">
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

          {/* Empty State within Selected Profile */}
          {!isLoading && !error && displayedRecs.length === 0 && (
            <div className="glass-panel rounded-2xl p-6 sm:p-12 text-center border border-[rgba(148,163,184,0.18)] space-y-4 max-w-lg mx-auto w-full min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Tracked Recommendations Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {filter === 'all'
                  ? `No tracked findings recorded for @${selectedProfile}. Run a fresh analysis to evaluate repository hygiene and track fixes.`
                  : `No recommendations match the filter "${filter}" for @${selectedProfile}.`}
              </p>
              <button
                onClick={() => navigate('/dashboard?refresh=true')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Run Fresh Analysis
              </button>
            </div>
          )}

          {/* Recommendations Cards Grid */}
          {!isLoading && displayedRecs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0 max-w-full">
              {displayedRecs.map((rec) => {
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
                    className={`surface-card p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-card hover:shadow-card-hover w-full min-w-0 max-w-full box-border ${
                      isResolved
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : isRecurring
                        ? 'border-rose-500/40 bg-rose-950/10'
                        : isDismissed
                        ? 'border-[rgba(148,163,184,0.18)]/60 opacity-60'
                        : 'border-[rgba(148,163,184,0.18)] hover:border-[#477F7C] hover:shadow-subtle-glow duration-180'
                    }`}
                  >
                    <div className="space-y-3 min-w-0">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-400 font-bold bg-navy-900 px-2 py-0.5 rounded border border-[rgba(148,163,184,0.18)] truncate max-w-[140px] sm:max-w-none">
                            @{rec.analyzed_login}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 break-words">
                            [{rec.category}]
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isRecurring && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0">
                              <RotateCcw className="w-3 h-3" />
                              <span>Reappeared ({rec.recurrence_count}x)</span>
                            </span>
                          )}

                          {isResolved && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified Fixed</span>
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
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
                      <div className="min-w-0">
                        <h3 className={`font-bold text-sm leading-snug break-words ${isResolved ? 'text-slate-300 line-through' : 'text-white'}`}>
                          {rec.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words">
                          {rec.description}
                        </p>
                      </div>

                      {/* Evidence & Action Box */}
                      <div className="p-3 rounded-xl bg-navy-950 border border-[rgba(148,163,184,0.18)] space-y-2 text-xs min-w-0 max-w-full overflow-hidden">
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Observed Evidence:
                          </span>
                          <p className="text-slate-300 text-[11px] mt-0.5 break-words break-all sm:break-words">{rec.evidence}</p>
                        </div>

                        <div className="pt-2 border-t border-[rgba(148,163,184,0.18)] min-w-0">
                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                            Action Plan:
                          </span>
                          <p className="text-slate-200 text-[11px] mt-0.5 leading-relaxed break-words">{rec.suggested_action}</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer with timestamps & Dismiss Toggle */}
                    <div className="pt-2 border-t border-[rgba(148,163,184,0.18)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>First: {firstDate}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>Checked: {lastDate}</span>
                        </span>
                      </div>

                      {!isResolved && (
                        <button
                          type="button"
                          onClick={() => handleToggleDismiss(rec)}
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
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
        </>
      )}
    </div>
  );
};

export default RecommendationsPage;
