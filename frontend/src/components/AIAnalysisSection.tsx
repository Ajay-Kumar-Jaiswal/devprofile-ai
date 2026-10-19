import React, { useState, useEffect } from 'react';
import type { AIAnalysisEnvelope } from '../types/api';

import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Target,
  FileQuestion,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Info,
  MessageSquare,
} from 'lucide-react';

interface AIAnalysisSectionProps {
  aiEnvelope?: AIAnalysisEnvelope | null;
  username: string;
  isDemo: boolean;
  onRetryAi: () => void;
  isLoadingAi: boolean;
}

export const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({
  aiEnvelope,
  onRetryAi,
  isLoadingAi,
}) => {
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleTriggerRetry = () => {
    if (isLoadingAi || cooldown > 0) return;
    setCooldown(5);
    onRetryAi();
  };

  // 1. Loading state during an active request
  if (isLoadingAi) {

    return (
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-violet-500/40 shadow-glow-violet space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>AI Portfolio Analysis</span>
              </h3>
              <p className="text-xs text-slate-400">
                Personalized insights based on your GitHub profile and repositories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span>Analyzing...</span>
            </span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-navy-900/60 border border-slate-800 space-y-3 text-center">
          <div className="inline-flex p-3 rounded-full bg-violet-500/10 text-violet-400 mb-1">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className="text-sm font-semibold text-white">Generating Portfolio Insights</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Reviewing your repositories, code patterns, and project structure to identify strengths and growth areas.
          </p>
        </div>
      </div>
    );
  }

  // 2. Fallback state when AI analysis is not present or failed
  if (!aiEnvelope || aiEnvelope.status !== 'success' || !aiEnvelope.analysis) {
    const isUnconfigured = aiEnvelope?.status === 'disabled';
    const isRateLimited = aiEnvelope?.status === 'rate_limited';

    const friendlyErrorMessage = (() => {
      const msg = aiEnvelope?.error_message;
      if (!msg) return 'AI portfolio analysis is temporarily unavailable.';
      if (msg.includes('GROQ_API_KEY') || msg.includes('Groq') || msg.includes('configured')) {
        return 'AI-powered recommendations are temporarily unavailable. Your verified portfolio score and metrics remain active.';
      }
      return msg;
    })();

    return (
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>AI Portfolio Analysis</span>
              </h3>
              <p className="text-xs text-slate-400">
                Personalized developer insights and actionable recommendations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isUnconfigured
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : isRateLimited
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {isRateLimited
                  ? 'Temporarily unavailable'
                  : 'AI insights unavailable'}
              </span>
            </span>
          </div>
        </div>

        {/* Actionable Error Banner */}
        <div className="p-4 rounded-xl bg-navy-900/90 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-slate-200">
                {friendlyErrorMessage}
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Deterministic portfolio score (0–100), repository metrics, charts, and quality checklists remain 100% active and verified above.
              </p>
            </div>
          </div>
        </div>

        {/* Retry Button with Cooldown */}
        <div className="pt-1 flex flex-wrap items-center gap-3">
          <button
            onClick={handleTriggerRetry}
            disabled={isLoadingAi || cooldown > 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-glow-violet disabled:opacity-50 active:scale-95"
            title={cooldown > 0 ? `Please wait ${cooldown}s before retrying` : 'Generate or retry AI portfolio evaluation'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cooldown > 0 ? 'animate-spin' : ''}`} />
            <span>
              {cooldown > 0 ? `Please wait (${cooldown}s)` : 'Generate / Retry AI Analysis'}
            </span>
          </button>
        </div>

      </div>
    );
  }

  // 3. Successful AI Analysis View
  const { analysis } = aiEnvelope;

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-violet-500/30 shadow-glow-violet space-y-7">
      {/* Top Banner & Explicit Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-glow-violet">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-white tracking-tight">
                AI Portfolio Analysis
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Evaluated strictly from verified GitHub repository evidence &bull; Personalized developer insights
            </p>
          </div>
        </div>

        {/* Status & Retry */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Explicit "Analysis complete" status badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analysis complete</span>
          </div>

          <button
            onClick={handleTriggerRetry}
            disabled={isLoadingAi || cooldown > 0}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            title={cooldown > 0 ? `Please wait ${cooldown}s before refreshing` : 'Refresh AI Analysis'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cooldown > 0 ? 'animate-spin' : ''}`} />
          </button>

        </div>
      </div>

      {/* 1. Executive Summary */}
      <div className="p-5 rounded-xl bg-navy-900/80 border border-violet-500/20 space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400 block">
          Executive Summary
        </span>
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
          "{analysis.summary}"
        </p>
      </div>

      {/* 2. Strengths and Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strengths */}
        <div className="p-5 rounded-xl bg-emerald-950/15 border border-emerald-500/20 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Key Strengths</span>
          </div>
          <ul className="space-y-2">
            {analysis.strengths && analysis.strengths.length > 0 ? (
              analysis.strengths.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300 leading-snug">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <span>{s}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-400 italic">No specific strengths flagged.</li>
            )}
          </ul>
        </div>

        {/* Specific Improvement Areas */}
        <div className="p-5 rounded-xl bg-amber-950/15 border border-amber-500/20 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Improvement Opportunities</span>
          </div>
          <ul className="space-y-2">
            {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
              analysis.weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300 leading-snug">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  <span>{w}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-400 italic">No major presentation gaps identified.</li>
            )}
          </ul>
        </div>
      </div>

      {/* 3. Repository-Specific Feedback */}
      {analysis.project_feedback && analysis.project_feedback.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            <span>Repository Insights</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.project_feedback.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-navy-900/60 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <h5 className="font-mono font-bold text-sm text-violet-300 truncate">
                    {item.repo_name}
                  </h5>
                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                    {item.feedback}
                  </p>
                </div>

                {item.suggested_improvements && item.suggested_improvements.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Targeted Upgrades:
                    </span>
                    {item.suggested_improvements.map((imp, i) => (
                      <p key={i} className="text-[11px] text-slate-400 flex items-start gap-1">
                        <span className="text-violet-400 shrink-0">&bull;</span>
                        <span>{imp}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Placement Readiness & Profile Presentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Placement Readiness */}
        <div className="p-5 rounded-xl bg-navy-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Target className="w-4 h-4 text-blue-400" />
            <span>Career &amp; Placement Readiness</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
            {analysis.placement_readiness && analysis.placement_readiness.length > 0 ? (
              analysis.placement_readiness.map((pr, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-blue-400 shrink-0">&bull;</span>
                  <span>{pr}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-400 italic">No specific notes recorded.</li>
            )}
          </ul>
        </div>

        {/* Profile Improvements */}
        <div className="p-5 rounded-xl bg-navy-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span>Profile Recommendations</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
            {analysis.profile_improvements && analysis.profile_improvements.length > 0 ? (
              analysis.profile_improvements.map((pi, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-violet-400 shrink-0">&bull;</span>
                  <span>{pi}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-400 italic">Profile metadata is complete.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Interviewer Talking Points */}
      {analysis.interviewer_talking_points && analysis.interviewer_talking_points.length > 0 && (
        <div className="p-5 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            <span>Interview Discussion Points</span>
          </div>
          <p className="text-xs text-slate-400">
            Key topics and architectural decisions to highlight in technical interviews:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
            {analysis.interviewer_talking_points.map((tp, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-violet-400 shrink-0 font-bold">&bull;</span>
                <span>{tp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Missing Evidence Notice */}
      {analysis.missing_evidence && analysis.missing_evidence.length > 0 && (
        <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <FileQuestion className="w-4 h-4 text-slate-400" />
            <span>Profile Analysis Notes:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            {analysis.missing_evidence.map((me, idx) => (
              <li key={idx}>{me}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
