import React, { useState } from 'react';
import type { AnalysisResponse } from '../types/api';
import { Download, Check } from 'lucide-react';

interface ExportButtonProps {
  data: AnalysisResponse;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    try {
      const hasAi = data.ai_analysis && data.ai_analysis.status === 'success' && data.ai_analysis.analysis;

      const exportPayload: Record<string, any> = {
        meta: {
          generator: 'DevProfile AI — GitHub Profile Analyzer',
          version: '2.0.0',
          exported_at: new Date().toISOString(),
          is_demo_data: data.is_demo_data,
          ai_analysis_completed: Boolean(hasAi),
          ai_analysis_status: data.ai_analysis?.status || 'none',
          ai_model_used: data.ai_analysis?.model_used || null,
        },
        profile: data.profile,
        summary_statistics: data.stats,
        language_breakdown: data.languages,
        portfolio_score: data.portfolio_score,
        repository_quality_checklist: data.quality_checklist,
        top_repositories: data.top_repositories,
        deterministic_recommendations: data.recommendations,
        deterministic_roadmaps: {
          roadmap_7_day: data.roadmap_7_day,
          roadmap_30_day: data.roadmap_30_day,
        },
      };

      // Only include AI analysis when successfully available
      if (hasAi) {
        exportPayload.ai_analysis = data.ai_analysis?.analysis;
      }

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devprofile-${data.username}-report.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } catch (err) {
      console.error('Failed to export report:', err);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 hover:border-violet-500/60 font-medium text-xs sm:text-sm transition-all shadow-subtle active:scale-95"
      title="Download complete structured analysis as JSON"
    >
      {downloaded ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400">Report Downloaded!</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-violet-400" />
          <span>Download JSON Report</span>
        </>
      )}
    </button>
  );
};
