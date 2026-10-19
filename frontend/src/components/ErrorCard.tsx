import React from 'react';
import { AlertCircle, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';

interface ErrorCardProps {
  error: string;
  statusCode?: number;
  onRetry?: () => void;
  onLoadDemo: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  statusCode,
  onRetry,
  onLoadDemo,
}) => {
  const isRateLimit = statusCode === 429 || error.toLowerCase().includes('rate limit');
  const isNotFound = statusCode === 404 || error.toLowerCase().includes('not found');
  const isConnectionRefused = statusCode === 0 || error.toLowerCase().includes('cannot connect');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-rose-500/30 bg-rose-950/10 shadow-card space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-1 flex-1">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {isRateLimit
                ? 'GitHub API Rate Limit Reached'
                : isNotFound
                ? 'GitHub User Not Found'
                : isConnectionRefused
                ? 'Backend Service Unreachable'
                : 'Analysis Encountered an Error'}
            </h3>
            <p className="text-sm text-rose-300 leading-relaxed">{error}</p>
          </div>
        </div>

        {/* Guidance tip box */}
        <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <HelpCircle className="w-4 h-4 text-violet-400" />
            <span>Recommended Resolution:</span>
          </div>

          {isRateLimit ? (
            <p className="text-slate-400">
              GitHub limits unauthenticated IP requests to 60/hr. Configure a personal access token (`GITHUB_TOKEN`) in <code className="text-violet-300">backend/.env</code> for 5,000 requests/hr, or click <strong>Load Demo Profile</strong> below to continue your evaluation.
            </p>
          ) : isNotFound ? (
            <p className="text-slate-400">
              Double-check the spelling of the GitHub handle. GitHub usernames contain only letters, numbers, and single hyphens.
            </p>
          ) : isConnectionRefused ? (
            <p className="text-slate-400">
              Ensure the FastAPI backend server is running via <code className="text-violet-300">uvicorn app.main:app --port 8000</code>.
            </p>
          ) : (
            <p className="text-slate-400">
              Verify your internet connection or try testing with our offline placement demo profile.
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 transition-all shadow-subtle active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          )}

          <button
            onClick={onLoadDemo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-glow-violet active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Profile Instead</span>
          </button>
        </div>
      </div>
    </div>
  );
};
