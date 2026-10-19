import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Clock,
  WifiOff,
  UserX,
  ServerCrash,
} from 'lucide-react';

interface ErrorCardProps {
  error: string;
  statusCode?: number;
  retryAfterSeconds?: number;
  rateLimitResetEpoch?: number;
  onRetry?: () => void;
  onLoadDemo: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  statusCode,
  retryAfterSeconds,
  rateLimitResetEpoch,
  onRetry,
  onLoadDemo,
}) => {
  const isRateLimit = statusCode === 429 || error.toLowerCase().includes('rate limit');
  const isNotFound = statusCode === 404 || error.toLowerCase().includes('not found');
  const isConnectionRefused = statusCode === 0 || error.toLowerCase().includes('cannot connect');
  const isOffline = error.toLowerCase().includes('offline');
  const isServerOutage = statusCode === 502 || statusCode === 503 || statusCode === 504 || error.toLowerCase().includes('outage');

  // Active rate-limit countdown timer
  const [countdown, setCountdown] = useState<number | null>(() => {
    if (retryAfterSeconds && retryAfterSeconds > 0) return retryAfterSeconds;
    if (rateLimitResetEpoch) {
      const remaining = Math.max(0, Math.floor(rateLimitResetEpoch - Date.now() / 1000));
      return remaining > 0 ? remaining : null;
    }
    return null;
  });

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleRetry = () => {
    if (!onRetry || (isRateLimit && countdown !== null && countdown > 0)) return;
    setIsRetrying(true);
    setRetryAttempt((prev) => prev + 1);
    onRetry();
    setTimeout(() => setIsRetrying(false), 1500);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Contextual theme badges & borders
  const badgeConfig = isRateLimit
    ? {
        border: 'border-amber-500/30',
        bg: 'bg-amber-950/15',
        iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        title: 'GitHub API Rate Limit Reached',
        badge: 'Rate Limited',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        icon: Clock,
      }
    : isNotFound
    ? {
        border: 'border-slate-700/60',
        bg: 'bg-navy-900/60',
        iconBg: 'bg-slate-800 text-slate-300 border-slate-700',
        title: 'GitHub Profile Not Found',
        badge: '404 Not Found',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        icon: UserX,
      }
    : isOffline
    ? {
        border: 'border-rose-500/25',
        bg: 'bg-rose-950/10',
        iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        title: 'Network Offline',
        badge: 'Connection Lost',
        badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        icon: WifiOff,
      }
    : isConnectionRefused
    ? {
        border: 'border-rose-500/30',
        bg: 'bg-rose-950/15',
        iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        title: 'Backend Service Unreachable',
        badge: 'Service Offline',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        icon: ServerCrash,
      }
    : {
        border: 'border-rose-500/30',
        bg: 'bg-rose-950/15',
        iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        title: isServerOutage ? 'Upstream Service Outage' : 'Analysis Request Failed',
        badge: statusCode ? `HTTP ${statusCode}` : 'Error',
        badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        icon: AlertCircle,
      };

  const IconComponent = badgeConfig.icon;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeIn">
      <div
        className={`glass-panel rounded-2xl p-6 sm:p-8 border ${badgeConfig.border} ${badgeConfig.bg} shadow-card space-y-5`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${badgeConfig.iconBg}`}>
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeConfig.badgeColor}`}
              >
                {badgeConfig.badge}
              </span>
              {isRateLimit && countdown !== null && countdown > 0 && (
                <span className="text-[11px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                  Resets in {formatCountdown(countdown)}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{badgeConfig.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{error}</p>
          </div>
        </div>

        {/* Actionable Guidance Tip */}
        <div className="p-4 rounded-xl bg-navy-950/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <HelpCircle className="w-4 h-4 text-violet-400" />
            <span>Recommended Next Steps:</span>
          </div>

          {isRateLimit ? (
            <p className="text-slate-400 leading-relaxed">
              GitHub limits unauthenticated IP requests to 60/hr. Configure a personal access token (<code className="text-violet-300">GITHUB_TOKEN</code>) in <code className="text-violet-300">backend/.env</code> for 5,000 requests/hr, or click <strong>Load Demo Profile</strong> below to continue your evaluation immediately.
            </p>
          ) : isNotFound ? (
            <p className="text-slate-400 leading-relaxed">
              Double-check the spelling of the GitHub handle. GitHub usernames contain only alphanumeric characters and single hyphens. Alternatively, test the dashboard with our demo profile.
            </p>
          ) : isOffline ? (
            <p className="text-slate-400 leading-relaxed">
              Your device appears to be offline. Reconnect to Wi-Fi or cellular network, or explore offline analysis features via the demo profile.
            </p>
          ) : isConnectionRefused ? (
            <p className="text-slate-400 leading-relaxed">
              Ensure the FastAPI backend server is active via <code className="text-violet-300">uvicorn app.main:app --port 8000</code>.
            </p>
          ) : (
            <p className="text-slate-400 leading-relaxed">
              The service encountered an upstream issue. You can retry with exponential backoff or continue testing with the offline placement demo profile.
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Only show Retry Request when retrying is actually useful (NOT on permanent 404s) */}
          {onRetry && !isNotFound && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying || (isRateLimit && countdown !== null && countdown > 0)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 transition-all shadow-subtle active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                isRateLimit && countdown !== null && countdown > 0
                  ? `Please wait ${formatCountdown(countdown)} for quota reset before retrying`
                  : 'Retry the analysis request'
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>
                {isRetrying
                  ? 'Retrying...'
                  : isRateLimit && countdown !== null && countdown > 0
                  ? `Retry paused (${formatCountdown(countdown)})`
                  : retryAttempt > 0
                  ? `Retry Again (${retryAttempt})`
                  : 'Retry Request'}
              </span>
            </button>
          )}

          <button
            type="button"
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
