import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserOut } from '../types/api';
import { getMe, loginUser, registerUser, logoutUser } from '../services/api';

interface AuthContextType {
  user: UserOut | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string, defaultProfile?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserOut | null>;
  isAuthDrawerOpen: boolean;
  authDrawerMode: 'signin' | 'signup';
  openAuthDrawer: (mode?: 'signin' | 'signup') => void;
  closeAuthDrawer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((data) => {
        if (mounted) setUser(data);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginUser(email, pass);
    setUser(res.user);
    closeAuthDrawer();
  };

  const register = async (email: string, pass: string, name?: string, defaultProfile?: string) => {
    const res = await registerUser(email, pass, name, defaultProfile);
    setUser(res.user);
    closeAuthDrawer();
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
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
        console.warn('Failed to clear session cache on logout:', e);
      }
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
        logout,
        refreshUser,
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
