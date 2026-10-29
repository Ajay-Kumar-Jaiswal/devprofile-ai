import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Sparkles,
  Settings,
  LogOut,
  History,
  ListChecks,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Compass,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { checkBackendHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onLoadDemo?: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onLoadDemo, isLoading = false }) => {
  const { user, logout, openAuthDrawer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Continue running internal backend health checks without exposing technical badges in the UI
    checkBackendHealth().catch((err) => {
      console.warn('Backend health check diagnostic:', err?.message || err);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-close menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Handle Escape key to close menu and restore focus to button
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && userMenuOpen) {
        setUserMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/');
  };

  // Top header nav links (matching primary destinations)
  const topNavLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/internships', label: 'Internships' },
    { to: '/progress', label: 'Progress' },
    { to: '/ai-insights', label: 'AI Insights' },
    { to: '/improvements', label: 'Improvements' },
  ];

  // Dropdown items (including History and Settings)
  const dropdownNavLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: ChevronRight },
    { to: '/internships', label: 'Internships', icon: Briefcase },
    { to: '/progress', label: 'Progress', icon: ListChecks },
    { to: '/ai-insights', label: 'AI Insights', icon: Sparkles },
    { to: '/improvements', label: 'Improvements', icon: Compass },
    { to: '/history', label: 'History', icon: History },
  ];

  const isLinkActive = (to: string) => {
    if (to === '/progress') {
      return location.pathname === '/progress' || location.pathname === '/recommendations';
    }
    return location.pathname === to;
  };

  const isLanding = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 w-full max-w-full transition-colors border-b border-[#232736]/70 bg-[#0B0D12]/85 backdrop-blur-md">
      <div className={`max-w-[1360px] w-full mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 transition-all ${isLanding ? 'h-[68px] sm:h-20' : 'h-16'}`}>
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="h-9 w-9 sm:h-9.5 sm:w-9.5 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-subtle bg-[#101723]/60 backdrop-blur-md border-[rgba(148,163,184,0.18)] group-hover:border-violet-500">
              <Terminal className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-200 group-hover:text-violet-300 transition-colors" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-slate-100 transition-colors">
                  DevProfile
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  AI
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links for Authenticated Users */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
              {topNavLinks.map((link) => {
                const isActive = isLinkActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-2.5 lg:px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-violet-900/60 text-white border border-violet-500/50 font-semibold shadow-subtle'
                        : 'text-slate-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right controls: Demo button & Account state / Navigation Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Demo Button (if handler provided and not on landing page) */}
          {onLoadDemo && !isLanding && (
            <button
              onClick={onLoadDemo}
              disabled={isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#101723]/60 backdrop-blur-md hover:bg-[#1A2333]/70 text-slate-200 hover:text-white border border-slate-400/20 hover:border-violet-500/40 transition-all duration-180 shadow-subtle disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo</span>
            </button>
          )}

          {/* Single User Account & Navigation Menu */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative z-50" ref={menuRef}>
                <button
                  ref={menuButtonRef}
                  id="user-menu-button"
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-controls="user-menu-dropdown"
                  aria-label="User navigation menu"
                  className="flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 pr-2 sm:pr-3 rounded-xl bg-[#101723]/60 backdrop-blur-md border border-slate-400/20 hover:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all text-xs text-left cursor-pointer"
                >
                  {/* Purple avatar initial or avatar image */}
                  {user.connected_github?.avatar_url ? (
                    <img
                      src={user.connected_github.avatar_url}
                      alt={user.connected_github.github_login}
                      className="w-7 h-7 rounded-lg border border-border shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-violet-600 text-white border border-violet-400/40 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      {(user.full_name || user.email || 'A')[0].toUpperCase()}
                    </div>
                  )}

                  <div className="hidden sm:block">
                    <span className="font-semibold text-white block text-xs truncate max-w-[120px]">
                      {user.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Ajay'}
                    </span>
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-violet-400' : ''}`} />
                </button>

                {/* Profile & Navigation Dropdown (Overlays cleanly above dashboard content) */}
                {userMenuOpen && (
                  <div
                    id="user-menu-dropdown"
                    role="menu"
                    aria-labelledby="user-menu-button"
                    className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#101723]/95 border border-slate-400/20 shadow-2xl py-2 z-50 text-xs animate-fadeIn origin-top-right backdrop-blur-2xl"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-800/80">
                      <p className="font-bold text-white truncate text-xs">{user.full_name || 'Ajay'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email || 'ajaykumarjaiswal303038@gmail.com'}</p>
                      {user.connected_github && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono truncate">
                          <GithubIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">Connected as @{user.connected_github.github_login}</span>
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      {dropdownNavLinks.map((link) => {
                        const isActive = isLinkActive(link.to);
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.to}
                            to={link.to}
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-4 py-2 transition-colors ${
                              isActive
                                ? 'bg-violet-900/40 text-violet-300 font-semibold border-l-2 border-violet-500'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                            <span>{link.label}</span>
                          </Link>
                        );
                      })}

                      <Link
                        to="/settings"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-4 py-2 transition-colors ${
                          location.pathname === '/settings'
                            ? 'bg-violet-900/40 text-violet-300 font-semibold border-l-2 border-violet-500'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Settings className={`w-4 h-4 ${location.pathname === '/settings' ? 'text-violet-400' : 'text-slate-400'}`} />
                        <span>Account Settings</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-400 hover:bg-rose-500/10 text-left font-semibold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => openAuthDrawer('signin')}
                className={`transition-all cursor-pointer font-medium ${
                  isLanding
                    ? 'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-200 hover:text-white border border-[rgba(148,163,184,0.18)] bg-[#101723]/60 backdrop-blur-md hover:bg-[#1A2333]/70'
                    : 'px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuthDrawer('signup')}
                className={`transition-all cursor-pointer font-semibold ${
                  isLanding
                    ? 'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-[#7C3AED] hover:bg-[#8B5CF6] text-white shadow-sm border border-violet-500/30'
                    : 'px-3 sm:px-3.5 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 text-white shadow-subtle border border-violet-500/30'
                }`}
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
