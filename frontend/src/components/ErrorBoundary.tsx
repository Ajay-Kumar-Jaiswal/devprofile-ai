import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';


interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React render error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    window.location.href = '/dashboard';
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-navy-950 text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel rounded-2xl p-6 sm:p-8 border border-rose-500/30 bg-navy-900/90 shadow-2xl space-y-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/20 uppercase tracking-wide">
                Application Exception
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">Something went wrong</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                An unexpected rendering error occurred. Your session data and portfolio evaluations are preserved.
              </p>
            </div>

            {/* Error Message preview */}
            <div className="text-left bg-navy-950/80 rounded-xl p-3.5 border border-slate-800 text-xs text-rose-300/90 font-mono break-words">
              {this.state.error?.message || 'Unknown render exception occurred.'}
            </div>

            {/* Collapsible stack trace for debugging */}
            <div className="text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{this.state.showDetails ? 'Hide technical trace' : 'View technical trace'}</span>
              </button>

              {this.state.showDetails && (
                <pre className="mt-2 p-3 rounded-lg bg-navy-950 border border-slate-800 text-[10px] text-slate-400 font-mono overflow-x-auto max-h-48 leading-relaxed">
                  {this.state.error?.stack || 'No stack trace available'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-subtle border border-violet-500/30 active:scale-[0.99]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition-all active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
