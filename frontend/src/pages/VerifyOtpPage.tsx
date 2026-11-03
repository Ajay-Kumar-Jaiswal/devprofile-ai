import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendOtp, ApiError } from '../services/api';
import {
  Terminal,
  ShieldCheck,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const OTP_LENGTH = 6;
const OTP_EXPIRATION_SECONDS = 10 * 60; // 10 minutes
const DEFAULT_RESEND_COOLDOWN = 60; // 60 seconds

export const VerifyOtpPage: React.FC = () => {
  const { verifyEmailOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get('email') || '';
  const rawRedirect = searchParams.get('redirect');
  const targetRedirect =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';

  const [email, setEmail] = useState<string>(emailParam);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(!emailParam);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Expiration countdown (10 minutes)
  const [expireSecondsLeft, setExpireSecondsLeft] = useState<number>(OTP_EXPIRATION_SECONDS);
  // Resend cooldown countdown (60 seconds)
  const [resendCooldown, setResendCooldown] = useState<number>(DEFAULT_RESEND_COOLDOWN);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep inputRefs array matching OTP length
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, OTP_LENGTH);
  }, []);

  // Autofocus first input on mount
  useEffect(() => {
    if (inputRefs.current[0] && !isEditingEmail) {
      inputRefs.current[0].focus();
    }
  }, [isEditingEmail]);

  // Expiration timer countdown
  useEffect(() => {
    if (expireSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setExpireSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expireSecondsLeft]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    // Take only the last character entered, ensuring it's a digit
    const cleaned = value.replace(/\D/g, '');
    const char = cleaned ? cleaned.slice(-1) : '';

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance to next input if digit entered
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Current box is empty, move back and clear previous
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else if (otpDigits[index]) {
        // Clear current
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    const pasteLength = Math.min(pastedData.length, OTP_LENGTH);

    for (let i = 0; i < pasteLength; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);
    setError(null);

    // Focus last filled digit or the next empty box
    const focusIndex = Math.min(pasteLength, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    // If 6 digits were pasted, immediately trigger verification
    if (pastedData.length >= OTP_LENGTH) {
      const fullCode = pastedData.slice(0, OTP_LENGTH);
      submitVerification(fullCode);
    }
  };

  const submitVerification = async (codeOverride?: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please provide an email address.');
      setIsEditingEmail(true);
      return;
    }

    const code = codeOverride || otpDigits.join('');
    if (code.length < OTP_LENGTH) {
      setError(`Please enter all ${OTP_LENGTH} digits of your verification code.`);
      return;
    }

    if (expireSecondsLeft <= 0) {
      setError('This verification code has expired. Please request a new code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const auth = await verifyEmailOtp(cleanEmail, code);
      setSuccessNotice('Email verified successfully! Redirecting...');
      setTimeout(() => {
        if (targetRedirect !== '/dashboard') {
          navigate(targetRedirect);
        } else if (auth.user.default_profile_username) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }, 700);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Verification failed. Please check the code and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerification();
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your registered email address first.');
      setIsEditingEmail(true);
      return;
    }
    if (resendCooldown > 0) return;

    setIsResending(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await resendOtp(cleanEmail);
      setSuccessNotice(res.message || 'A new verification code has been dispatched to your email.');
      setResendCooldown(res.cooldown_seconds || DEFAULT_RESEND_COOLDOWN);
      setExpireSecondsLeft(OTP_EXPIRATION_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
        if (err.retryAfterSeconds) {
          setResendCooldown(err.retryAfterSeconds);
        }
      } else {
        setError(err.message || 'Failed to dispatch new verification code.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-transparent flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      {/* Centered Authentication Card */}
      <div className="relative w-full max-w-[460px] bg-[#101723]/65 backdrop-blur-xl border border-[rgba(148,163,184,0.18)] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden transition-all duration-200 animate-fadeIn">
        {/* Subtle ambient violet accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* 1. DevProfile.AI Brand Mark */}
          <div className="flex items-center justify-center gap-2.5">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-navy-950 border border-[rgba(148,163,184,0.18)] group-hover:border-violet-500/50 flex items-center justify-center text-violet-400 transition-colors shadow-subtle">
                <Terminal className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                DevProfile<span className="text-violet-400">.AI</span>
              </span>
            </Link>
          </div>

          {/* 2. Heading and Subtitle */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Verify your email
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              We sent a 6-digit verification code via secure email. Enter the code below to activate your account.
            </p>
          </div>

          {/* 3. Email Address Banner / Editor */}
          <div className="rounded-xl bg-navy-950/80 border border-[rgba(148,163,184,0.18)] p-3 text-xs">
            {isEditingEmail ? (
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-400">
                  Registered Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@campus.edu"
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-navy-900 border border-[rgba(148,163,184,0.2)] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (email.trim()) setIsEditingEmail(false);
                    }}
                    className="px-3 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-colors shrink-0"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-slate-300 truncate font-mono text-[11px]">
                    {email || 'No email specified'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  className="text-violet-400 hover:text-violet-300 font-medium text-[11px] underline underline-offset-2 shrink-0 transition-colors"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed flex-1">{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed flex-1">{successNotice}</span>
            </div>
          )}

          {/* 4. Six-Digit OTP Form */}
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-xs font-medium text-slate-300">
                  6-Digit Verification Code
                </label>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Expires in{' '}
                    <span
                      className={`font-mono font-medium ${
                        expireSecondsLeft <= 60
                          ? 'text-rose-400'
                          : expireSecondsLeft <= 180
                          ? 'text-amber-400'
                          : 'text-violet-300'
                      }`}
                    >
                      {formatCountdown(expireSecondsLeft)}
                    </span>
                  </span>
                </div>
              </div>

              {/* 6 Digit Inputs */}
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    disabled={isLoading || expireSecondsLeft <= 0}
                    aria-label={`Digit ${idx + 1}`}
                    className={`w-full h-12 sm:h-13 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl bg-navy-950/70 border text-white transition-all focus:outline-none ${
                      digit
                        ? 'border-violet-500/80 bg-violet-950/20 ring-2 ring-violet-500/20'
                        : 'border-[rgba(148,163,184,0.2)] hover:border-[rgba(148,163,184,0.35)] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                    } ${expireSecondsLeft <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Expired Notice */}
            {expireSecondsLeft <= 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  This code has expired. Click below to request a fresh 6-digit verification code.
                </span>
              </div>
            )}

            {/* Verify Email Action Button */}
            <button
              type="submit"
              disabled={isLoading || otpDigits.join('').length < OTP_LENGTH || expireSecondsLeft <= 0}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating account...</span>
                </>
              ) : (
                <>
                  <span>Verify Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 5. Resend Code & Navigation Options */}
          <div className="pt-2 border-t border-[rgba(148,163,184,0.14)] space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>Didn't receive the email?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className="inline-flex items-center gap-1.5 font-semibold text-violet-400 hover:text-violet-300 disabled:text-slate-500 disabled:pointer-events-none transition-colors"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Resend in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Resend code</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to sign in</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
