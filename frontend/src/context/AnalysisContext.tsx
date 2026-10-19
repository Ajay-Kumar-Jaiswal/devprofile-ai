import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { AnalysisResponse, AIAnalysisEnvelope } from '../types/api';
import { useAuth } from './AuthContext';

interface CachedStorageData {
  userId: number | null;
  activeUsername: string;
  analyses: Record<string, AnalysisResponse>;
  timestamp: number;
}

interface AnalysisContextType {
  currentAnalysis: AnalysisResponse | null;
  setCurrentAnalysis: (data: AnalysisResponse | null) => void;
  saveAnalysis: (data: AnalysisResponse) => void;
  getCachedAnalysis: (username?: string | null) => AnalysisResponse | null;
  clearAnalysis: () => void;
  updateAiAnalysis: (aiEnvelope: AIAnalysisEnvelope) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

const STORAGE_PREFIX = 'devprofile_analysis_cache_';
const MAX_CACHED_ANALYSES = 5;

function getStorageKey(userId?: number | null): string {
  return `${STORAGE_PREFIX}${userId ?? 'anon'}`;
}

function loadCacheFromSession(userId?: number | null): CachedStorageData | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = sessionStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.analyses &&
      typeof parsed.analyses === 'object'
    ) {
      return parsed as CachedStorageData;
    }
  } catch (err) {
    console.warn('Failed to read analysis cache from sessionStorage:', err);
  }
  return null;
}

function saveCacheToSession(userId: number | null | undefined, data: CachedStorageData): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save analysis cache to sessionStorage:', err);
  }
}

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  // In-memory cache of analyses keyed by username.toLowerCase()
  const cacheRef = useRef<Record<string, AnalysisResponse>>({});
  const prevUserIdRef = useRef<number | null>(currentUserId);

  // Initialize currentAnalysis from sessionStorage if available
  const [currentAnalysis, setCurrentAnalysisState] = useState<AnalysisResponse | null>(() => {
    const sessionCache = loadCacheFromSession(currentUserId);
    if (sessionCache && sessionCache.activeUsername) {
      const activeKey = sessionCache.activeUsername.toLowerCase().trim();
      const cached = sessionCache.analyses[activeKey];
      if (cached && cached.username && cached.portfolio_score) {
        cacheRef.current = { ...sessionCache.analyses };
        return cached;
      }
    }
    return null;
  });

  // Handle user authentication boundary changes (login / logout / switch)
  useEffect(() => {
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;

      // When switching users or logging out, reload or clear cache
      const sessionCache = loadCacheFromSession(currentUserId);
      if (sessionCache && sessionCache.activeUsername) {
        const activeKey = sessionCache.activeUsername.toLowerCase().trim();
        const cached = sessionCache.analyses[activeKey];
        if (cached && cached.username && cached.portfolio_score) {
          cacheRef.current = { ...sessionCache.analyses };
          setCurrentAnalysisState(cached);
          return;
        }
      }

      cacheRef.current = {};
      setCurrentAnalysisState(null);
    }
  }, [currentUserId]);

  const saveAnalysis = useCallback(
    (data: AnalysisResponse) => {
      if (!data || !data.username) return;
      const key = data.username.toLowerCase().trim();

      // Update in-memory cache
      cacheRef.current[key] = data;

      // Enforce max cached items by pruning oldest if needed
      const keys = Object.keys(cacheRef.current);
      if (keys.length > MAX_CACHED_ANALYSES) {
        const excess = keys.slice(0, keys.length - MAX_CACHED_ANALYSES);
        for (const k of excess) {
          if (k !== key) {
            delete cacheRef.current[k];
          }
        }
      }

      // Update active state
      setCurrentAnalysisState(data);

      // Persist to sessionStorage
      const payload: CachedStorageData = {
        userId: currentUserId,
        activeUsername: data.username,
        analyses: { ...cacheRef.current },
        timestamp: Date.now(),
      };
      saveCacheToSession(currentUserId, payload);
    },
    [currentUserId]
  );

  const getCachedAnalysis = useCallback(
    (username?: string | null): AnalysisResponse | null => {
      // 1. If a specific username is requested
      if (username) {
        const key = username.toLowerCase().trim();
        if (cacheRef.current[key]) {
          return cacheRef.current[key];
        }

        const sessionCache = loadCacheFromSession(currentUserId);
        if (sessionCache?.analyses?.[key]) {
          const item = sessionCache.analyses[key];
          if (item && item.username && item.portfolio_score) {
            cacheRef.current[key] = item;
            return item;
          }
        }
        return null;
      }

      // 2. If no specific username requested, return active currentAnalysis
      if (currentAnalysis && currentAnalysis.username) {
        return currentAnalysis;
      }

      // 3. Fallback to activeUsername from sessionStorage
      const sessionCache = loadCacheFromSession(currentUserId);
      if (sessionCache?.activeUsername) {
        const activeKey = sessionCache.activeUsername.toLowerCase().trim();
        const item = sessionCache.analyses?.[activeKey];
        if (item && item.username && item.portfolio_score) {
          cacheRef.current[activeKey] = item;
          return item;
        }
      }

      return null;
    },
    [currentAnalysis, currentUserId]
  );

  const updateAiAnalysis = useCallback(
    (aiEnvelope: AIAnalysisEnvelope) => {
      setCurrentAnalysisState((prev) => {
        if (!prev) return null;
        const updated: AnalysisResponse = {
          ...prev,
          ai_analysis: aiEnvelope,
        };
        saveAnalysis(updated);
        return updated;
      });
    },
    [saveAnalysis]
  );

  const clearAnalysis = useCallback(() => {
    cacheRef.current = {};
    setCurrentAnalysisState(null);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(getStorageKey(currentUserId));
      }
    } catch (err) {
      console.warn('Failed to clear sessionStorage cache:', err);
    }
  }, [currentUserId]);

  const setCurrentAnalysis = useCallback(
    (data: AnalysisResponse | null) => {
      if (data) {
        saveAnalysis(data);
      } else {
        setCurrentAnalysisState(null);
      }
    },
    [saveAnalysis]
  );

  return (
    <AnalysisContext.Provider
      value={{
        currentAnalysis,
        setCurrentAnalysis,
        saveAnalysis,
        getCachedAnalysis,
        clearAnalysis,
        updateAiAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = (): AnalysisContextType => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
