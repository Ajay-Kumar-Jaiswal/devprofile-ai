import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { RecommendationsSection } from '../components/RecommendationsSection';
import { Compass, ArrowRight } from 'lucide-react';

export const ImprovementsPage: React.FC = () => {
  const { currentAnalysis } = useAnalysis();
  const navigate = useNavigate();

  const hasRealAnalysis = Boolean(currentAnalysis && !currentAnalysis.is_demo_data && currentAnalysis.username);

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {hasRealAnalysis && currentAnalysis ? (
        <div className="space-y-6">
          <RecommendationsSection
            recommendations={currentAnalysis.recommendations || []}
          />
        </div>
      ) : (
        <div className="min-h-[55vh] flex flex-col items-center justify-center py-10">
          <div className="w-full max-w-md bg-[#101723]/65 backdrop-blur-xl border border-[rgba(148,163,184,0.18)] rounded-2xl p-7 sm:p-9 text-center shadow-2xl shadow-black/70 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-navy-950 border border-[rgba(148,163,184,0.18)] flex items-center justify-center mx-auto text-amber-400 shadow-subtle mb-4">
              <Compass className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Your Personalized Improvements
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Analyze a GitHub profile to discover prioritized, evidence-based actions to strengthen your developer portfolio.
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

export default ImprovementsPage;
