import type {
  AnalysisResponse,
  HealthResponse,
  AIAnalysisEnvelope,
  AuthResponse,
  UserOut,
  GitHubOAuthUrlResponse,
  HistoryListResponse,
  RunComparisonResponse,
  TrackedRecommendationOut,
  InternshipsListResponse,
  InternshipDetailOut,
  InternshipSourcesResponse,
  SyncResultOut,
  InternshipQueryParams,
} from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export interface ApiErrorOptions {
  retryAfterSeconds?: number;
  rateLimitResetEpoch?: number;
  isOffline?: boolean;
  isTimeout?: boolean;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  retryAfterSeconds?: number;
  rateLimitResetEpoch?: number;
  isOffline?: boolean;
  isTimeout?: boolean;

  constructor(status: number, detail: string, options?: ApiErrorOptions) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.rateLimitResetEpoch = options?.rateLimitResetEpoch;
    this.isOffline = options?.isOffline;
    this.isTimeout = options?.isTimeout;
  }
}

// Token storage helpers
export function getStoredToken(): string | null {
  return localStorage.getItem('devprofile_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('devprofile_token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem('devprofile_token');
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Robust fetch wrapper enforcing timeouts, offline detection, and centralized network error mapping.
 */
async function safeFetch(url: string, init?: RequestInit, timeoutMs: number = 25000): Promise<Response> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(
      0,
      'You are currently offline. Please check your internet connection and try again.',
      { isOffline: true }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError(
        504,
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Upstream service or server may be experiencing high latency.`,
        { isTimeout: true }
      );
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      0,
      `Cannot connect to DevProfile AI backend at ${API_BASE_URL}. Ensure FastAPI is running on port 8000.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parses response error payloads, extracts standard rate limit headers, and maps to ApiError.
 */
async function handleResponseError(res: Response): Promise<never> {
  let detail = `Request failed with HTTP status ${res.status}`;
  let retryAfterSeconds: number | undefined;
  let rateLimitResetEpoch: number | undefined;

  const retryAfterHeader = res.headers.get('retry-after') || res.headers.get('Retry-After');
  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10);
    if (!isNaN(parsed) && parsed > 0) {
      retryAfterSeconds = parsed;
    }
  }

  const resetHeader = res.headers.get('x-ratelimit-reset') || res.headers.get('X-RateLimit-Reset');
  if (resetHeader) {
    const parsed = parseInt(resetHeader, 10);
    if (!isNaN(parsed) && parsed > 0) {
      rateLimitResetEpoch = parsed;
    }
  }

  try {
    const errorJson = await res.json();
    if (errorJson && typeof errorJson.detail === 'string') {
      detail = errorJson.detail;
    } else if (errorJson && Array.isArray(errorJson.detail)) {
      detail = errorJson.detail.map((e: any) => e.msg || 'Invalid field').join(', ');
    }
  } catch {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      detail = `The server or upstream service is temporarily experiencing an outage (HTTP ${res.status}). Please try again shortly.`;
    }
  }

  // Clear stale token if unauthorized on a protected route
  if (res.status === 401 && getStoredToken()) {
    removeStoredToken();
  }

  throw new ApiError(res.status, detail, {
    retryAfterSeconds,
    rateLimitResetEpoch,
  });
}

/**
 * Checks connectivity and health status of the FastAPI backend service.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/health`, {
    headers: { Accept: 'application/json' },
  }, 10000);

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

/**
 * Requests GitHub profile analysis from the FastAPI backend.
 */
export async function fetchProfileAnalysis(username: string, isDemo: boolean = false): Promise<AnalysisResponse> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new ApiError(400, 'Please enter a valid GitHub username or profile URL.');
  }

  const endpoint = `${API_BASE_URL}/api/analyze/${encodeURIComponent(cleanUsername)}${isDemo ? '?demo=true' : ''}`;
  const res = await safeFetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  }, 35000); // 35s timeout for repository queries and LLM execution

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

/**
 * Specifically retries or generates Groq AI portfolio analysis for an already analyzed profile.
 */
export async function retryAIAnalysis(username: string, isDemo: boolean = false): Promise<AIAnalysisEnvelope> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new ApiError(400, 'Invalid username for AI analysis.');
  }

  const endpoint = `${API_BASE_URL}/api/analyze/${encodeURIComponent(cleanUsername)}/ai${isDemo ? '?demo=true' : ''}`;
  const res = await safeFetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  }, 30000);

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

// ============================================================================
// SaaS Authentication API Functions
// ============================================================================

export async function registerUser(email: string, password: string, fullName?: string, defaultProfile?: string): Promise<AuthResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName || null,
      default_profile_username: defaultProfile || null,
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  const data = await res.json();
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  const data = await res.json();
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  try {
    await safeFetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    }, 5000);
  } finally {
    removeStoredToken();
  }
}

export async function getMe(): Promise<UserOut> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function updateDefaultProfile(profileInput: string): Promise<UserOut> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/default-profile`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_input: profileInput }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function getGitHubOAuthUrl(): Promise<GitHubOAuthUrlResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/github/url`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function exchangeGitHubOAuthCode(code: string, state: string): Promise<AuthResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/github/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, state }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  const data = await res.json();
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function disconnectGitHub(): Promise<{ message: string; user: UserOut }> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/github/disconnect`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; documentation: string }> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function setupCredentials(
  email: string,
  password: string,
  confirmPassword?: string
): Promise<{ message: string; user: UserOut }> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/setup-credentials`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      confirm_password: confirmPassword,
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

// ============================================================================
// History & Recommendations API Functions
// ============================================================================

export async function getAnalysisHistory(username?: string, limit = 20, offset = 0): Promise<HistoryListResponse> {
  const params = new URLSearchParams();
  if (username) params.append('username', username);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const res = await safeFetch(`${API_BASE_URL}/api/history?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function getHistoryRunDetail(runId: number): Promise<AnalysisResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/history/${runId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function compareHistoryRuns(currentId: number, previousId: number): Promise<RunComparisonResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/history/${currentId}/compare/${previousId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function deleteHistoryRun(runId: number): Promise<void> {
  const res = await safeFetch(`${API_BASE_URL}/api/history/${runId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
}

export async function clearAnalysisHistory(): Promise<{ message: string; deleted_count: number }> {
  const res = await safeFetch(`${API_BASE_URL}/api/history`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function getTrackedRecommendations(status?: string, username?: string): Promise<TrackedRecommendationOut[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (username) params.append('username', username);

  const res = await safeFetch(`${API_BASE_URL}/api/recommendations?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function updateRecommendationStatus(recId: number, status: 'open' | 'dismissed'): Promise<TrackedRecommendationOut> {
  const res = await safeFetch(`${API_BASE_URL}/api/recommendations/${recId}/status`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

// ============================================================================
// Internship Matches API Functions (Official APIs — No Scraping)
// ============================================================================

export async function getInternships(params: InternshipQueryParams = {}): Promise<InternshipsListResponse> {
  const q = new URLSearchParams();
  if (params.search) q.append('search', params.search);
  if (params.location) q.append('location', params.location);
  if (params.work_mode) q.append('work_mode', params.work_mode);
  if (params.is_internship_only !== undefined) q.append('is_internship_only', String(params.is_internship_only));
  if (params.saved_only) q.append('saved_only', 'true');
  if (params.include_stale) q.append('include_stale', 'true');
  if (params.min_score !== undefined) q.append('min_score', String(params.min_score));
  if (params.sort_by) q.append('sort_by', params.sort_by);
  if (params.limit) q.append('limit', String(params.limit));
  if (params.offset) q.append('offset', String(params.offset));

  const res = await safeFetch(`${API_BASE_URL}/api/internships?${q.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function getInternshipDetail(id: number, ai = false): Promise<InternshipDetailOut> {
  const res = await safeFetch(`${API_BASE_URL}/api/internships/${id}?ai=${ai}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function saveInternship(id: number, notes?: string): Promise<{ message: string; is_saved: boolean }> {
  const res = await safeFetch(`${API_BASE_URL}/api/internships/${id}/save`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function unsaveInternship(id: number): Promise<{ message: string; is_saved: boolean }> {
  const res = await safeFetch(`${API_BASE_URL}/api/internships/${id}/save`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function getSavedInternships(limit = 50, offset = 0): Promise<InternshipsListResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/internships/saved?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function syncInternships(): Promise<SyncResultOut> {
  const res = await safeFetch(`${API_BASE_URL}/api/internships/refresh-matches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}

export async function getInternshipSources(): Promise<InternshipSourcesResponse> {
  const res = await safeFetch(`${API_BASE_URL}/api/internships/sources`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    await handleResponseError(res);
  }
  return await res.json();
}
