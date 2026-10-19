import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, AlertCircle, Sparkles, RefreshCw, Settings, LogOut, History, ListChecks, ChevronDown, Server, Cpu } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { checkBackendHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { HealthResponse } from '../types/api';

interface NavbarProps {
  onLoadDemo?: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onLoadDemo, isLoading = false }) => {
  const { user, logout, openAuthDrawer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    let mounted = true;
    checkBackendHealth()
      .then((data) => {
        if (mounted) {
          setHealth(data);
          setIsBackendHealthy(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsBackendHealthy(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const refreshHealth = () => {
    setIsBackendHealthy(null);
    checkBackendHealth()
      .then((data) => {
        setHealth(data);
        setIsBackendHealthy(true);
      })
      .catch(() => {
        setIsBackendHealthy(false);
      });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/history', label: 'History' },
    { to: '/recommendations', label: 'Progress' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-navy-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet transition-transform group-hover:scale-105">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  DevProfile AI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  SaaS
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Links for Authenticated Users */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right controls: Health pill & Account state */}
        <div className="flex items-center gap-3">
          {/* Health indicator & Decoupled Service Status popover */}
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => setStatusPopoverOpen((prev) => !prev)}
              className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isBackendHealthy === true
                  ? health?.github_rate_limited
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                  : isBackendHealthy === false
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/15'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
              }`}
              title="Click to view detailed health for Backend, GitHub API, and Groq AI"
              aria-expanded={statusPopoverOpen}
            >
              {isBackendHealthy === true ? (
                <>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      health?.github_rate_limited ? 'bg-amber-400' : 'bg-emerald-400'
                    } animate-pulse`}
                  />
                  <span>
                    {health?.github_rate_limited ? 'GitHub Rate-Limited' : 'Service Status'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </>
              ) : isBackendHealthy === false ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Backend Offline</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                  <span>Auditing APIs...</span>
                </>
              )}
            </button>

            {/* Dropdown breakdown separating backend from external GitHub and Groq */}
            {statusPopoverOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-navy-900 border border-slate-800 shadow-2xl p-4 space-y-3 z-50 text-xs animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-semibold text-white">System Service Status</span>
                  <button
                    type="button"
                    onClick={refreshHealth}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Refresh Service Status"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                {/* Backend Status */}
                <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-navy-950/60 border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-violet-400" />
                    <div>
                      <p className="font-medium text-slate-200">FastAPI Backend</p>
                      <p className="text-[10px] text-slate-400">Core evaluation engine (v2.0.0)</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      isBackendHealthy
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isBackendHealthy ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* GitHub API Status */}
                <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-navy-950/60 border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <GithubIcon className="w-3.5 h-3.5 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-200">GitHub REST API</p>
                      <p className="text-[10px] text-slate-400">
                        {health?.github_api_status || 'External data provider'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      health?.github_rate_limited
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : health?.github_authenticated
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {health?.github_rate_limited
                      ? 'Rate-Limited'
                      : health?.github_authenticated
                      ? 'Authenticated'
                      : 'Public (60/hr)'}
                  </span>
                </div>

                {/* Groq AI Status */}
                <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-navy-950/60 border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-violet-400" />
                    <div>
                      <p className="font-medium text-slate-200">Groq AI Engine</p>
                      <p className="text-[10px] text-slate-400">
                        {health?.groq_api_status || 'Qualitative synthesis model'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      health?.groq_configured
                        ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {health?.groq_configured ? 'Active' : 'Fallback'}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 text-center pt-1">
                  Backend server health and external API quotas are independently audited.
                </p>
              </div>
            )}
          </div>


          {/* Quick Demo Button (if handler provided) */}
          {onLoadDemo && (
            <button
              onClick={onLoadDemo}
              disabled={isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-subtle disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Demo</span>
            </button>
          )}

          {/* User Account Menu / Auth Links */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 transition-colors text-xs text-left"
              >
                {user.connected_github?.avatar_url ? (
                  <img
                    src={user.connected_github.avatar_url}
                    alt={user.connected_github.github_login}
                    className="w-7 h-7 rounded-lg border border-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/40 flex items-center justify-center font-bold text-xs">
                    {(user.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}

                <div className="hidden sm:block">
                  <span className="font-semibold text-white block text-xs truncate max-w-[120px]">
                    {user.full_name || user.email?.split('@')[0] || user.connected_github?.github_login}
                  </span>
                  {user.connected_github && (
                    <span className="text-[10px] text-slate-400 block font-mono">
                      @{user.connected_github.github_login}
                    </span>
                  )}
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-navy-900 border border-slate-800 shadow-2xl py-2 z-50 text-xs animate-fadeIn">
                  <div className="px-4 py-2 border-b border-slate-800/80">
                    <p className="font-semibold text-white truncate">{user.full_name || 'Developer'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email || 'GitHub OAuth Account'}</p>
                    {user.connected_github && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <GithubIcon className="w-3 h-3" />
                        <span>Connected as @{user.connected_github.github_login}</span>
                      </div>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <Terminal className="w-4 h-4 text-violet-400" />
                      <span>Dashboard</span>
                    </Link>

                    <Link
                      to="/history"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <History className="w-4 h-4 text-indigo-400" />
                      <span>Analysis History</span>
                    </Link>

                    <Link
                      to="/recommendations"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <ListChecks className="w-4 h-4 text-emerald-400" />
                      <span>Action Progress</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-400 hover:bg-rose-500/10 text-left font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuthDrawer('signin')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuthDrawer('signup')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-subtle hover:shadow-glow-violet"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
