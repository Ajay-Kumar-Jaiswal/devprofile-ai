import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateDefaultProfile, ApiError } from '../services/api';
import { GithubIcon } from '../components/GithubIcon';
import { Terminal, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) {
      setError('Please provide a GitHub username or profile link.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedUser = await updateDefaultProfile(clean);
      await refreshUser();
      const targetUser = updatedUser.default_profile_username || clean;
      navigate(`/dashboard?analyze=${encodeURIComponent(targetUser)}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Validation failed. Enter a valid GitHub username or profile URL.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="inline-flex h-12 w-12 rounded-2xl bg-navy-950 border border-slate-700/80 items-center justify-center text-violet-400 shadow-subtle mx-auto">
          <Terminal className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Welcome to DevProfile AI{user?.full_name ? `, ${user.full_name}` : ''}!
        </h2>
        <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
          Set your primary GitHub profile to unlock automated portfolio scoring, repository hygiene checks, and AI recommendations.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass-panel p-7 sm:p-8 rounded-2xl border border-slate-800 shadow-card space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your GitHub Username or Profile URL
              </label>
              <div className="relative">
                <GithubIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="e.g. octocat or https://github.com/octocat"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                />
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                <p className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Accepts direct handles: <code className="text-slate-300">octocat</code></span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Accepts profile URLs: <code className="text-slate-300">https://github.com/octocat/</code></span>
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Save Profile &amp; Analyze</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-800/80 pt-4 text-center">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Skip for now and enter manually on dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
