import React, { useState, useRef, useEffect } from 'react';
import type { AnalysisResponse } from '../types/api';
import { generateAnalysisPdf } from '../services/pdfReportGenerator';
import { FileText, Check, ChevronDown, Code2, Loader2, AlertCircle } from 'lucide-react';

interface ExportButtonProps {
  data: AnalysisResponse;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);
  const [downloadedJson, setDownloadedJson] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDownloadPdf = async () => {
    setDropdownOpen(false);
    setErrorMessage(null);
    setIsGeneratingPdf(true);

    try {
      if (!data || !data.username) {
        throw new Error('Analysis report data is incomplete.');
      }
      await generateAnalysisPdf(data);
      setDownloadedPdf(true);
      setTimeout(() => setDownloadedPdf(false), 2500);
    } catch (err: any) {
      console.error('Failed to generate PDF report:', err);
      setErrorMessage(err?.message || 'Could not generate PDF report. Please try again.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJson = () => {
    setDropdownOpen(false);
    setErrorMessage(null);

    try {
      const hasAi = Boolean(data.ai_analysis && data.ai_analysis.status === 'success' && data.ai_analysis.analysis);

      const exportPayload: Record<string, any> = {
        meta: {
          generator: 'DevProfile AI',
          exported_at: new Date().toISOString(),
          is_demo_data: data.is_demo_data,
          ai_analysis_completed: hasAi,
        },
        profile: data.profile,
        summary_statistics: data.stats,
        language_breakdown: data.languages,
        portfolio_score: data.portfolio_score,
        repository_quality_checklist: data.quality_checklist,
        top_repositories: data.top_repositories,
        recommendations: data.recommendations,
        roadmaps: {
          roadmap_7_day: data.roadmap_7_day,
          roadmap_30_day: data.roadmap_30_day,
        },
      };

      if (hasAi) {
        exportPayload.ai_analysis = data.ai_analysis?.analysis;
      }

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devprofile-${data.username}-data.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadedJson(true);
      setTimeout(() => setDownloadedJson(false), 2500);
    } catch (err) {
      console.error('Failed to export raw JSON:', err);
      setErrorMessage('Failed to export JSON file.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Primary Action: Download Report (PDF) */}
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-l-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs sm:text-sm transition-all shadow-glow-violet active:scale-95 disabled:opacity-50"
        title="Download executive evaluation as a formatted PDF report"
      >
        {isGeneratingPdf ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Generating PDF...</span>
          </>
        ) : downloadedPdf ? (
          <>
            <Check className="w-4 h-4 text-emerald-300" />
            <span className="text-emerald-200">PDF Downloaded!</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 text-violet-200" />
            <span>Download Report (PDF)</span>
          </>
        )}
      </button>

      {/* Secondary dropdown toggle */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="px-2 py-1.5 rounded-r-xl bg-violet-700 hover:bg-violet-600 border-l border-violet-500/40 text-white transition-colors"
        title="More export formats"
        aria-label="Export options"
        aria-expanded={dropdownOpen}
      >
        <ChevronDown className="w-3.5 h-3.5 text-violet-200" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-navy-900 border border-slate-800 shadow-2xl p-1.5 z-40 text-xs animate-fadeIn space-y-1">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-violet-600/20 hover:text-white transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-violet-400" />
            <div>
              <p className="font-semibold">Formatted PDF Report</p>
              <p className="text-[10px] text-slate-400">Complete readable audit</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
          >
            <Code2 className="w-4 h-4 text-slate-400" />
            <div>
              <p className="font-medium">Export Raw JSON</p>
              <p className="text-[10px] text-slate-400">Advanced machine payload</p>
            </div>
          </button>
        </div>
      )}

      {/* Contextual Error Toast */}
      {errorMessage && (
        <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-rose-950/95 border border-rose-500/30 text-rose-300 text-xs shadow-xl flex items-center gap-2 z-50">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Secondary JSON download feedback */}
      {downloadedJson && (
        <div className="absolute right-0 top-full mt-2 w-52 p-2 rounded-xl bg-navy-900 border border-emerald-500/40 text-emerald-300 text-xs shadow-xl flex items-center gap-2 z-50">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>JSON exported successfully!</span>
        </div>
      )}
    </div>
  );
};
