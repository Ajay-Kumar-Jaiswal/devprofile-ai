import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Globe,
  Link2,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

/**
 * Extracts and validates a GitHub username from a raw input string (URL, handle, or demo).
 */
const extractGitHubHandle = (rawInput: string): { handle: string | null; error: string | null } => {
  const input = rawInput.trim();
  if (!input) {
    return { handle: null, error: 'Please enter a GitHub profile link or username.' };
  }

  // Support demo handles directly
  const lower = input.toLowerCase();
  if (lower === 'alex-dev-demo' || lower === 'demo') {
    return { handle: 'alex-dev-demo', error: null };
  }

  // Handle standard GitHub URLs: https://github.com/username or github.com/username
  const urlRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})(?:\/.*)?$/i;
  const match = input.match(urlRegex);
  if (match && match[1]) {
    return { handle: match[1], error: null };
  }

  // Handle @handle or plain handle
  const cleanHandle = input.startsWith('@') ? input.slice(1).trim() : input;

  // GitHub username rules: alphanumeric or single hyphens, 1-39 chars, cannot start/end with hyphen
  const handleRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  if (handleRegex.test(cleanHandle)) {
    return { handle: cleanHandle, error: null };
  }

  return {
    handle: null,
    error: 'Please enter a valid GitHub profile URL or username (e.g. octocat or https://github.com/octocat).',
  };
};

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { handle, error } = extractGitHubHandle(inputValue);
    if (error || !handle) {
      setErrorMessage(error || 'Please enter a valid GitHub profile URL or username.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    if (handle.toLowerCase() === 'alex-dev-demo') {
      navigate('/dashboard?demo=true');
    } else if (user) {
      navigate(`/dashboard?analyze=${encodeURIComponent(handle)}`);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(`/dashboard?analyze=${encodeURIComponent(handle)}`)}`);
    }
  };

  return (
    <div
      className="relative w-full min-h-[calc(100vh-68px)] sm:min-h-[calc(100vh-76px)] bg-transparent flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8"
    >
      {/* Main Hero Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center py-6 sm:py-10 my-auto">
        {/* Globe Icon Container */}
        <div className="mb-5 sm:mb-8">
          <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-[#101723]/60 backdrop-blur-md border border-slate-400/20 shadow-[0_0_28px_rgba(124,58,237,0.12)] flex items-center justify-center mx-auto transition-transform hover:scale-105 duration-200">
            <Globe className="w-5.5 h-5.5 sm:w-7 sm:h-7 text-[#A2A9BB] stroke-[1.5]" aria-hidden="true" />
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#F5F5F7] leading-[1.18] sm:leading-[1.14] max-w-3xl mx-auto px-1 sm:px-0">
          Turn Your GitHub Profile<br />
          into{' '}
          <span className="bg-gradient-to-r from-[#E879F9] via-[#D946EF] to-[#8B5CF6] text-transparent bg-clip-text">
            Real Opportunities
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="mt-3.5 sm:mt-5 text-xs sm:text-sm md:text-base text-[#A2A9BB] max-w-[640px] mx-auto leading-relaxed font-normal px-2 sm:px-0">
          Get an AI-powered analysis of your GitHub profile and discover your strengths, skill gaps, and matching opportunities.
        </p>

        {/* GitHub URL / Handle Input Container */}
        <div className="w-full max-w-[760px] sm:max-w-[800px] mt-6 sm:mt-10 mx-auto relative max-w-full">
          {/* Subtle purple backlight behind the button area */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-44 h-16 bg-violet-600/18 blur-xl rounded-full pointer-events-none hidden sm:block" />

          <form
            onSubmit={handleSubmit}
            className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[#101723]/60 backdrop-blur-xl border border-slate-400/20 focus-within:border-violet-500/80 focus-within:ring-2 focus-within:ring-violet-500/20 rounded-2xl p-2 sm:p-2.5 shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-200 gap-2 sm:gap-0 w-full max-w-full overflow-hidden"
          >
            <div className="flex items-center flex-1 min-w-0 w-full overflow-hidden pl-1.5 sm:pl-3">
              <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#78839B] shrink-0 mr-2 sm:mr-3" aria-hidden="true" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter GitHub URL or handle"
                aria-label="GitHub profile link or username"
                className="w-full min-w-0 flex-1 bg-transparent text-[#F5F5F7] placeholder-[#78839B] text-xs sm:text-[15px] outline-none py-2 pr-2 truncate"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] active:bg-[#6D28D9] text-white font-medium text-xs sm:text-[15px] transition-all duration-180 shadow-md shadow-violet-900/30 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Validation Error Message */}
          {errorMessage && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium animate-fadeIn" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
