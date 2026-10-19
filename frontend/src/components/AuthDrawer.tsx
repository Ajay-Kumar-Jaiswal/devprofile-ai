import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGitHubOAuthUrl, ApiError } from '../services/api';
import { GithubIcon } from './GithubIcon';
import {
  Terminal,
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Info,
  ArrowRight,
} from 'lucide-react';

export const AuthDrawer: React.FC = () => {
  const {
    isAuthDrawerOpen,
    authDrawerMode,
    openAuthDrawer,
    closeAuthDrawer,
    login,
    register,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>(authDrawerMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultProfile, setDefaultProfile] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GitHub OAuth state
  const [isOauthLoading, setIsOauthLoading] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // Sync mode with context
  useEffect(() => {
    setMode(authDrawerMode);
    setError(null);
  }, [authDrawerMode, isAuthDrawerOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthDrawerOpen) {
        closeAuthDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthDrawerOpen, closeAuthDrawer]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isAuthDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAuthDrawerOpen]);

  if (!isAuthDrawerOpen) return null;

  const handleGitHubOAuth = async () => {
    setIsOauthLoading(true);
    setOauthNotice(null);
    setError(null);

    try {
      const res = await getGitHubOAuthUrl();
      if (res.is_configured && res.auth_url) {
        window.location.href = res.auth_url;
      } else {
        setOauthNotice(
          res.setup_instructions ||
            'GitHub OAuth is not configured on this backend. Configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env.'
        );
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to initialize GitHub OAuth authorization.');
    } finally {
      setIsOauthLoading(false);
    }
  };

  const validateForm = (): boolean => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please provide an email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Please enter a password.');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        await register(
          email.trim(),
          password,
          fullName.trim() || undefined,
          defaultProfile.trim() || undefined
        );
      } else {
        await login(email.trim(), password);
      }
      closeAuthDrawer();
      navigate('/dashboard');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={closeAuthDrawer}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-navy-950 border-l border-slate-800/90 shadow-2xl flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-in-out">
          {/* Top Navigation & Close Button */}
          <div className="p-6 sm:p-7 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight block">
                  DevProfile<span className="text-violet-400">.AI</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Authentication Panel
                </span>
              </div>
            </div>

            <button
              onClick={closeAuthDrawer}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              aria-label="Close authentication drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-7 space-y-6 flex-1">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-navy-900 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  openAuthDrawer('signin');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-violet-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  openAuthDrawer('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-violet-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {mode === 'signin' ? 'Welcome Back' : 'Create Developer Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {mode === 'signin'
                  ? 'Access your saved portfolio audits, recommendation progress, and reports.'
                  : 'Get automated portfolio scoring, AI feedback, and campus placement roadmaps.'}
              </p>
            </div>

            {/* GitHub OAuth Button */}
            <div>
              <button
                type="button"
                onClick={handleGitHubOAuth}
                disabled={isOauthLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-700 bg-navy-900/90 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60"
              >
                {isOauthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <GithubIcon className="w-4 h-4 text-white" />
                )}
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* GitHub OAuth unconfigured notice */}
            {oauthNotice && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 leading-relaxed">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">GitHub OAuth Setup Notice</p>
                  <p className="text-[11px] text-amber-200/90">{oauthNotice}</p>
                </div>
              </div>
            )}

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-navy-950 px-3 text-[11px] uppercase tracking-wider text-slate-400 shrink-0 font-medium">
                Or with email
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name (optional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Developer"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@campus.edu"
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  {mode === 'signup' && (
                    <span className="text-[10px] text-slate-400">Min. 8 characters</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GitHub Handle or Profile URL (optional)
                  </label>
                  <div className="relative">
                    <GithubIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={defaultProfile}
                      onChange={(e) => setDefaultProfile(e.target.value)}
                      placeholder="e.g. octocat or https://github.com/octocat"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    You can also enter or analyze any GitHub profile after signing in.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle hover:shadow-glow-violet flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note inside drawer */}
          <div className="p-6 border-t border-slate-800/80 bg-navy-950/60 text-center text-xs text-slate-400">
            {mode === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    openAuthDrawer('signup');
                    setError(null);
                  }}
                  className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    openAuthDrawer('signin');
                    setError(null);
                  }}
                  className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
