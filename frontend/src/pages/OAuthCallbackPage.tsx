import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeGitHubOAuthCode, linkGitHubAccount, fetchProfileAnalysis, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import { Terminal, Loader2, Sparkles, AlertCircle, RefreshCw, Settings } from 'lucide-react';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { saveAnalysis } = useAnalysis();

  const [statusStep, setStatusStep] = useState<'exchanging' | 'analyzing' | 'complete' | 'error'>('exchanging');
  const [statusMessage, setStatusMessage] = useState('Verifying GitHub authorization...');
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState<boolean>(() => sessionStorage.getItem('oauth_action') === 'link');

  // Single-execution guard to prevent double-POST in React 18 StrictMode
  const hasRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    const errorParam = searchParams.get('error_description') || searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const linkingActive = sessionStorage.getItem('oauth_action') === 'link';
    setIsLinking(linkingActive);

    if (errorParam) {
      setStatusStep('error');
      setErrorMessage(
        errorParam === 'access_denied'
          ? 'GitHub OAuth authorization was canceled or denied.'
          : errorParam
      );
      sessionStorage.removeItem('oauth_action');
      return;
    }

    if (!code || !state) {
      setStatusStep('error');
      setErrorMessage('Missing OAuth authorization code or state parameter.');
      sessionStorage.removeItem('oauth_action');
      return;
    }

    // Ensure we only dispatch the single-use token exchange once
    if (hasRequestedRef.current) {
      return;
    }
    hasRequestedRef.current = true;

    const processOAuth = async () => {
      try {
        let authData;
        if (linkingActive) {
          setStatusMessage('Linking GitHub identity to your current account...');
          authData = await linkGitHubAccount(code, state);
          sessionStorage.removeItem('oauth_action');
        } else {
          setStatusMessage('Authorizing GitHub identity & session...');
          authData = await exchangeGitHubOAuthCode(code, state);
        }

        await refreshUser();

        const ghLogin = authData.user.connected_github?.github_login || authData.user.default_profile_username;
        setConnectedUsername(ghLogin || null);
        setStatusStep('analyzing');
        setStatusMessage(
          linkingActive
            ? `Successfully linked @${ghLogin}! Syncing profile data...`
            : `Connected as @${ghLogin}! Launching automated profile audit & AI analysis...`
        );

        // Automatically trigger initial analysis for the connected GitHub account
        if (ghLogin) {
          try {
            const initialResult = await fetchProfileAnalysis(ghLogin);
            saveAnalysis(initialResult);
          } catch (analysisErr) {
            console.warn('Initial automated analysis notice (session preserved):', analysisErr);
          }
        }

        setStatusStep('complete');
        if (linkingActive) {
          setStatusMessage('Account successfully linked! Returning to settings...');
          const returnUrl = sessionStorage.getItem('oauth_return_url') || '/settings';
          sessionStorage.removeItem('oauth_return_url');
          const dest = returnUrl.includes('?')
            ? `${returnUrl}&github_linked=success&login=${encodeURIComponent(ghLogin || '')}`
            : `${returnUrl}?github_linked=success&login=${encodeURIComponent(ghLogin || '')}`;

          setTimeout(() => {
            navigate(dest);
          }, 1200);
        } else {
          setStatusMessage('Analysis complete! Redirecting to dashboard...');
          const storedRedirect = sessionStorage.getItem('auth_redirect');
          if (storedRedirect) {
            sessionStorage.removeItem('auth_redirect');
          }
          const safeDestination =
            storedRedirect && storedRedirect.startsWith('/') && !storedRedirect.startsWith('//')
              ? storedRedirect
              : `/dashboard?analyze=${encodeURIComponent(ghLogin || '')}`;

          setTimeout(() => {
            navigate(safeDestination);
          }, 1200);
        }
      } catch (err: any) {
        setStatusStep('error');
        sessionStorage.removeItem('oauth_action');
        if (err instanceof ApiError) {
          setErrorMessage(err.detail);
        } else {
          setErrorMessage(err.message || 'GitHub OAuth verification failed.');
        }
      }
    };

    processOAuth();
  }, [searchParams, navigate, refreshUser, saveAnalysis]);

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-slate-800 shadow-card text-center space-y-6">
        <div className="h-12 w-12 rounded-2xl bg-navy-950 border border-slate-700/80 flex items-center justify-center text-violet-400 shadow-subtle mx-auto">
          <Terminal className="w-6 h-6 text-white" />
        </div>

        {statusStep !== 'error' ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {statusStep === 'exchanging' && (isLinking ? 'Linking GitHub Account...' : 'Connecting to GitHub...')}
              {statusStep === 'analyzing' && 'Analyzing Connected Portfolio...'}
              {statusStep === 'complete' && (isLinking ? 'Account Successfully Linked!' : 'Welcome to DevProfile AI!')}
            </h2>

            <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 text-xs text-slate-300 space-y-3">
              <div className="flex items-center justify-center gap-2 text-violet-400 font-medium">
                {statusStep === 'complete' ? (
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-bounce" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                )}
                <span>{statusMessage}</span>
              </div>

              {connectedUsername && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>Target profile:</span>
                  <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">
                    @{connectedUsername}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Repository auditing and AI portfolio analysis initializing in background.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">
                  {isLinking ? 'Account Linking Failed' : 'Authorization Failed'}
                </p>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {isLinking ? (
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Return to Account Settings</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-2 px-4 rounded-xl bg-navy-900 hover:bg-slate-800 text-slate-400 text-xs font-medium transition-colors cursor-pointer"
              >
                Go to Public Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
