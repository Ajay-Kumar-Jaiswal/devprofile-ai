import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  Briefcase,
  MapPin,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Search,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
  Info,
  Clock,
  DollarSign,
  Calendar,
  Check,
  ShieldCheck,
  Globe,
  Building2,
  Filter,
} from 'lucide-react';
import {
  getInternships,
  getInternshipDetail,
  saveInternship,
  unsaveInternship,
  syncInternships,
  getInternshipSources,
  getGitHubLinkUrl,
  ApiError,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GithubIcon } from '../components/GithubIcon';
import type {
  InternshipListingSummaryOut,
  InternshipDetailOut,
  InternshipSourcesResponse,
  InternshipQueryParams,
} from '../types/api';

export const InternshipsPage: React.FC = () => {
  const { user } = useAuth();

  // State
  const [listings, setListings] = useState<InternshipListingSummaryOut[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasProfileAnalysis, setHasProfileAnalysis] = useState<boolean>(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [locationScope, setLocationScope] = useState<string>('all');
  const [workMode, setWorkMode] = useState<string>('all');
  const [roleCategory, setRoleCategory] = useState<string>('');
  const [employerFilter, setEmployerFilter] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'match' | 'recent' | 'company'>('match');

  // Source telemetry & Sync
  const [sourcesData, setSourcesData] = useState<InternshipSourcesResponse | null>(null);
  const [showSourcesPanel, setShowSourcesPanel] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // GitHub Account Linking state
  const [isLinkingGitHub, setIsLinkingGitHub] = useState<boolean>(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Selected Detail Modal
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<InternshipDetailOut | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Bookmarking in progress
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  // Fetch listings from API
  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params: InternshipQueryParams = {
        search: searchTerm.trim() || undefined,
        location: locationScope !== 'all' ? locationScope : undefined,
        work_mode: workMode !== 'all' ? workMode : undefined,
        role_category: roleCategory || undefined,
        employer: employerFilter.trim() || undefined,
        saved_only: activeTab === 'saved',
        min_score: minScore > 0 ? minScore : undefined,
        sort_by: sortBy,
        limit: 50,
      };

      const res = await getInternships(params);
      setListings(res.items);
      setTotal(res.total);
      setHasProfileAnalysis(res.has_profile_analysis);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else {
        setErrorMessage(err?.message || 'Failed to load internship matches.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, locationScope, workMode, roleCategory, employerFilter, activeTab, minScore, sortBy]);

  // Initial load & search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchListings();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchListings]);

  // Load configured source telemetry
  const loadSources = useCallback(async () => {
    try {
      const data = await getInternshipSources();
      setSourcesData(data);
    } catch (err) {
      console.warn('Could not load source registry info:', err);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // GitHub account linking handler
  const handleLinkGitHub = async () => {
    setIsLinkingGitHub(true);
    setLinkError(null);
    try {
      const res = await getGitHubLinkUrl();
      if (!res.is_configured || !res.auth_url) {
        setLinkError(res.setup_instructions || 'GitHub OAuth is not configured on this server.');
        return;
      }
      window.location.href = res.auth_url;
    } catch (err: any) {
      setLinkError(err?.message || 'Failed to initialize GitHub linking.');
    } finally {
      setIsLinkingGitHub(false);
    }
  };

  // Trigger Sync / Ingestion across official APIs
  const handleSyncSources = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncInternships();
      setSyncFeedback(res.message);
      await fetchListings();
      await loadSources();
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Failed to sync job sources.');
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Bookmark / Save
  const handleToggleSave = async (listing: InternshipListingSummaryOut, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savingIds.has(listing.id)) return;

    setSavingIds((prev) => new Set(prev).add(listing.id));
    const nextSavedState = !listing.is_saved;

    // Optimistic UI update
    setListings((prev) =>
      prev.map((item) => (item.id === listing.id ? { ...item, is_saved: nextSavedState } : item))
    );
    if (detailData && detailData.id === listing.id) {
      setDetailData({ ...detailData, is_saved: nextSavedState });
    }

    try {
      if (nextSavedState) {
        await saveInternship(listing.id);
      } else {
        await unsaveInternship(listing.id);
      }
    } catch (err) {
      // Revert optimistic update on error
      setListings((prev) =>
        prev.map((item) => (item.id === listing.id ? { ...item, is_saved: !nextSavedState } : item))
      );
      if (detailData && detailData.id === listing.id) {
        setDetailData({ ...detailData, is_saved: !nextSavedState });
      }
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(listing.id);
        return next;
      });
    }
  };

  // Open Role Details Modal
  const handleOpenDetail = async (id: number) => {
    setSelectedListingId(id);
    setIsLoadingDetail(true);
    setDetailData(null);
    try {
      const data = await getInternshipDetail(id, false);
      setDetailData(data);
    } catch (err: any) {
      console.error('Error loading role details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Generate Optional Groq AI Summary
  const handleGenerateAiInsight = async () => {
    if (!selectedListingId || isGeneratingAi) return;
    setIsGeneratingAi(true);
    try {
      const data = await getInternshipDetail(selectedListingId, true);
      setDetailData(data);
    } catch (err) {
      console.warn('AI insight generation failed:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Formatting helpers
  const formatSalary = (listing: InternshipListingSummaryOut | InternshipDetailOut) => {
    if (!listing.salary_min && !listing.salary_max) return null;
    const cur = listing.salary_currency || '$';
    let range = '';
    if (listing.salary_min && listing.salary_max && listing.salary_min !== listing.salary_max) {
      range = `${cur}${listing.salary_min.toLocaleString()} - ${cur}${listing.salary_max.toLocaleString()}`;
    } else if (listing.salary_min) {
      range = `${cur}${listing.salary_min.toLocaleString()}+`;
    } else if (listing.salary_max) {
      range = `Up to ${cur}${listing.salary_max.toLocaleString()}`;
    }
    if (listing.salary_interval) {
      range += ` / ${listing.salary_interval}`;
    }
    return range;
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 75) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (score >= 50) {
      return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
    }
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  };

  const getWorkModeBadgeClass = (mode: string) => {
    switch (mode) {
      case 'remote':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'hybrid':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
      case 'onsite':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-800/60 text-slate-400 border-slate-700/60';
    }
  };

  const getSourceHealthBadge = (src: { health_status?: string; listings_count: number }) => {
    switch (src.health_status) {
      case 'healthy_with_results':
        return {
          label: `Healthy (${src.listings_count} roles)`,
          className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        };
      case 'healthy_empty':
        return {
          label: 'Active (0 roles)',
          className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        };
      case 'rate_limited':
        return {
          label: 'Rate Limited (429)',
          className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'invalid_config':
        return {
          label: 'Unavailable (404)',
          className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        };
      case 'disabled_no_authorized_api':
        return {
          label: 'No Public API',
          className: 'bg-slate-800 text-slate-400 border-slate-700',
        };
      default:
        return {
          label: `${src.listings_count} roles`,
          className: 'bg-slate-800 text-violet-300 border-slate-700',
        };
    }
  };

  const roleCategories = [
    { id: '', label: 'All Roles' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'backend', label: 'Backend' },
    { id: 'fullstack', label: 'Fullstack' },
    { id: 'ai_ml_data', label: 'AI / ML / Data' },
    { id: 'devops_cloud', label: 'DevOps / Cloud' },
  ];

  const authorizedSources = sourcesData?.sources.filter((s) => s.authorized_api_available !== false) || [];
  const investigatedPlatforms = sourcesData?.sources.filter((s) => s.authorized_api_available === false) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-glow-violet">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Internship Matches
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Live student and early-career vacancies polled from official employer Greenhouse &amp; Lever APIs, matched deterministically against your GitHub profile.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSourcesPanel(!showSourcesPanel)}
            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-navy-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-violet-400" />
            <span>Sources ({sourcesData?.total_configured || 0})</span>
          </button>

          <button
            type="button"
            onClick={handleSyncSources}
            disabled={isSyncing}
            className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-subtle hover:shadow-glow-violet flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Refresh Matches'}</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast Banner */}
      {syncFeedback && (
        <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-violet-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* 2. GitHub Account Linking Banner (for unlinked users) */}
      {user && !user.connected_github && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-navy-900 to-indigo-950/40 border border-violet-500/30 text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 shrink-0 mt-0.5 shadow-glow-violet">
              <GithubIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">Connect Your GitHub Account</span>
              <p className="text-slate-300 text-xs mt-0.5 max-w-xl leading-relaxed">
                Link your GitHub identity to enable automated repo skill extraction, candidate match scoring against live vacancies, and AI recruiter fit analysis.
              </p>
              {linkError && (
                <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{linkError}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link
              to="/settings"
              className="px-3.5 py-2 rounded-xl bg-navy-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLinkGitHub}
              disabled={isLinkingGitHub}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-subtle hover:shadow-glow-violet flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              <GithubIcon className="w-4 h-4" />
              <span>{isLinkingGitHub ? 'Connecting...' : 'Link GitHub Account'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Unanalyzed Profile Banner (if candidate has linked account but no analysis yet) */}
      {(!hasProfileAnalysis && (!user || user.connected_github)) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-100 block">Personalized Matching Inactive</span>
              <p className="text-amber-200/80 text-[11px] mt-0.5">
                Analyze your GitHub profile on the Dashboard to unlock customized skill alignment scores and match breakdowns.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-semibold self-start sm:self-auto transition-colors whitespace-nowrap"
          >
            Go to Dashboard &rarr;
          </Link>
        </div>
      )}

      {/* 4. Configured Sources Overview Panel (Collapsible) */}
      {showSourcesPanel && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Configured Employer Sources (Official APIs &amp; Feeds)</span>
            </div>
            <button
              onClick={() => setShowSourcesPanel(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Vacancies are fetched exclusively via official public endpoints. No scraping or automation is used. Configure employer boards via <code className="text-violet-300 font-mono">INTERNSHIP_GREENHOUSE_BOARDS</code>, <code className="text-violet-300 font-mono">INTERNSHIP_LEVER_SITES</code>, or <code className="text-violet-300 font-mono">INTERNSHIP_RSS_FEEDS</code> in <code className="text-slate-300 font-mono">backend/.env</code>.
          </p>

          {/* Section A: Live Authorized API Sources */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Live ATS Ingestion ({authorizedSources.length} sources)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {authorizedSources.map((src, i) => {
                const health = getSourceHealthBadge(src);
                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-navy-900 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">{src.label}</span>
                      <span className="text-[11px] text-slate-400 font-mono uppercase">{src.provider}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.className}`}>
                      {health.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Investigated Indian Student Platforms (No Authorized API) */}
          {investigatedPlatforms.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Investigated Indian Platforms (Zero-Scraping Policy)</span>
                </span>
                <span className="text-[10px] text-slate-400">Direct Search Links Only</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                DevProfile AI strictly complies with terms of service and zero-scraping principles. Because Internshala, Naukri, and Unstop do not provide public developer APIs or open feeds, automated scraping is prohibited. Direct external search links to their verified portals are provided below:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {investigatedPlatforms.map((src, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-navy-950/80 border border-slate-800 flex flex-col justify-between gap-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{src.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          External Only
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {src.status_message || 'No public API available.'}
                      </p>
                    </div>
                    {src.official_portal_url && (
                      <a
                        href={src.official_portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        <span>Open {src.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Controls: Tabs, Search, and Filters */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs: All Matches vs Saved Roles */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-900 border border-slate-800/80 self-start">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-violet-600 text-white shadow-subtle'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Matches
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-violet-600 text-white shadow-subtle'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Roles</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="font-bold text-white">{listings.length}</span> of {total} vacancy matches
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 shadow-card flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by role, company, or skills (e.g. React, Python, Cloudflare)..."
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Location Scope Filter */}
          <select
            value={locationScope}
            onChange={(e) => setLocationScope(e.target.value)}
            className="w-full md:w-44 h-10 px-3 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">All Locations</option>
            <option value="india">India &amp; Remote</option>
            <option value="remote">Remote Only</option>
          </select>

          {/* Work Mode Filter */}
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="w-full md:w-32 h-10 px-3 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">All Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>

          {/* Employer Filter */}
          <div className="relative w-full md:w-36">
            <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={employerFilter}
              onChange={(e) => setEmployerFilter(e.target.value)}
              placeholder="Employer..."
              className="w-full h-10 pl-8 pr-7 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            {employerFilter && (
              <button
                type="button"
                onClick={() => setEmployerFilter('')}
                className="absolute right-2.5 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Match Score Filter */}
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full md:w-36 h-10 px-3 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value={0}>All Scores</option>
            <option value={50}>Good (&ge;50%)</option>
            <option value={75}>Strong (&ge;75%)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full md:w-32 h-10 px-3 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="match">Best Match</option>
            <option value="recent">Most Recent</option>
            <option value="company">Company</option>
          </select>
        </div>

        {/* Role Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-violet-400" />
            <span>Category:</span>
          </span>
          {roleCategories.map((cat) => {
            const isSelected = roleCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setRoleCategory(isSelected && cat.id !== '' ? '' : cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-subtle border border-violet-500'
                    : 'bg-navy-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Main Content: Grid of Listings */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="glass-panel p-5 rounded-2xl border border-slate-800 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-800 rounded-md" />
                  <div className="h-5 w-48 bg-slate-700 rounded-md" />
                </div>
                <div className="h-8 w-16 bg-slate-800 rounded-full" />
              </div>
              <div className="h-3 w-40 bg-slate-800 rounded" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-slate-800 rounded-lg" />
                <div className="h-6 w-20 bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-200 font-semibold">{errorMessage}</p>
          <button
            onClick={fetchListings}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="p-12 rounded-2xl bg-navy-900/40 border border-slate-800/80 text-center space-y-4">
          <Briefcase className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Vacancies Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {activeTab === 'saved'
              ? 'You have not bookmarked any internship positions yet. Click the bookmark icon on any vacancy card to save it for later.'
              : sourcesData?.total_active_listings === 0
              ? 'No active listings have been ingested yet. Click "Refresh Matches" above to poll configured Greenhouse and Lever boards.'
              : 'No vacancies matched your current search and filter criteria. Try clearing search keywords or lowering the score threshold.'}
          </p>
          {(searchTerm || locationScope !== 'all' || workMode !== 'all' || roleCategory !== '' || employerFilter !== '' || minScore > 0) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setLocationScope('all');
                setWorkMode('all');
                setRoleCategory('');
                setEmployerFilter('');
                setMinScore(0);
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {listings.map((item) => {
            const salaryText = formatSalary(item);
            const matchScore = item.match?.match_score || 50;
            const fitLevel = item.match?.fit_level || 'Good Match';

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item.id)}
                className="glass-panel p-5 rounded-2xl border border-slate-800/90 hover:border-violet-500/40 shadow-card hover:shadow-glow-violet transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                {/* Header: Company, Title, Match Score, Bookmark */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wide">
                          {item.company_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                          via {item.source_type}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Match Badge */}
                      <span
                        title={fitLevel}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getScoreBadgeClass(
                          matchScore
                        )}`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{matchScore}%</span>
                        <span className="hidden sm:inline font-medium text-[10px] opacity-80">&bull; {fitLevel}</span>
                      </span>

                      {/* Bookmark Icon */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSave(item, e)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          item.is_saved
                            ? 'bg-violet-600 text-white border-violet-500 shadow-glow-violet'
                            : 'bg-navy-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={item.is_saved ? 'Remove Bookmark' : 'Save Internship'}
                      >
                        {item.is_saved ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Row: Location, Work Mode, Salary, Duration */}
                  <div className="flex items-center gap-2.5 flex-wrap text-xs text-slate-400 pt-0.5">
                    {item.location && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.location}</span>
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${getWorkModeBadgeClass(
                        item.work_mode
                      )}`}
                    >
                      {item.work_mode}
                    </span>

                    {salaryText && (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{salaryText}</span>
                      </span>
                    )}

                    {item.duration && (
                      <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.duration}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Candidate Fit Reason Snippet */}
                {item.match?.fit_reasons && item.match.fit_reasons.length > 0 && (
                  <p className="text-xs text-slate-300 bg-navy-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                    <span className="text-violet-400 font-semibold mr-1">Fit Insight:</span>
                    {item.match.fit_reasons[0]}
                  </p>
                )}

                {/* Skills tags */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Matched skills */}
                    {item.match?.matched_skills?.slice(0, 4).map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-violet-600/15 border border-violet-500/30 text-violet-300 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-violet-400" />
                        <span>{skill}</span>
                      </span>
                    ))}

                    {/* Not demonstrated skills */}
                    {item.match?.not_demonstrated_skills?.slice(0, 2).map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-400 text-[11px] flex items-center gap-1"
                        title="Skill not demonstrated in your analyzed GitHub repositories"
                      >
                        <Info className="w-3 h-3 text-slate-500" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Verified {new Date(item.last_verified_at).toLocaleDateString()}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Role Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={item.application_url || item.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-subtle hover:shadow-glow-violet flex items-center gap-1"
                    >
                      <span>Apply Now</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Detail Modal */}
      {selectedListingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-3xl max-h-[90vh] rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden bg-navy-950">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-navy-900/60">
              {isLoadingDetail ? (
                <div className="space-y-2 animate-pulse w-full">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-6 w-64 bg-slate-700 rounded" />
                </div>
              ) : detailData ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wide">
                      {detailData.company_name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      via {detailData.source_type}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {detailData.title}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    {detailData.location && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{detailData.location}</span>
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${getWorkModeBadgeClass(
                        detailData.work_mode
                      )}`}
                    >
                      {detailData.work_mode}
                    </span>
                    {formatSalary(detailData) && (
                      <span className="text-emerald-400 font-semibold">
                        {formatSalary(detailData)}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedListingId(null)}
                className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
              {isLoadingDetail ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-16 bg-slate-800/60 rounded-xl" />
                  <div className="h-32 bg-slate-800/40 rounded-xl" />
                </div>
              ) : detailData ? (
                <>
                  {/* Match Analysis Pill Breakdown */}
                  {detailData.match && (
                    <div className="glass-panel p-4 rounded-2xl border border-violet-500/20 bg-violet-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-violet-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Candidate Match Evaluation ({detailData.match.match_score}/100 -{' '}
                            {detailData.match.fit_level})
                          </span>
                        </div>
                      </div>

                      {/* 4 Score Pillars */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-navy-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Tech Stack</span>
                          <span className="font-bold text-white text-sm">
                            {detailData.match.score_breakdown.tech_stack_score}/40
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-navy-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Tools &amp; Frameworks</span>
                          <span className="font-bold text-white text-sm">
                            {detailData.match.score_breakdown.tools_score}/30
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-navy-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Portfolio Readiness</span>
                          <span className="font-bold text-white text-sm">
                            {detailData.match.score_breakdown.readiness_score}/20
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-navy-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Domain Fit</span>
                          <span className="font-bold text-white text-sm">
                            {detailData.match.score_breakdown.domain_score}/10
                          </span>
                        </div>
                      </div>

                      {/* Fit reasons */}
                      <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside">
                        {detailData.match.fit_reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>

                      <p className="text-[11px] text-slate-400 italic">
                        Evidence: {detailData.match.evidence_used}
                      </p>
                    </div>
                  )}

                  {/* Skills Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Skills Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Matched */}
                      <div className="p-3.5 rounded-xl bg-navy-900 border border-emerald-500/20 space-y-2">
                        <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Demonstrated in Profile ({detailData.match?.matched_skills.length || 0})</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {detailData.match?.matched_skills && detailData.match.matched_skills.length > 0 ? (
                            detailData.match.matched_skills.map((s, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[11px]">No direct overlaps found</span>
                          )}
                        </div>
                      </div>

                      {/* Not demonstrated */}
                      <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>Not demonstrated in GitHub profile ({detailData.match?.not_demonstrated_skills.length || 0})</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {detailData.match?.not_demonstrated_skills && detailData.match.not_demonstrated_skills.length > 0 ? (
                            detailData.match.not_demonstrated_skills.map((s, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-400 text-[11px]"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[11px]">All role skills demonstrated!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optional Groq AI Summary */}
                  <div className="p-4 rounded-2xl bg-navy-900/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        <span>AI Recruiter Fit Analysis (Grounded in Verified Profile Data)</span>
                      </span>

                      {!detailData.ai_explanation && (
                        <button
                          type="button"
                          onClick={handleGenerateAiInsight}
                          disabled={isGeneratingAi}
                          className="px-2.5 py-1 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-[11px] font-semibold flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                        >
                          <Sparkles className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                          <span>{isGeneratingAi ? 'Generating...' : 'Analyze with AI'}</span>
                        </button>
                      )}
                    </div>

                    {detailData.ai_explanation ? (
                      <p className="text-xs text-slate-300 leading-relaxed italic bg-navy-950/60 p-3 rounded-xl border border-slate-800">
                        "{detailData.ai_explanation}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Generate an objective 2-sentence summary grounded in this role's requirements and your GitHub evidence.
                      </p>
                    )}
                  </div>

                  {/* Full Sanitized Description */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Full Role Description
                    </h4>
                    <div
                      className="prose prose-invert prose-sm max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed bg-navy-900/40 p-5 rounded-2xl border border-slate-800/80"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(detailData.description_html || '<p>No full description provided.</p>'),
                      }}
                    />
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            {detailData && (
              <div className="p-5 border-t border-slate-800 flex items-center justify-between gap-3 bg-navy-900/60">
                <button
                  type="button"
                  onClick={(e) => handleToggleSave(detailData, e)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                    detailData.is_saved
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'bg-navy-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {detailData.is_saved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Save Role</span>
                    </>
                  )}
                </button>

                <a
                  href={detailData.application_url || detailData.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-subtle hover:shadow-glow-violet flex items-center gap-2 cursor-pointer"
                >
                  <span>Apply on Employer Site</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
