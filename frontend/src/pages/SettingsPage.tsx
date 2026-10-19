import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  updateDefaultProfile,
  disconnectGitHub,
  ApiError,
} from '../services/api';
import { GithubIcon } from '../components/GithubIcon';
import {
  Settings,
  User,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile handle state
  const [defaultHandle, setDefaultHandle] = useState(user?.default_profile_username || '');
  const [isUpdatingHandle, setIsUpdatingHandle] = useState(false);
  const [handleSuccess, setHandleSuccess] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);

  // Disconnect GitHub state
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [disconnectSuccess, setDisconnectSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    setDefaultHandle(user?.default_profile_username || '');
  }, [user?.default_profile_username]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultHandle.trim()) return;

    setIsUpdatingHandle(true);
    setHandleSuccess(null);
    setHandleError(null);

    try {
      const updated = await updateDefaultProfile(defaultHandle.trim());
      await refreshUser();
      setDefaultHandle(updated.default_profile_username || defaultHandle.trim());
      setHandleSuccess('Default analyzed profile handle updated successfully.');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setHandleError(err.detail);
      } else {
        setHandleError('Failed to update profile handle.');
      }
    } finally {
      setIsUpdatingHandle(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your linked GitHub account?')) {
      return;
    }

    setIsDisconnecting(true);
    setDisconnectError(null);
    setDisconnectSuccess(null);

    try {
      const res = await disconnectGitHub();
      await refreshUser();
      setDefaultHandle('');
      setDisconnectSuccess(res.message || 'GitHub account disconnected safely.');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setDisconnectError(err.detail);
      } else {
        setDisconnectError('Could not disconnect GitHub account.');
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-slate-100">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-violet-400" />
          <span>Account Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your connected GitHub identity, default profile targets, and security preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Account Identity Overview */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-violet-400" />
            <span>Developer Account Identity</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px] mb-0.5">Email Address</span>
              <span className="font-semibold text-white">{user?.email || 'Authenticated via GitHub OAuth'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px] mb-0.5">Full Name</span>
              <span className="font-semibold text-white">{user?.full_name || 'Not configured'}</span>
            </div>
          </div>
        </div>

        {/* 2. Connected GitHub Account */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <GithubIcon className="w-4 h-4 text-violet-400" />
              <span>Connected GitHub Identity</span>
            </h2>

            {user?.connected_github ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Connected</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                Unlinked
              </span>
            )}
          </div>

          {disconnectError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{disconnectError}</span>
            </div>
          )}

          {disconnectSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{disconnectSuccess}</span>
            </div>
          )}

          {user?.connected_github ? (
            <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {user.connected_github.avatar_url && (
                  <img
                    src={user.connected_github.avatar_url}
                    alt={user.connected_github.github_login}
                    className="w-12 h-12 rounded-xl border border-slate-700"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      @{user.connected_github.github_login}
                    </span>
                    {user.connected_github.html_url && (
                      <a
                        href={user.connected_github.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Numeric GitHub ID: <code className="text-slate-300 font-mono">{user.connected_github.github_user_id}</code> (stable identifier)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDisconnectGitHub}
                disabled={isDisconnecting}
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold self-start sm:self-auto transition-colors disabled:opacity-60"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              No GitHub account is currently linked. You can sign in using GitHub OAuth anytime to link your verified identity.
            </p>
          )}
        </div>

        {/* 3. Default Analyzed Profile Target */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <GithubIcon className="w-4 h-4 text-violet-400" />
            <span>Default Analyzed Profile</span>
          </h2>
          <p className="text-xs text-slate-400">
            Set the default GitHub username or URL that automatically loads when opening the dashboard.
          </p>

          {handleSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{handleSuccess}</span>
            </div>
          )}

          {handleError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{handleError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={defaultHandle}
              onChange={(e) => setDefaultHandle(e.target.value)}
              placeholder="e.g. octocat or https://github.com/octocat"
              className="flex-1 px-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <button
              type="submit"
              disabled={isUpdatingHandle}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 shrink-0"
            >
              {isUpdatingHandle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Update Target</span>}
            </button>
          </form>
        </div>

        {/* 4. Session & Sign Out */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Active Session</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Securely sign out of your current session on this device.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
