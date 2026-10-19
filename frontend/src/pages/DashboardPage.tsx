import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import { HeroSection } from '../components/HeroSection';
import { ProfileHeader } from '../components/ProfileHeader';
import { StatsGrid } from '../components/StatsGrid';
import { PortfolioScoreCard } from '../components/PortfolioScoreCard';
import { AIAnalysisSection } from '../components/AIAnalysisSection';
import { TopImprovements } from '../components/TopImprovements';
import { ProgressSummaryCard } from '../components/ProgressSummaryCard';
import { QuickComparisonBanner } from '../components/QuickComparisonBanner';
import { VisualAnalytics } from '../components/VisualAnalytics';
import { RepoQualityChecklist } from '../components/RepoQualityChecklist';
import { RepositoryList } from '../components/RepositoryList';
import { RecommendationsSection } from '../components/RecommendationsSection';
import { RoadmapSection } from '../components/RoadmapSection';
import { ExportButton } from '../components/ExportButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { DashboardHistoryTab } from '../components/DashboardHistoryTab';
import {
  fetchProfileAnalysis,
  retryAIAnalysis,
  getHistoryRunDetail,
  ApiError,
} from '../services/api';
import type { AnalysisResponse } from '../types/api';
import {
  Layers,
  Sparkles,
  CheckSquare,
  ArrowUp,
  Search,
  RefreshCw,
  History,
  X,
  Compass,
  ShieldCheck,
  Globe,
} from 'lucide-react';

type PrimaryTab = 'overview' | 'ai' | 'audits' | 'recommendations' | 'history';

export const DashboardPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    currentAnalysis,
    saveAnalysis,
    getCachedAnalysis,
    updateAiAnalysis,
  } = useAnalysis();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>(() => currentAnalysis?.username || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(() => currentAnalysis);
  const [error, setError] = useState<{
    message: string;
    status?: number;
    retryAfterSeconds?: number;
    rateLimitResetEpoch?: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<PrimaryTab>('overview');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Flow B Guard: Prevent duplicate automatic triggers on re-render / tab switch
  const autoAnalyzedRef = useRef<boolean>(false);

  const handleAnalyzeAnother = () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent('/dashboard'));
      return;
    }
    setIsSearchOpen((prev) => !prev);
  };

  const runAnalysis = async (userToAnalyze: string, isDemo: boolean = false) => {
    // If attempting real profile analysis while logged out, redirect to login
    if (!isDemo && !user) {
      navigate('/login?redirect=' + encodeURIComponent(`/dashboard?analyze=${encodeURIComponent(userToAnalyze)}`));
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsername(userToAnalyze);
    setIsSearchOpen(false);

    try {
      const result = await fetchProfileAnalysis(userToAnalyze, isDemo);
      setAnalysisData(result);
      saveAnalysis(result);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401 && !isDemo) {
          navigate('/login?redirect=' + encodeURIComponent(`/dashboard?analyze=${encodeURIComponent(userToAnalyze)}`));
          return;
        }
        setError({
          message: err.detail,
          status: err.status,
          retryAfterSeconds: err.retryAfterSeconds,
          rateLimitResetEpoch: err.rateLimitResetEpoch,
        });
      } else {
        setError({
          message: err.message || 'An unexpected error occurred while analyzing the profile.',
        });
      }
      setAnalysisData(null);
    } finally {
      setIsLoading(false);
    }
  };


  const handleLoadDemo = () => {
    runAnalysis('alex-dev-demo', true);
  };

  const handleLoadHistoricalRun = async (runId: number, login: string) => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/dashboard?run_id=${encodeURIComponent(runId)}`));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const snapshot = await getHistoryRunDetail(runId);
      setAnalysisData(snapshot);
      saveAnalysis(snapshot);
      setUsername(login);
      setActiveTab('overview');
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          navigate('/login?redirect=' + encodeURIComponent(`/dashboard?run_id=${encodeURIComponent(runId)}`));
          return;
        }
        setError({ message: err.detail, status: err.status });
      } else {
        setError({ message: 'Could not load historical snapshot.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Inspect search params and execute Flow A / Flow B on initial mount or restore cached results
  useEffect(() => {
    if (isAuthLoading) return;

    const runIdParam = searchParams.get('run_id');
    const analyzeParam = searchParams.get('analyze') || searchParams.get('username');
    const demoParam = searchParams.get('demo') === 'true';
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 0. Explicit Force Refresh requested (e.g. from "Run Fresh Analysis" on Progress page)
    if (forceRefresh) {
      const targetToRefresh =
        analyzeParam?.trim() ||
        analysisData?.username ||
        currentAnalysis?.username ||
        user?.connected_github?.github_login ||
        user?.default_profile_username;

      if (targetToRefresh) {
        const isDemo =
          targetToRefresh.toLowerCase() === 'alex-dev-demo' ||
          targetToRefresh.toLowerCase() === 'demo';
        autoAnalyzedRef.current = true;
        navigate('/dashboard', { replace: true });
        runAnalysis(targetToRefresh, isDemo);
        return;
      }
    }

    // 1. If explicit run_id provided
    if (runIdParam) {
      const id = parseInt(runIdParam, 10);
      if (!isNaN(id)) {
        if (!user) {
          navigate('/login?redirect=' + encodeURIComponent(`/dashboard?run_id=${encodeURIComponent(runIdParam)}`));
          return;
        }
        autoAnalyzedRef.current = true;
        setIsLoading(true);
        getHistoryRunDetail(id)
          .then((snapshot) => {
            setAnalysisData(snapshot);
            saveAnalysis(snapshot);
            setUsername(snapshot.username);
            setActiveTab('overview');
          })
          .catch((err) => {
            setError({ message: err.detail || 'Could not load historical snapshot.' });
          })
          .finally(() => setIsLoading(false));
        return;
      }
    }

    // 2. If explicit analyze or username param provided
    if (analyzeParam) {
      const targetHandle = analyzeParam.trim();
      const isDemoHandle =
        targetHandle.toLowerCase() === 'alex-dev-demo' || targetHandle.toLowerCase() === 'demo';
      if (!user && !isDemoHandle) {
        navigate('/login?redirect=' + encodeURIComponent(`/dashboard?analyze=${encodeURIComponent(targetHandle)}`));
        return;
      }

      // Check if this profile is already loaded in state
      if (analysisData && analysisData.username.toLowerCase() === targetHandle.toLowerCase()) {
        autoAnalyzedRef.current = true;
        if (username !== analysisData.username) {
          setUsername(analysisData.username);
        }
        return;
      }

      // Check if this profile is available in cache
      const cached = getCachedAnalysis(targetHandle);
      if (cached && cached.username.toLowerCase() === targetHandle.toLowerCase()) {
        autoAnalyzedRef.current = true;
        setAnalysisData(cached);
        saveAnalysis(cached);
        setUsername(cached.username);
        return;
      }

      // If not loaded and not in cache, execute fresh analysis
      autoAnalyzedRef.current = true;
      runAnalysis(targetHandle, isDemoHandle);
      return;
    }

    // 3. If explicit demo param requested from landing page CTA
    if (demoParam) {
      if (analysisData && analysisData.is_demo_data) {
        autoAnalyzedRef.current = true;
        return;
      }
      const cachedDemo = getCachedAnalysis('alex-dev-demo');
      if (cachedDemo && cachedDemo.is_demo_data) {
        autoAnalyzedRef.current = true;
        setAnalysisData(cachedDemo);
        saveAnalysis(cachedDemo);
        setUsername(cachedDemo.username);
        return;
      }
      autoAnalyzedRef.current = true;
      handleLoadDemo();
      return;
    }

    // 4. Normal navigation to /dashboard (e.g. from Navbar, History, Progress, Settings):
    // If analysis is already present in state, preserve it immediately without refetching!
    if (analysisData) {
      autoAnalyzedRef.current = true;
      if (!username && analysisData.username) {
        setUsername(analysisData.username);
      }
      return;
    }

    // 5. If analysis is preserved in cache (e.g. after page refresh F5)
    const cached = getCachedAnalysis();
    if (cached && cached.username) {
      autoAnalyzedRef.current = true;
      setAnalysisData(cached);
      setUsername(cached.username);
      return;
    }

    // 6. Flow B: First-time auto-analysis for connected GitHub OAuth user
    if (
      !autoAnalyzedRef.current &&
      !isLoading &&
      user?.connected_github?.github_login
    ) {
      autoAnalyzedRef.current = true;
      runAnalysis(user.connected_github.github_login, false);
      return;
    }

    // 7. If user has a default profile configured and no cache exists
    if (
      !autoAnalyzedRef.current &&
      !isLoading &&
      user?.default_profile_username
    ) {
      autoAnalyzedRef.current = true;
      runAnalysis(user.default_profile_username, false);
      return;
    }

    // 8. If unauthenticated user lands on /dashboard without params, redirect to login
    if (!user && !autoAnalyzedRef.current) {
      navigate('/login?redirect=' + encodeURIComponent('/dashboard'));
      return;
    }
  }, [searchParams, user, isAuthLoading, analysisData, getCachedAnalysis, saveAnalysis, navigate]);

  const handleRetryAi = async () => {
    if (!analysisData || isLoadingAi) return;
    setIsLoadingAi(true);
    try {
      const envelope = await retryAIAnalysis(analysisData.username, analysisData.is_demo_data);
      updateAiAnalysis(envelope);
      setAnalysisData((prev) => (prev ? { ...prev, ai_analysis: envelope } : null));
    } catch (err: any) {
      console.error('Failed to retry AI analysis:', err);
      const errorMsg =
        err?.detail ||
        err?.message ||
        'Could not complete AI analysis at this time. Please try again shortly.';
      setAnalysisData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ai_analysis: {
            status: 'error',
            model_used: null,
            is_mock: false,
            error_message: errorMsg,
            analysis: null,
          },
        };
      });
    } finally {
      setIsLoadingAi(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isConnectedAccount = Boolean(
    user?.connected_github?.github_login &&
    analysisData?.username &&
    user.connected_github.github_login.toLowerCase() === analysisData.username.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Search Bar / Hero Section (shown when no report is loaded OR when user toggles 'Analyze Another Profile') */}
      {(!analysisData || isSearchOpen) && (
        <div className="relative animate-fadeIn">
          {analysisData && isSearchOpen && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Search</span>
              </button>
            </div>
          )}
          <HeroSection
            onAnalyze={(handle) => {
              if (!user) {
                navigate('/login?redirect=' + encodeURIComponent(`/dashboard?analyze=${encodeURIComponent(handle)}`));
                return;
              }
              runAnalysis(handle, false);
            }}
            onLoadDemo={handleLoadDemo}
            isLoading={isLoading}
            currentUsername={username}
          />
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <LoadingSkeleton />}

      {/* Error State */}
      {!isLoading && error && (
        <ErrorCard
          error={error.message}
          statusCode={error.status}
          retryAfterSeconds={error.retryAfterSeconds}
          rateLimitResetEpoch={error.rateLimitResetEpoch}
          onRetry={username ? () => runAnalysis(username, false) : undefined}
          onLoadDemo={handleLoadDemo}
        />
      )}


      {/* Empty State before any search */}
      {!isLoading && !error && !analysisData && (
        <EmptyState onLoadDemo={handleLoadDemo} />
      )}

      {/* Loaded Analysis Dashboard */}
      {!isLoading && analysisData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-fadeIn">
          {/* Top Action Bar: User identifier, Primary Navigation Tabs, & Actions */}
          <div className="sticky top-16 z-30 py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-navy-950/90 backdrop-blur-md border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            {/* Profile Pill & Demo Badge */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
              <span className="font-mono font-bold text-white px-2.5 py-1 rounded-lg bg-navy-900 border border-slate-700/80">
                @{analysisData.username}
              </span>

              {analysisData.is_demo_data ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                  Offline Demo Profile
                </span>
              ) : isConnectedAccount ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Connected Account</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 shrink-0">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span>Public Profile Analysis</span>
                </span>
              )}
            </div>

            {/* Primary Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto py-1 text-xs bg-navy-900/90 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-violet-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  activeTab === 'ai'
                    ? 'bg-violet-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>AI Insights</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  activeTab === 'audits'
                    ? 'bg-violet-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Repository Audits ({analysisData.top_repositories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recommendations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  activeTab === 'recommendations'
                    ? 'bg-violet-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Recommendations &amp; Roadmap</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  activeTab === 'history'
                    ? 'bg-violet-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            </div>

            {/* Quick Actions: Analyze Another Profile, Refresh, Export */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAnalyzeAnother}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isSearchOpen
                    ? 'bg-violet-600/20 text-violet-300 border-violet-500/50'
                    : 'bg-navy-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Search and analyze a different GitHub profile or repository URL"
              >
                <Search className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">Analyze Another Profile</span>
              </button>

              <button
                type="button"
                onClick={() => runAnalysis(analysisData.username, analysisData.is_demo_data)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all disabled:opacity-50"
                title="Re-analyze profile to update scores and verify resolved findings"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Re-analyze</span>
              </button>

              <ExportButton data={analysisData} />
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Quick Comparison Banner (Latest vs Previous Run) */}
              <QuickComparisonBanner
                username={analysisData.username}
                currentScore={analysisData.portfolio_score.overall_score}
                isDemo={analysisData.is_demo_data}
              />

              {/* Profile Header Card */}
              <ProfileHeader
                profile={analysisData.profile}
                isDemoData={analysisData.is_demo_data}
                isConnectedAccount={isConnectedAccount}
              />

              {/* Four Key Metrics (Score, Repos, Stars, Primary Language) */}
              <StatsGrid
                stats={analysisData.stats}
                score={analysisData.portfolio_score}
                onViewScoreDetails={() => setActiveTab('overview')}
              />

              {/* Top 3 High-Impact Improvements */}
              <TopImprovements
                aiRecommendations={analysisData.ai_analysis?.analysis?.recommendations}
                ruleRecommendations={analysisData.recommendations}
                onViewAll={() => setActiveTab('recommendations')}
              />

              {/* Visual Language Donut & Repository Reach Charts */}
              <VisualAnalytics
                languages={analysisData.languages}
                repositories={analysisData.top_repositories}
              />

              {/* Deterministic 5-Pillar Score Breakdown */}
              <PortfolioScoreCard score={analysisData.portfolio_score} />
            </div>
          )}

          {/* TAB 2: AI INSIGHTS */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-fadeIn">
              <AIAnalysisSection
                aiEnvelope={analysisData.ai_analysis}
                username={analysisData.username}
                isDemo={analysisData.is_demo_data}
                onRetryAi={handleRetryAi}
                isLoadingAi={isLoadingAi}
              />
            </div>
          )}

          {/* TAB 3: REPOSITORY AUDITS */}
          {activeTab === 'audits' && (
            <div className="space-y-6 animate-fadeIn">
              <RepoQualityChecklist checklist={analysisData.quality_checklist} />
              <RepositoryList repositories={analysisData.top_repositories} />
            </div>
          )}

          {/* TAB 4: RECOMMENDATIONS & ROADMAP */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6 animate-fadeIn">
              <ProgressSummaryCard
                username={analysisData.username}
                isDemo={analysisData.is_demo_data}
              />
              <RoadmapSection
                roadmap7={analysisData.roadmap_7_day}
                roadmap30={analysisData.roadmap_30_day}
              />
              <RecommendationsSection
                recommendations={analysisData.recommendations}
              />
            </div>
          )}

          {/* TAB 5: PERSISTENT ANALYSIS HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fadeIn">
              <DashboardHistoryTab
                onLoadRun={handleLoadHistoricalRun}
                currentUsername={analysisData.username}
              />
            </div>
          )}

          {/* Back to top button */}
          <div className="flex justify-center pt-6 pb-4">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
