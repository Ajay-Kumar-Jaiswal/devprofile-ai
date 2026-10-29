import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGitHubOAuthUrl, ApiError } from '../services/api';
import { GithubIcon } from '../components/GithubIcon';
import {
  Terminal,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Info,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawRedirect = searchParams.get('redirect');
  const targetRedirect =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GitHub OAuth state
  const [isOauthLoading, setIsOauthLoading] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(cleanEmail, password);
      navigate(targetRedirect);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubOAuth = async () => {
    setIsOauthLoading(true);
    setOauthNotice(null);

    try {
      const data = await getGitHubOAuthUrl();
      if (data.is_configured && data.auth_url) {
        if (targetRedirect && targetRedirect !== '/dashboard') {
          sessionStorage.setItem('auth_redirect', targetRedirect);
        }
        window.location.href = data.auth_url;
      } else {
        setOauthNotice(
          data.setup_instructions ||
            'GitHub OAuth is currently unconfigured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env to enable GitHub login.'
        );
      }
    } catch (err: any) {
      setOauthNotice('Could not connect to authentication service. Verify backend is running.');
    } finally {
      setIsOauthLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-transparent flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      {/* Centered Authentication Card */}
      <div className="relative w-full max-w-[440px] bg-[#101723]/65 backdrop-blur-xl border border-[rgba(148,163,184,0.18)] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden transition-all duration-200 animate-fadeIn">
        {/* Subtle decorative ambient glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="p-6 sm:p-8 space-y-5">
          {/* 1. DevProfile.AI Brand Mark */}
          <div className="flex items-center justify-center gap-2.5">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-navy-950 border border-[rgba(148,163,184,0.18)] group-hover:border-violet-500/50 flex items-center justify-center text-violet-400 transition-colors shadow-subtle">
                <Terminal className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                DevProfile<span className="text-violet-400">.AI</span>
              </span>
            </Link>
          </div>

          {/* 2. Concise Heading and Supporting Description */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Sign in to access your portfolio audits, reports, and action roadmaps.
            </p>
          </div>

          {/* 3. Segmented Switch / Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-navy-950/90 border border-[rgba(148,163,184,0.18)] text-xs font-semibold">
            <button
              type="button"
              className="py-2 px-3 rounded-lg bg-violet-600 text-white shadow-sm text-center"
            >
              Sign In
            </button>
            <Link
              to={targetRedirect && targetRedirect !== '/dashboard' ? `/signup?redirect=${encodeURIComponent(targetRedirect)}` : "/signup"}
              className="py-2 px-3 rounded-lg text-slate-400 hover:text-slate-200 transition-colors text-center"
            >
              Sign Up
            </Link>
          </div>

          {/* 4. Continue with GitHub Button */}
          <div>
            <button
              type="button"
              onClick={handleGitHubOAuth}
              disabled={isOauthLoading}
              className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-xl border border-[rgba(148,163,184,0.18)] bg-navy-950/60 hover:bg-slate-800 hover:border-slate-600 text-white font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60 shadow-sm"
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
            <div className="border-t border-[rgba(148,163,184,0.18)] w-full" />
            <span className="bg-navy-900 px-3 text-[10px] uppercase font-semibold tracking-wider text-slate-400 shrink-0">
              Or continue with email
            </span>
            <div className="border-t border-[rgba(148,163,184,0.18)] w-full" />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* 6. Form with Email, Password */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-navy-950/60 border border-[rgba(148,163,184,0.18)] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-950/60 border border-[rgba(148,163,184,0.18)] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
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

            {/* 8. Existing Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 px-4 mt-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 9. Existing Links for Switching Between Sign-In and Sign-Up */}
          <div className="pt-3.5 border-t border-[rgba(148,163,184,0.18)] text-center text-xs text-slate-400">
            <p>
              Don't have an account?{' '}
              <Link
                to={targetRedirect && targetRedirect !== '/dashboard' ? `/signup?redirect=${encodeURIComponent(targetRedirect)}` : "/signup"}
                className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4 transition-colors"
              >
                Create one now
              </Link>
            </p>
          </div>

          {/* 10. Existing Password Recovery Link */}
          <div className="text-center pt-0.5">
            <Link
              to="/forgot-password"
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              <span>Forgot your password?</span>
              <span className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4">Reset it here</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Demo prompt */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Need a quick demonstration?{' '}
        <Link to="/dashboard?demo=true" className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4">
          Try offline placement demo mode
        </Link>
      </p>
    </div>
  );
};
