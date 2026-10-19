import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGitHubOAuthUrl, ApiError } from '../services/api';
import { GithubIcon } from '../components/GithubIcon';
import { Terminal, Lock, Mail, User, Loader2, AlertCircle, Info, ArrowRight } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultProfile, setDefaultProfile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GitHub OAuth state
  const [isOauthLoading, setIsOauthLoading] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide an email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register(email, password, fullName || undefined, defaultProfile || undefined);
      // If default profile was provided, navigate to dashboard, else onboarding
      if (defaultProfile.trim()) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Failed to create account.');
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
        window.location.href = data.auth_url;
      } else {
        setOauthNotice(
          data.setup_instructions ||
            'GitHub OAuth is currently unconfigured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env to enable GitHub signup.'
        );
      }
    } catch (err: any) {
      setOauthNotice('Could not connect to authentication service.');
    } finally {
      setIsOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet transition-transform group-hover:scale-105">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            DevProfile AI
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
          Create your developer account
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass-panel p-7 sm:p-8 rounded-2xl border border-slate-800 shadow-card space-y-6">
          {/* GitHub OAuth Button */}
          <div>
            <button
              type="button"
              onClick={handleGitHubOAuth}
              disabled={isOauthLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-700 bg-navy-900/90 hover:bg-slate-800 text-white font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60"
            >
              {isOauthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <GithubIcon className="w-4 h-4 text-white" />
              )}
              <span>Sign up with GitHub</span>
            </button>
          </div>

          {oauthNotice && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">OAuth Notice</p>
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
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                />
              </div>
            </div>

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
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                You can also connect or change your profile handle anytime later.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-subtle hover:shadow-glow-violet flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
