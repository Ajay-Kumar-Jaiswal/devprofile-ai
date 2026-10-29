import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { AIAnalysisSection } from '../components/AIAnalysisSection';
import { retryAIAnalysis } from '../services/api';
import { Sparkles, ArrowRight } from 'lucide-react';

export const AIInsightsPage: React.FC = () => {
  const { currentAnalysis, updateAiAnalysis } = useAnalysis();
  const navigate = useNavigate();
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const hasRealAnalysis = Boolean(currentAnalysis && !currentAnalysis.is_demo_data && currentAnalysis.username);

  const handleRetryAi = async () => {
    if (!currentAnalysis?.username) return;
    setIsLoadingAi(true);
    try {
      const resp = await retryAIAnalysis(currentAnalysis.username, false);
      if (resp) {
        updateAiAnalysis(resp);
      }
    } catch (err: any) {
      console.error('Failed to retry AI analysis:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {hasRealAnalysis && currentAnalysis ? (
        <div className="space-y-6">
          <div className="pb-2 border-b border-[rgba(148,163,184,0.16)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span>AI Insights</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Personalized architectural critique, portfolio readiness, and interview talking points for @{currentAnalysis.username}
              </p>
            </div>
          </div>

          <AIAnalysisSection
            aiEnvelope={currentAnalysis.ai_analysis}
            username={currentAnalysis.username}
            isDemo={false}
            onRetryAi={handleRetryAi}
            isLoadingAi={isLoadingAi}
          />
        </div>
      ) : (
        <div className="min-h-[55vh] flex flex-col items-center justify-center py-10">
          <div className="w-full max-w-md bg-[#101723]/65 backdrop-blur-xl border border-[rgba(148,163,184,0.18)] rounded-2xl p-7 sm:p-9 text-center shadow-2xl shadow-black/70 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-navy-950 border border-[rgba(148,163,184,0.18)] flex items-center justify-center mx-auto text-violet-400 shadow-subtle mb-4">
              <Sparkles className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Your AI Insights Are Waiting
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Analyze a GitHub profile to unlock personalized insights about repository quality, technical strengths, and areas for growth.
            </p>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-subtle border border-violet-500/30 cursor-pointer active:scale-[0.99]"
            >
              <span>Analyze a Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPage;
