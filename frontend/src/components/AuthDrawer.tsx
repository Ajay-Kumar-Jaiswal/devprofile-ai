import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
      const storedRedirect = sessionStorage.getItem('auth_redirect');
      if (storedRedirect) {
        sessionStorage.removeItem('auth_redirect');
      }
      const safeDestination =
        storedRedirect && storedRedirect.startsWith('/') && !storedRedirect.startsWith('//')
          ? storedRedirect
          : '/dashboard';
      navigate(safeDestination);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-card-title"
    >
      {/* Darkened backdrop without application blur */}
      <div
        className="fixed inset-0 bg-navy-950/80 transition-opacity duration-200"
        onClick={closeAuthDrawer}
        aria-hidden="true"
      />

      {/* Centered Authentication Card */}
      <div className="relative w-full max-w-[440px] my-auto bg-navy-900 border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-10 transition-all duration-200">
        {/* Subtle ambient accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Accessible Close Button */}
        <button
          type="button"
          onClick={closeAuthDrawer}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40 z-10"
          aria-label="Close authentication dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* 1. DevProfile.AI Brand Mark */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet">
              <Terminal className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-extrabold text-white text-lg tracking-tight">
              DevProfile<span className="text-violet-400">.AI</span>
            </span>
          </div>

          {/* 2. Concise Heading and Supporting Description */}
          <div className="text-center">
            <h2 id="auth-card-title" className="text-xl font-bold text-white tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {mode === 'signin'
                ? 'Sign in to access your portfolio audits, reports, and action roadmaps.'
                : 'Get automated portfolio scoring, AI feedback, and campus placement roadmaps.'}
            </p>
          </div>

          {/* 3. Sign In and Sign Up Tabs (Segmented Switch) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-navy-950/90 border border-slate-800/90 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                openAuthDrawer('signin');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg transition-all text-center ${
                mode === 'signin'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`py-2 px-3 rounded-lg transition-all text-center ${
                mode === 'signup'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* 4. Continue with GitHub Button */}
          <div>
            <button
              type="button"
              onClick={handleGitHubOAuth}
              disabled={isOauthLoading}
              className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-xl border border-slate-700/80 bg-navy-950/60 hover:bg-slate-800 hover:border-slate-600 text-white font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60 shadow-sm"
            >
              {isOauthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <GithubIcon className="w-4 h-4 text-white" />
              )}
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* GitHub OAuth Setup Notice Banner */}
          {oauthNotice && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">GitHub OAuth Setup Notice</p>
                <p className="text-[11px] text-amber-200/90">{oauthNotice}</p>
              </div>
            </div>
          )}

          {/* 5. Subtle Divider Labelled "OR CONTINUE WITH EMAIL" */}
          <div className="relative flex items-center justify-center my-3.5">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-navy-900 px-3 text-[10px] uppercase font-semibold tracking-wider text-slate-400 shrink-0">
              Or continue with email
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* 6. Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@campus.edu"
                  required
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-navy-950/60 border border-slate-700/70 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>

            {/* 6. Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                {mode === 'signup' && (
                  <span className="text-[10px] text-slate-400">Min. 8 characters</span>
                )}
                {mode === 'signin' && (
                  <Link
                    to="/forgot-password"
                    onClick={closeAuthDrawer}
                    className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
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
                  minLength={mode === 'signup' ? 8 : undefined}
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-950/60 border border-slate-700/70 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 7. Existing Name and Additional Fields for Registration */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full name <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Developer"
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-navy-950/60 border border-slate-700/70 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    GitHub handle or profile URL <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <GithubIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={defaultProfile}
                      onChange={(e) => setDefaultProfile(e.target.value)}
                      placeholder="e.g. octocat or https://github.com/octocat"
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-navy-950/60 border border-slate-700/70 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    You can also enter or analyze any GitHub profile after signing in.
                  </p>
                </div>
              </>
            )}

            {/* 8. Existing Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 px-4 mt-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle hover:shadow-glow-violet flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer"
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

          {/* 9. Existing Links for Switching Between Sign-In and Sign-Up */}
          <div className="pt-3.5 border-t border-slate-800/80 text-center text-xs text-slate-400">
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
                  className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4 transition-colors"
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
                  className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4 transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* 10. Existing Password Recovery Link */}
          {mode === 'signin' && (
            <div className="text-center pt-0.5">
              <Link
                to="/forgot-password"
                onClick={closeAuthDrawer}
                className="text-xs text-slate-400 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
              >
                <span>Forgot your password?</span>
                <span className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4">Reset it here</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
