import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserOut, RegisterResponse, AuthResponse, ConfirmDeleteAccountResponse } from '../types/api';
import { getMe, loginUser, registerUser, logoutUser, verifyOtp, confirmDeleteAccount } from '../services/api';

interface AuthContextType {
  user: UserOut | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string, defaultProfile?: string, termsAccepted?: boolean) => Promise<RegisterResponse>;
  verifyEmailOtp: (email: string, otp: string) => Promise<AuthResponse>;
  deleteAccount: (otp: string) => Promise<ConfirmDeleteAccountResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserOut | null>;
  updateUser: (updatedUser: UserOut) => void;
  isAuthDrawerOpen: boolean;
  authDrawerMode: 'signin' | 'signup';
  openAuthDrawer: (mode?: 'signin' | 'signup') => void;
  closeAuthDrawer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearSessionAnalysisCache(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('devprofile_analysis_cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Failed to clear session cache:', e);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserOut | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState<boolean>(false);
  const [authDrawerMode, setAuthDrawerMode] = useState<'signin' | 'signup'>('signin');

  const openAuthDrawer = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthDrawerMode(mode);
    setIsAuthDrawerOpen(true);
  };

  const closeAuthDrawer = () => {
    setIsAuthDrawerOpen(false);
  };

  const refreshUser = async (): Promise<UserOut | null> => {
    try {
      const data = await getMe();
      setUser(data);
      return data;
    } catch {
      setUser(null);
      clearSessionAnalysisCache();
      return null;
    }
  };

  const updateUser = (updatedUser: UserOut) => {
    setUser(updatedUser);
  };

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((data) => {
        if (mounted) setUser(data);
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          clearSessionAnalysisCache();
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    // Clear previous session analysis cache so login starts fresh without stale recommendations
    clearSessionAnalysisCache();
    const res = await loginUser(email, pass);
    setUser(res.user);
    closeAuthDrawer();
  };

  const register = async (
    email: string,
    pass: string,
    name?: string,
    defaultProfile?: string,
    termsAccepted: boolean = true
  ): Promise<RegisterResponse> => {
    clearSessionAnalysisCache();
    const res = await registerUser(email, pass, name, defaultProfile, termsAccepted);
    if (!res.requires_verification && res.user) {
      setUser(res.user);
      closeAuthDrawer();
    }
    return res;
  };

  const verifyEmailOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    clearSessionAnalysisCache();
    const res = await verifyOtp(email, otp);
    setUser(res.user);
    closeAuthDrawer();
    return res;
  };

  const deleteAccount = async (otp: string): Promise<ConfirmDeleteAccountResponse> => {
    try {
      const res = await confirmDeleteAccount(otp);
      return res;
    } finally {
      clearSessionAnalysisCache();
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      clearSessionAnalysisCache();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        verifyEmailOtp,
        deleteAccount,
        logout,
        refreshUser,
        updateUser,
        isAuthDrawerOpen,
        authDrawerMode,
        openAuthDrawer,
        closeAuthDrawer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
