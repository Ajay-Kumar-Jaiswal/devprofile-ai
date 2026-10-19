import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, ArrowLeft, KeyRound } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-navy-950 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      {/* Centered Authentication Card */}
      <div className="relative w-full max-w-[440px] bg-navy-900 border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden transition-all duration-200 animate-fadeIn">
        {/* Subtle decorative ambient glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* DevProfile.AI Brand Mark */}
          <div className="flex items-center justify-center gap-2.5">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-glow-violet transition-transform group-hover:scale-105">
                <Terminal className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                DevProfile<span className="text-violet-400">.AI</span>
              </span>
            </Link>
          </div>

          {/* Key Icon Emblem */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-glow-violet">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>

          {/* Heading and Friendly Message */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              No worries! Password recovery isn't available right now. You can return to login and try another sign-in method.
            </p>
          </div>

          {/* Primary Action Button */}
          <div>
            <Link
              to="/login"
              className="w-full h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle hover:shadow-glow-violet flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>

          {/* Quick Sign In / Sign Up switch */}
          <div className="pt-3.5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            <p>
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Required Footer text */}
      <p className="mt-6 text-center text-xs text-slate-400">
        We're here to help you get back to coding.
      </p>
    </div>
  );
};
