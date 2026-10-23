import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  updateDefaultProfile,
  disconnectGitHub,
  getGitHubLinkUrl,
  changePassword,
  setupCredentials,
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
  Lock,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const hasLocalPassword = Boolean(user?.has_password);

  // Profile handle state
  const [defaultHandle, setDefaultHandle] = useState(user?.default_profile_username || '');
  const [isUpdatingHandle, setIsUpdatingHandle] = useState(false);
  const [handleSuccess, setHandleSuccess] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);

  // Link GitHub state
  const [isLinkingGitHub, setIsLinkingGitHub] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // Disconnect GitHub state
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [disconnectSuccess, setDisconnectSuccess] = useState<string | null>(null);

  // Security / Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Setup email/password credentials state
  // Explicit requirement: initialize email input as an empty string without prefilling
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [showSetupConfirmPassword, setShowSetupConfirmPassword] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  React.useEffect(() => {
    setDefaultHandle(user?.default_profile_username || '');
  }, [user?.default_profile_username]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get('github_linked');
    const login = params.get('login');
    const ghErr = params.get('github_error');

    if (linked === 'success') {
      setLinkSuccess(login ? `Successfully linked GitHub account @${login}.` : 'GitHub account linked successfully.');
      refreshUser();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (ghErr) {
      setLinkError(decodeURIComponent(ghErr));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshUser]);

  const handleLinkGitHub = async () => {
    if (isLinkingGitHub) return;
    setIsLinkingGitHub(true);
    setLinkError(null);
    setLinkSuccess(null);

    try {
      const res = await getGitHubLinkUrl();
      if (!res.is_configured || !res.auth_url) {
        setLinkError(
          res.setup_instructions ||
            'GitHub OAuth is not currently configured on this environment. Please configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env.'
        );
        return;
      }
      sessionStorage.setItem('oauth_action', 'link');
      sessionStorage.setItem('oauth_return_url', window.location.pathname);
      window.location.href = res.auth_url;
    } catch (err: any) {
      if (err instanceof ApiError) {
        setLinkError(err.detail);
      } else {
        setLinkError(err?.message || 'Failed to initiate GitHub account linking.');
      }
    } finally {
      setIsLinkingGitHub(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingPassword) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword;
    const cleanConfirm = confirmPassword;

    if (!cleanCurrent) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!cleanNew) {
      setPasswordError('Please enter your new password.');
      return;
    }

    if (cleanNew.length < 8) {
      setPasswordError('New password must be at least 8 characters in length.');
      return;
    }

    if (cleanNew === cleanCurrent) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    if (!cleanConfirm) {
      setPasswordError('Please confirm your new password.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await changePassword(cleanCurrent, cleanNew);
      setPasswordSuccess(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setPasswordError(err.detail);
      } else {
        setPasswordError(err?.message || 'Failed to update password. Please check your credentials.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSetupCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingUp) return;

    setSetupError(null);
    setSetupSuccess(null);

    const cleanEmail = setupEmail.trim();
    const cleanPassword = setupPassword;
    const cleanConfirm = setupConfirmPassword;

    if (!cleanEmail) {
      setSetupError('Please enter a valid email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setSetupError('Please enter a valid email format (e.g. name@example.com).');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 8) {
      setSetupError('Password must be at least 8 characters in length.');
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setSetupError('New password and confirmation do not match.');
      return;
    }

    setIsSettingUp(true);

    try {
      const res = await setupCredentials(cleanEmail, cleanPassword, cleanConfirm);
      if (res?.user) {
        updateUser(res.user);
      }
      await refreshUser();
      setSetupSuccess(res.message || 'Email and password successfully configured.');
      setSetupEmail('');
      setSetupPassword('');
      setSetupConfirmPassword('');
      setShowSetupPassword(false);
      setShowSetupConfirmPassword(false);
      setDisconnectError(null);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setSetupError(err.detail);
      } else {
        setSetupError(err?.message || 'Failed to establish credentials.');
      }
    } finally {
      setIsSettingUp(false);
    }
  };

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
    // Proactively verify credentials exist so user is not stranded with a raw block
    if (!hasLocalPassword || !user?.email) {
      setDisconnectError(
        'Cannot disconnect GitHub account: you must set an email and password first to prevent losing account access.'
      );
      const el = document.getElementById('security-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('setup-email-input')?.focus();
      return;
    }

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
        <div className="surface-card p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card space-y-4">
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
        <div className="surface-card p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card space-y-4">
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

          {/* Linking Feedback Notifications */}
          {linkSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{linkSuccess}</span>
            </div>
          )}

          {linkError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{linkError}</span>
            </div>
          )}

          {disconnectError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-relaxed">{disconnectError}</span>
              </div>
              {(!user?.has_password || !user?.email) && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('security-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Set Up Email & Password</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {disconnectSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{disconnectSuccess}</span>
            </div>
          )}

          {user?.connected_github && (!user?.has_password || !user?.email) && (
            <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-800/40 text-xs text-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-slate-100">Disconnection requires an email & password</span>
                  <p className="text-violet-300/80 text-[11px] mt-0.5">
                    Configure an email and password first so you retain access to your account and history after unlinking GitHub.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('security-section')?.scrollIntoView({ behavior: 'smooth' });
                  document.getElementById('setup-email-input')?.focus();
                }}
                className="px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-semibold whitespace-nowrap transition-colors self-start sm:self-center cursor-pointer"
              >
                Set Up Email & Password
              </button>
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
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold self-start sm:self-auto transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect GitHub'}
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-semibold text-white text-sm block">Connect Your GitHub Account</span>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    Link your verified GitHub profile to unlock automated portfolio indexing, repository sync, and personalized tech internship matches based on your actual repositories.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLinkGitHub}
                  disabled={isLinkingGitHub}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-subtle border border-violet-500/30 cursor-pointer disabled:opacity-50 whitespace-nowrap self-start sm:self-center"
                >
                  {isLinkingGitHub ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <GithubIcon className="w-4 h-4 text-white" />
                      <span>Link GitHub Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Default Analyzed Profile Target */}
        <div className="surface-card p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card space-y-4">
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

        {/* 4. Security */}
        <div id="security-section" className="surface-card p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-violet-400" />
              <span>Security</span>
            </h2>

            {!hasLocalPassword ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <GithubIcon className="w-3.5 h-3.5" />
                <span>Password Not Configured</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Email &amp; Password Configured</span>
              </span>
            )}
          </div>

          {!hasLocalPassword ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-1.5">
                <p className="text-xs text-slate-200 font-semibold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-violet-400" />
                  <span>Set Up Email &amp; Password</span>
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You currently authenticate using GitHub OAuth. Configure an email and password below to attach direct login credentials to your existing account. This enables direct sign-in and allows disconnecting GitHub safely without losing account data.
                </p>
              </div>

              {setupSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{setupSuccess}</span>
                </div>
              )}

              {setupError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{setupError}</span>
                </div>
              )}

              <form onSubmit={handleSetupCredentials} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      id="setup-email-input"
                      type="email"
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      placeholder="developer@example.com"
                      required
                      disabled={isSettingUp}
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      New Password
                    </label>
                    <span className="text-[10px] text-slate-400">Min. 8 characters</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showSetupPassword ? 'text' : 'password'}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={isSettingUp}
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword(!showSetupPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showSetupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showSetupConfirmPassword ? 'text' : 'password'}
                      value={setupConfirmPassword}
                      onChange={(e) => setSetupConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={isSettingUp}
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupConfirmPassword(!showSetupConfirmPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showSetupConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showSetupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSettingUp}
                    className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {isSettingUp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Configuring credentials...</span>
                      </>
                    ) : (
                      <span>Set Up Email &amp; Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-1.5">
                <p className="text-xs text-slate-200 font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-violet-400" />
                  <span>Change Password</span>
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Update your existing account password. Choose a strong new password of at least 8 characters.
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Current password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={isChangingPassword}
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      New password
                    </label>
                    <span className="text-[10px] text-slate-400">Min. 8 characters</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={isChangingPassword}
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={isChangingPassword}
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <span>Change Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* 5. Session & Sign Out */}
        <div className="surface-card p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-card flex items-center justify-between">
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
