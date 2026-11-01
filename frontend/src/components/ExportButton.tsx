import React, { useState } from 'react';
import type { AnalysisResponse } from '../types/api';
import { generateAnalysisPdf } from '../services/pdfReportGenerator';
import { Download, Check, Loader2, AlertCircle } from 'lucide-react';

interface ExportButtonProps {
  data: AnalysisResponse;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
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

  return (
    <div className="relative inline-flex items-center">
      {/* Primary Action: Download Report (PDF) */}
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
        className="group flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#101723]/90 hover:bg-violet-950/50 text-violet-200 hover:text-white border border-violet-500/30 hover:border-violet-500/60 font-semibold text-xs transition-all duration-180 shadow-subtle hover:shadow-glow-violet active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#0B0D12] cursor-pointer select-none"
        title="Download executive evaluation as a formatted PDF report"
      >
        {isGeneratingPdf ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400 shrink-0" />
            <span className="text-violet-200">Generating...</span>
          </>
        ) : downloadedPdf ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-bold">Downloaded!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 shrink-0 transition-colors" />
            <span>Download Report</span>
          </>
        )}
      </button>

      {/* Contextual Error Toast */}
      {errorMessage && (
        <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-rose-950/95 border border-rose-500/30 text-rose-300 text-xs shadow-xl flex items-center gap-2 z-50 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
