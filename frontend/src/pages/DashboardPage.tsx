import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import { HeroSection } from '../components/HeroSection';
import { AuditHeader } from '../components/AuditHeader';
import { DashboardOverviewCards } from '../components/DashboardOverviewCards';
import { ExportButton } from '../components/ExportButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import {
  fetchProfileAnalysis,
  getHistoryRunDetail,
  ApiError,
} from '../services/api';
import type { AnalysisResponse } from '../types/api';
import {
  ArrowUp,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    currentAnalysis,
    saveAnalysis,
    getCachedAnalysis,
  } = useAnalysis();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>(() => currentAnalysis?.username || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(() => currentAnalysis);
  const [error, setError] = useState<{
    message: string;
    status?: number;
    retryAfterSeconds?: number;
    rateLimitResetEpoch?: number;
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab === 'history') {
      navigate('/history', { replace: true });
      return;
    }
    if (currentTab === 'ai' || currentTab === 'ai-insights') {
      navigate('/ai-insights', { replace: true });
      return;
    }
    if (currentTab === 'improvements' || currentTab === 'recommendations' || currentTab === 'prioritized-improvements') {
      navigate('/improvements', { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  // Flow B Guard: Prevent duplicate automatic triggers on re-render / tab switch
  const autoAnalyzedRef = useRef<boolean>(false);

  const handleAnalyzeAnother = () => {
    navigate('/');
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
            <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex justify-end">
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
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-4 animate-fadeIn">
          {/* Action Group: 1. Download Report, 2. Analyze Another Profile, 3. Re-analyze — Blended into background */}
          <div className="py-2 flex items-center justify-end gap-2 flex-wrap">
            <ExportButton data={analysisData} />

            <button
              type="button"
              onClick={handleAnalyzeAnother}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-180 bg-[#101723]/60 backdrop-blur-md border-[rgba(148,163,184,0.16)] hover:border-[#477F7C] text-slate-300 hover:text-white hover:bg-neutral-900 cursor-pointer"
              title="Search and analyze a different GitHub profile or repository URL"
            >
              <Search className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">Analyze Another Profile</span>
            </button>

            <button
              type="button"
              onClick={() => runAnalysis(analysisData.username, analysisData.is_demo_data)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101723]/60 backdrop-blur-md border border-[rgba(148,163,184,0.16)] hover:border-[#477F7C] text-slate-300 hover:text-white hover:bg-neutral-900 text-xs font-semibold transition-all duration-180 disabled:opacity-50 cursor-pointer"
              title="Re-analyze profile to update scores and verify resolved findings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-analyze</span>
            </button>
          </div>

          {/* MAIN DASHBOARD CONTENT */}
          <div className="space-y-6 animate-fadeIn">
            <AuditHeader
              profile={analysisData.profile}
              stats={analysisData.stats}
              score={analysisData.portfolio_score}
              qualityChecklist={analysisData.quality_checklist}
              analyzedAt={analysisData.profile.updated_at || undefined}
              isDemoData={analysisData.is_demo_data}
              isConnectedAccount={isConnectedAccount}
              topTopics={Array.from(
                new Set(analysisData.top_repositories.flatMap((r) => r.topics).filter(Boolean))
              ).slice(0, 5)}
            />

            <DashboardOverviewCards analysisData={analysisData} />
          </div>

          {/* Back to top button */}
          <div className="flex justify-center pt-6 pb-4">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101723]/60 backdrop-blur-md border border-[rgba(148,163,184,0.16)] text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
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
