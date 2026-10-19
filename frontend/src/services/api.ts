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
} from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
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
 * Checks connectivity and health status of the FastAPI backend service.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new ApiError(res.status, errorData.detail || `Server health check failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      0,
      `Cannot connect to DevProfile AI backend at ${API_BASE_URL}. Ensure FastAPI is running on port 8000.`
    );
  }
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

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      let detail = `Request failed with HTTP status ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          detail = errorJson.detail;
        }
      } catch {
        // Fall back
      }
      throw new ApiError(res.status, detail);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      0,
      `Network connection failed. Could not reach DevProfile AI backend at ${API_BASE_URL}. Verify backend service is running.`
    );
  }
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

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      let detail = `AI Analysis failed with HTTP status ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          detail = errorJson.detail;
        }
      } catch {
        // Fall back
      }
      throw new ApiError(res.status, detail);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      0,
      `Could not contact AI analysis service at ${API_BASE_URL}. Check backend status.`
    );
  }
}

// ============================================================================
// SaaS Authentication API Functions
// ============================================================================

export async function registerUser(email: string, password: string, fullName?: string, defaultProfile?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Registration failed.');
  }
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Invalid email or password.');
  }
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
  } finally {
    removeStoredToken();
  }
}

export async function getMe(): Promise<UserOut> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to authenticate user.');
  }
  return data;
}

export async function updateDefaultProfile(profileInput: string): Promise<UserOut> {
  const res = await fetch(`${API_BASE_URL}/api/auth/default-profile`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_input: profileInput }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to update default profile handle.');
  }
  return data;
}

export async function getGitHubOAuthUrl(): Promise<GitHubOAuthUrlResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/github/url`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Could not retrieve GitHub OAuth URL.');
  }
  return data;
}

export async function exchangeGitHubOAuthCode(code: string, state: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/github/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, state }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'GitHub OAuth authorization failed.');
  }
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function disconnectGitHub(): Promise<{ message: string; user: UserOut }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/github/disconnect`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to disconnect GitHub account.');
  }
  return data;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; documentation: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Password reset request failed.');
  }
  return data;
}

// ============================================================================
// History & Recommendations API Functions
// ============================================================================

export async function getAnalysisHistory(username?: string, limit = 20, offset = 0): Promise<HistoryListResponse> {
  const params = new URLSearchParams();
  if (username) params.append('username', username);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const res = await fetch(`${API_BASE_URL}/api/history?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to retrieve analysis history.');
  }
  return data;
}

export async function getHistoryRunDetail(runId: number): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE_URL}/api/history/${runId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to retrieve run details.');
  }
  return data;
}

export async function compareHistoryRuns(currentId: number, previousId: number): Promise<RunComparisonResponse> {
  const res = await fetch(`${API_BASE_URL}/api/history/${currentId}/compare/${previousId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to compare analysis runs.');
  }
  return data;
}

export async function deleteHistoryRun(runId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/history/${runId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to delete history run.');
  }
}

export async function getTrackedRecommendations(status?: string, username?: string): Promise<TrackedRecommendationOut[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (username) params.append('username', username);

  const res = await fetch(`${API_BASE_URL}/api/recommendations?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to retrieve tracked recommendations.');
  }
  return data;
}

export async function updateRecommendationStatus(recId: number, status: 'open' | 'dismissed'): Promise<TrackedRecommendationOut> {
  const res = await fetch(`${API_BASE_URL}/api/recommendations/${recId}/status`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || 'Failed to update recommendation status.');
  }
  return data;
}
