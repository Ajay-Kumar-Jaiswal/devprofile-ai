import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  ArrowLeft,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  ShieldCheck,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  forgotPassword,
  verifyResetOtp,
  resetPasswordWithToken,
  resendResetOtp,
  ApiError,
} from '../services/api';

const OTP_LENGTH = 6;
const OTP_EXPIRATION_SECONDS = 10 * 60; // 10 minutes
const DEFAULT_RESEND_COOLDOWN = 60; // 60 seconds

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Multi-step flow: 'email' -> 'otp' -> 'new_password' -> 'success'
  const [step, setStep] = useState<'email' | 'otp' | 'new_password' | 'success'>('email');

  // Form State
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Timing
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [expireSecondsLeft, setExpireSecondsLeft] = useState<number>(OTP_EXPIRATION_SECONDS);
  const [redirectSeconds, setRedirectSeconds] = useState<number>(4);

  // OTP Input refs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep inputRefs matching OTP_LENGTH
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, OTP_LENGTH);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Expiration countdown
  useEffect(() => {
    if (step !== 'otp' || expireSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setExpireSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, expireSecondsLeft]);

  // Success auto-redirect
  useEffect(() => {
    if (step !== 'success') return;
    const interval = setInterval(() => {
      setRedirectSeconds((prev) => {
        if (prev <= 1) {
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, navigate]);

  // Focus management
  useEffect(() => {
    if (step === 'otp') {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // STEP 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await forgotPassword(cleanEmail);
      setSuccessNotice(res.message);
      setResendCooldown(res.cooldown_seconds || DEFAULT_RESEND_COOLDOWN);
      setExpireSecondsLeft(OTP_EXPIRATION_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setStep('otp');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Failed to request password reset code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Handle OTP Digits
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const char = cleaned ? cleaned.slice(-1) : '';

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setError(null);

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    setError(null);

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('').trim();
    if (otpCode.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (expireSecondsLeft <= 0) {
      setError('This verification code has expired. Please request a new code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await verifyResetOtp(email.trim(), otpCode);
      setResetToken(res.reset_token);
      setSuccessNotice('Code confirmed. Please set your new password.');
      setStep('new_password');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Incorrect verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const res = await resendResetOtp(email.trim());
      setSuccessNotice('A fresh 6-digit verification code has been dispatched.');
      setResendCooldown(res.cooldown_seconds || DEFAULT_RESEND_COOLDOWN);
      setExpireSecondsLeft(OTP_EXPIRATION_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Failed to resend code. Please try again in a few moments.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // STEP 3: Reset Password
  const isMinLength = newPassword.length >= 8;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = isMinLength && isMatch;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMinLength) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (!isMatch) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await resetPasswordWithToken(resetToken, newPassword);
      setSuccessNotice(res.message);
      setStep('success');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Failed to reset password. Please restart the recovery flow.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-transparent flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      {/* Centered Authentication Card */}
      <div className="relative w-full max-w-[460px] bg-[#101723]/65 backdrop-blur-xl border border-[rgba(148,163,184,0.18)] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden transition-all duration-200 animate-fadeIn">
        {/* Decorative ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="p-6 sm:p-8 space-y-5">
          {/* DevProfile.AI Brand Mark */}
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

          {/* Heading Icon Emblem */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-navy-950 border border-[rgba(148,163,184,0.18)] flex items-center justify-center text-violet-400 shadow-subtle">
              {step === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : step === 'new_password' ? (
                <Lock className="w-6 h-6 text-violet-400" />
              ) : step === 'otp' ? (
                <ShieldCheck className="w-6 h-6 text-violet-400" />
              ) : (
                <KeyRound className="w-6 h-6 text-violet-400" />
              )}
            </div>
          </div>

          {/* Dynamic Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {step === 'email' && 'Forgot password?'}
              {step === 'otp' && 'Enter recovery code'}
              {step === 'new_password' && 'Create new password'}
              {step === 'success' && 'Password reset complete'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {step === 'email' &&
                'Enter your registered email address and we will dispatch a secure 6-digit recovery code via Resend.'}
              {step === 'otp' && (
                <>
                  We sent a 6-digit code to <strong className="text-slate-200">{email}</strong>.
                </>
              )}
              {step === 'new_password' &&
                'Verification confirmed. Choose a strong, memorable password for your account.'}
              {step === 'success' &&
                'Your DevProfile AI account password has been updated. You can now log in.'}
            </p>
          </div>

          {/* Success Banner */}
          {successNotice && step !== 'success' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{successNotice}</p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed flex-1">{error}</p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: Email Input Form */}
          {/* ========================================================================= */}
          {step === 'email' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@campus.edu"
                    required
                    autoFocus
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-navy-950/60 border border-[rgba(148,163,184,0.18)] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: OTP Verification Form */}
          {/* ========================================================================= */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* 6 Digit Input Boxes */}
              <div className="flex justify-between items-center gap-1.5 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    className="w-11 sm:w-13 h-12 sm:h-13 text-center text-lg sm:text-xl font-mono font-bold text-white bg-navy-950/80 border border-[rgba(148,163,184,0.22)] rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-all select-none"
                    aria-label={`Digit ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Timers & Resend Controls */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Expires in{' '}
                    <span className={`font-mono font-medium ${expireSecondsLeft < 60 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {formatCountdown(expireSecondsLeft)}
                    </span>
                  </span>
                </div>

                {resendCooldown > 0 ? (
                  <span className="text-[11px] text-slate-400">
                    Resend in <span className="font-mono text-slate-300">{resendCooldown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors focus:outline-none"
                  >
                    <RotateCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                <button
                  type="submit"
                  disabled={isLoading || otpDigits.join('').length !== OTP_LENGTH}
                  className="w-full h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessNotice(null);
                    setStep('email');
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
                >
                  Change email address
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: New Password Form */}
          {/* ========================================================================= */}
          {step === 'new_password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    autoFocus
                    className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-950/60 border border-[rgba(148,163,184,0.18)] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    className="w-full h-10 pl-10 pr-10 rounded-xl bg-navy-950/60 border border-[rgba(148,163,184,0.18)] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Quality Criteria Indicators */}
              <div className="p-3 rounded-xl bg-navy-950/50 border border-[rgba(148,163,184,0.12)] space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      isMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className={isMinLength ? 'text-slate-200' : 'text-slate-400'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      isMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className={isMatch ? 'text-slate-200' : 'text-slate-400'}>
                    Passwords match
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: Success View */}
          {/* ========================================================================= */}
          {step === 'success' && (
            <div className="space-y-5 text-center">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 leading-relaxed">
                <p className="font-medium text-white mb-1">Password updated successfully!</p>
                <p>
                  You will be automatically redirected to the sign-in page in{' '}
                  <strong className="text-white font-mono">{redirectSeconds}s</strong>.
                </p>
              </div>

              <Link
                to="/login"
                className="w-full h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Back to Login link */}
          {step !== 'success' && (
            <div className="pt-3 border-t border-[rgba(148,163,184,0.18)] text-center text-xs text-slate-400">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Helpful prompt */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Need assistance? Contact support or check out our{' '}
        <Link to="/terms" className="text-violet-400 hover:text-violet-300 underline underline-offset-4">
          Terms & Conditions
        </Link>.
      </p>
    </div>
  );
};
