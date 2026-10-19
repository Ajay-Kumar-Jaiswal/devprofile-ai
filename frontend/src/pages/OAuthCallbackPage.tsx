import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeGitHubOAuthCode, fetchProfileAnalysis, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Terminal, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [statusStep, setStatusStep] = useState<'exchanging' | 'analyzing' | 'complete' | 'error'>('exchanging');
  const [statusMessage, setStatusMessage] = useState('Verifying GitHub authorization...');
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Single-execution guard to prevent double-POST in React 18 StrictMode
  const hasRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    const errorParam = searchParams.get('error_description') || searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (errorParam) {
      setStatusStep('error');
      setErrorMessage(
        errorParam === 'access_denied'
          ? 'GitHub OAuth authorization was canceled or denied.'
          : errorParam
      );
      return;
    }

    if (!code || !state) {
      setStatusStep('error');
      setErrorMessage('Missing OAuth authorization code or state parameter.');
      return;
    }

    // Ensure we only dispatch the single-use token exchange once
    if (hasRequestedRef.current) {
      return;
    }
    hasRequestedRef.current = true;

    const processOAuth = async () => {
      try {
        // Step 1: Exchange code with backend
        setStatusMessage('Authorizing GitHub identity & session...');
        const authData = await exchangeGitHubOAuthCode(code, state);
        await refreshUser();

        const ghLogin = authData.user.connected_github?.github_login || authData.user.default_profile_username;

        setConnectedUsername(ghLogin || null);
        setStatusStep('analyzing');
        setStatusMessage(`Connected as @${ghLogin}! Launching automated profile audit & Groq AI synthesis...`);

        // Step 2: Automatically trigger analysis for the connected GitHub account
        if (ghLogin) {
          try {
            await fetchProfileAnalysis(ghLogin);
          } catch (analysisErr) {
            console.warn('Initial automated analysis failed, session preserved:', analysisErr);
            // Session is preserved; user can retry on dashboard
          }
        }

        setStatusStep('complete');
        setStatusMessage('Analysis complete! Redirecting to dashboard...');
        setTimeout(() => {
          navigate(`/dashboard?analyze=${encodeURIComponent(ghLogin || '')}`);
        }, 1200);
      } catch (err: any) {
        setStatusStep('error');
        if (err instanceof ApiError) {
          setErrorMessage(err.detail);
        } else {
          setErrorMessage(err.message || 'GitHub OAuth verification failed.');
        }
      }
    };

    processOAuth();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-slate-800 shadow-card text-center space-y-6">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet mx-auto">
          <Terminal className="w-6 h-6 text-white" />
        </div>

        {statusStep !== 'error' ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {statusStep === 'exchanging' && 'Connecting to GitHub...'}
              {statusStep === 'analyzing' && 'Analyzing Connected Portfolio...'}
              {statusStep === 'complete' && 'Welcome to DevProfile AI!'}
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
              Deterministic 5-pillar scoring and Groq AI inference active in background.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Authorization Failed</p>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-2 px-4 rounded-xl bg-navy-900 hover:bg-slate-800 text-slate-400 text-xs font-medium transition-colors"
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
