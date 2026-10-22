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
  Briefcase,
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

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Terminal },
    { to: '/internships', label: 'Internships', icon: Briefcase },
    { to: '/history', label: 'History', icon: History },
    { to: '/recommendations', label: 'Progress', icon: ListChecks },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-navy-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet transition-transform group-hover:scale-105 shrink-0">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  DevProfile AI
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links for Authenticated Users */}
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

        {/* Right controls: Demo button & Account state / Navigation Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
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

          {/* Single User Account & Navigation Menu */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                ref={menuButtonRef}
                id="user-menu-button"
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-controls="user-menu-dropdown"
                aria-label="User navigation menu"
                className="flex items-center gap-2 sm:gap-2.5 p-1.5 pr-2 sm:pr-3 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors text-xs text-left cursor-pointer"
              >
                {user.connected_github?.avatar_url ? (
                  <img
                    src={user.connected_github.avatar_url}
                    alt={user.connected_github.github_login}
                    className="w-7 h-7 rounded-lg border border-slate-700 shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                    {(user.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}

                <div className="hidden sm:block">
                  <span className="font-semibold text-white block text-xs truncate max-w-[120px]">
                    {user.full_name || user.email?.split('@')[0] || user.connected_github?.github_login}
                  </span>
                  {user.connected_github && (
                    <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[120px]">
                      @{user.connected_github.github_login}
                    </span>
                  )}
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-violet-400' : ''}`} />
              </button>

              {/* Single Navigation & Profile Dropdown */}
              {userMenuOpen && (
                <div
                  id="user-menu-dropdown"
                  role="menu"
                  aria-labelledby="user-menu-button"
                  className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-navy-900 border border-slate-800 shadow-2xl py-2 z-50 text-xs animate-fadeIn origin-top-right"
                >
                  <div className="px-4 py-2 border-b border-slate-800/80">
                    <p className="font-semibold text-white truncate">{user.full_name || 'Developer'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email || 'GitHub OAuth Account'}</p>
                    {user.connected_github && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono truncate">
                        <GithubIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">Connected as @{user.connected_github.github_login}</span>
                      </div>
                    )}
                  </div>

                  <div className="py-1">
                    {navLinks.map((link) => {
                      const isActive = location.pathname === link.to;
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.to}
                          to={link.to}
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-4 py-2 transition-colors ${
                            isActive
                              ? 'bg-violet-600/15 text-violet-300 font-semibold border-l-2 border-violet-500'
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
                          ? 'bg-violet-600/15 text-violet-300 font-semibold border-l-2 border-violet-500'
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
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => openAuthDrawer('signin')}
                className="px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuthDrawer('signup')}
                className="px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-subtle hover:shadow-glow-violet cursor-pointer"
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
