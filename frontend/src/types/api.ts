export interface UserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  social_accounts?: Array<{ provider?: string; url?: string }>;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string | null;
  updated_at: string | null;
  account_age_years: number | null;
}

export interface RepositoryItem {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage?: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  has_readme: boolean;
  has_description: boolean;
  has_topics: boolean;
  has_license: boolean;
  license_name: string | null;
  topics: string[];
  is_fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  days_since_last_push: number | null;
  quality_score: number;
}

export interface LanguageStat {
  language: string;
  repo_count: number;
  percentage: number;
  color?: string;
}

export interface ScoreCategory {
  category: string;
  score: number;
  max_score: number;
  percentage: number;
  status: 'poor' | 'average' | 'good' | 'excellent';
  feedback: string;
}

export interface PortfolioScore {
  overall_score: number;
  tier: 'Needs Work' | 'Developing' | 'Competitive' | 'Strong' | 'Exceptional';
  summary: string;
  breakdown: ScoreCategory[];
  disclaimer: string;
}

export interface RepoQualityChecklist {
  total_repos_analyzed: number;
  repos_with_description: number;
  repos_with_description_pct: number;
  repos_with_topics: number;
  repos_with_topics_pct: number;
  repos_with_license: number;
  repos_with_license_pct: number;
  repos_active_within_6_months: number;
  repos_active_within_6_months_pct: number;
  original_repos_count: number;
  forked_repos_count: number;
  pinned_notice: string;
}

export interface RecommendationItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  action: string;
}

export interface RoadmapStep {
  day_or_week: string;
  task: string;
  details: string;
  expected_outcome: string;
}

export interface RoadmapPhase {
  title: string;
  timeline: string;
  objective: string;
  is_mock_ai: boolean;
  ai_engine_badge: string;
  steps: RoadmapStep[];
}

export interface AggregateStats {
  total_stars: number;
  total_forks: number;
  total_public_repos: number;
  total_analyzed_repos: number;
  detected_languages_count: number;
  primary_language: string | null;
  average_stars_per_repo: number;
  total_open_issues: number;
}

// ============================================================================
// Phase 2: Groq Structured AI Analysis Interfaces
// ============================================================================

export interface ProjectFeedbackItem {
  repo_name: string;
  feedback: string;
  suggested_improvements: string[];
}

export interface AIRecommendationItem {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  reason: string;
  suggested_action: string;
}

export interface AIRoadmapTask {
  day: string;
  task: string;
  details: string;
  expected_outcome: string;
}

export interface AIRoadmapMilestone {
  week: string;
  milestone: string;
  details: string;
  expected_outcome: string;
}

export interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  project_feedback: ProjectFeedbackItem[];
  profile_improvements: string[];
  placement_readiness: string[];
  interviewer_talking_points?: string[];
  recommendations: AIRecommendationItem[];
  roadmap_7_days: AIRoadmapTask[];
  roadmap_30_days: AIRoadmapMilestone[];
  missing_evidence: string[];
}

export interface AIAnalysisEnvelope {
  status: 'success' | 'disabled' | 'unavailable' | 'rate_limited' | 'error';
  model_used: string | null;
  is_mock: boolean;
  error_message: string | null;
  analysis: AIAnalysisResult | null;
}

export interface AnalysisResponse {
  username: string;
  analyzed_at: string;
  is_demo_data: boolean;
  profile: UserProfile;
  stats: AggregateStats;
  languages: LanguageStat[];
  top_repositories: RepositoryItem[];
  portfolio_score: PortfolioScore;
  quality_checklist: RepoQualityChecklist;
  recommendations: RecommendationItem[];
  roadmap_7_day: RoadmapPhase;
  roadmap_30_day: RoadmapPhase;
  ai_analysis?: AIAnalysisEnvelope | null;
}

export interface HealthResponse {
  status: string;
  environment: string;
  version: string;
  github_api_status: string;
  groq_api_status: string;
  github_authenticated?: boolean;
  github_rate_limited?: boolean;
  github_rate_limit_reset?: number | null;
  groq_configured?: boolean;
}


// ============================================================================
// Phase 1-5 SaaS Interfaces
// ============================================================================

export interface ConnectedGitHubOut {
  github_user_id: number;
  github_login: string;
  avatar_url: string | null;
  html_url: string | null;
  connected_at: string;
}

export interface UserOut {
  id: number;
  email: string | null;
  full_name: string | null;
  default_profile_username: string | null;
  connected_github: ConnectedGitHubOut | null;
  has_password?: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: UserOut;
  token: string;
  message: string;
}

export interface GitHubOAuthUrlResponse {
  is_configured: boolean;
  auth_url: string | null;
  client_id: string | null;
  setup_instructions: string | null;
}

export interface AnalysisRunSummary {
  id: number;
  analyzed_login: string;
  is_demo_data: boolean;
  overall_score: number;
  score_tier: string;
  public_repos: number;
  total_stars: number;
  primary_language: string | null;
  status: string;
  created_at: string;
}

export interface HistoryListResponse {
  total_runs: number;
  runs: AnalysisRunSummary[];
}

export interface ComparisonMetricDelta {
  metric: string;
  previous: any;
  current: any;
  change: any;
  improved: boolean | null;
}

export interface ComparisonIssueDelta {
  rule_id: string;
  title: string;
  priority: string;
  category: string;
}

export interface RunComparisonResponse {
  current_run_id: number;
  previous_run_id: number;
  analyzed_login: string;
  current_date: string;
  previous_date: string;
  score_delta: number;
  tier_change: string | null;
  metrics_deltas: ComparisonMetricDelta[];
  newly_detected_issues: ComparisonIssueDelta[];
  resolved_issues: ComparisonIssueDelta[];
  persistent_issues: ComparisonIssueDelta[];
}

export interface RecommendationEventOut {
  id: number;
  previous_status: string;
  new_status: string;
  trigger_reason: string;
  evidence_snapshot: string | null;
  created_at: string;
}

export interface TrackedRecommendationOut {
  id: number;
  analyzed_login: string;
  rule_id: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  suggested_action: string;
  evidence: string;
  repo_name: string | null;
  status: 'open' | 'resolved' | 'dismissed' | 'needs_verification';
  first_detected_at: string;
  last_detected_at: string;
  resolved_at: string | null;
  recurrence_count: number;
  events: RecommendationEventOut[];
}
