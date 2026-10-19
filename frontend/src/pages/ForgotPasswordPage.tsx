import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, ApiError } from '../services/api';
import { Terminal, Mail, ArrowLeft, Loader2, Info, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; documentation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await forgotPassword(email);
      setResult({
        message: res.message,
        documentation: res.documentation,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to process password reset request.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet transition-transform group-hover:scale-105">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            DevProfile AI
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
          Reset your password
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Enter your registered email address to receive password recovery instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass-panel p-7 sm:p-8 rounded-2xl border border-slate-800 shadow-card space-y-6">
          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Request Processed</p>
                  <p className="text-[11px] text-emerald-200/90 leading-relaxed">{result.message}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Infrastructure Notice</p>
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed">{result.documentation}</p>
                </div>
              </div>

              <Link
                to="/login"
                className="w-full mt-4 py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-slate-800 border border-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-subtle hover:shadow-glow-violet flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Send Recovery Instructions</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
