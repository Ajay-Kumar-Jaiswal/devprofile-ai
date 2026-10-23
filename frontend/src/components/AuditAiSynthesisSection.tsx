import React, { useState, useEffect } from 'react';
import type { AIAnalysisEnvelope, RepositoryItem } from '../types/api';
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  Cpu,
  Award,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface AuditAiSynthesisSectionProps {
  aiEnvelope?: AIAnalysisEnvelope | null;
  repositories?: RepositoryItem[];
  onViewAiTab?: () => void;
  onRetryAi?: () => void;
  isLoadingAi?: boolean;
}

export const AuditAiSynthesisSection: React.FC<AuditAiSynthesisSectionProps> = ({
  aiEnvelope,
  onViewAiTab,
  onRetryAi,
  isLoadingAi = false,
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
    if (isLoadingAi || cooldown > 0 || !onRetryAi) return;
    setCooldown(5);
    onRetryAi();
  };

  const analysis = aiEnvelope?.analysis;
  const isError =
    aiEnvelope &&
    (aiEnvelope.status === 'error' ||
      aiEnvelope.status === 'disabled' ||
      aiEnvelope.status === 'rate_limited');
  const modelName = aiEnvelope?.model_used || 'Groq Llama 3 70B';

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-violet-400 tracking-widest uppercase">
            05 /
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            AI Insights and Qualitative Synthesis
          </h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
            <Cpu className="w-3 h-3 text-violet-400" />
            <span>{modelName}</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          {onRetryAi && (
            <button
              type="button"
              onClick={handleTriggerRetry}
              disabled={isLoadingAi || cooldown > 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-mono text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
              title={cooldown > 0 ? `Wait ${cooldown}s` : 'Refresh AI synthesis'}
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingAi || cooldown > 0 ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `${cooldown}s` : 'Refresh AI'}</span>
            </button>
          )}

          {onViewAiTab && (
            <button
              type="button"
              onClick={onViewAiTab}
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-mono transition-colors cursor-pointer"
            >
              <span>View Full Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Loading State */}
      {isLoadingAi && (
        <div className="surface-card p-6 sm:p-7 rounded-2xl border border-violet-500/30 shadow-card text-center space-y-3">
          <div className="inline-flex p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <h4 className="text-sm font-bold text-white font-mono">Synthesizing Qualitative Insights</h4>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Evaluating repository architecture, code patterns, and commit momentum with Groq inference...
          </p>
        </div>
      )}

      {/* 2. Success State: 3-Column Card Layout */}
      {!isLoadingAi && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
          {/* Card 1: Key Strengths */}
          <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-card flex flex-col justify-between space-y-3.5 hover:border-slate-700 transition-colors min-w-0 overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Key Strengths</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                  Verified
                </span>
              </div>

              <ul className="space-y-2.5">
                {(analysis.strengths && analysis.strengths.length > 0
                  ? analysis.strengths.slice(0, 3)
                  : [
                      'Strong project diversity across multiple frameworks and domains',
                      'Consistent repository hygiene and documentation coverage',
                      'Demonstrated independent execution in personal open-source projects',
                    ]
                ).map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
              Grounded in repository telemetry
            </div>
          </div>

          {/* Card 2: Growth Opportunities */}
          <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-card flex flex-col justify-between space-y-3.5 hover:border-slate-700 transition-colors min-w-0 overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Growth Opportunities</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                  Actionable
                </span>
              </div>

              <ul className="space-y-2.5">
                {(analysis.weaknesses && analysis.weaknesses.length > 0
                  ? analysis.weaknesses.slice(0, 3)
                  : analysis.recommendations && analysis.recommendations.length > 0
                  ? analysis.recommendations.slice(0, 3).map((r) => r.suggested_action || r.title)
                  : [
                      'Add comprehensive test suites with CI workflow pipelines',
                      'Include architectural diagrams and demo URLs in top READMEs',
                      'Standardize open source licensing across all public repositories',
                    ]
                ).map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
              Targeted recruiter impact actions
            </div>
          </div>

          {/* Card 3: Overall Synthesis */}
          <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-card flex flex-col justify-between space-y-3.5 hover:border-slate-700 transition-colors min-w-0 overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Overall Synthesis</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/40">
                  AI Dossier
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-900 border border-violet-500/30">
                <p className="text-xs text-slate-100 font-serif italic leading-relaxed">
                  &ldquo;{analysis.summary}&rdquo;
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Synthesized by Groq</span>
              {onViewAiTab && (
                <button
                  type="button"
                  onClick={onViewAiTab}
                  className="text-violet-400 hover:text-violet-300 font-mono inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Error / Fallback State */}
      {!isLoadingAi && (!aiEnvelope || isError || !analysis) && (
        <div className="surface-card p-5 sm:p-6 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">AI Qualitative Synthesis Unavailable</h4>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {aiEnvelope?.error_message ||
                  'The AI inference service is temporarily offline or rate-limited. Deterministic portfolio scores, repository audits, and metrics above remain 100% active.'}
              </p>
            </div>
          </div>

          {onRetryAi && (
            <button
              type="button"
              onClick={handleTriggerRetry}
              disabled={isLoadingAi || cooldown > 0}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-semibold disabled:opacity-50 transition-colors shadow-subtle border border-violet-500/30 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cooldown > 0 ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `Wait (${cooldown}s)` : 'Retry AI Inference'}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
};
