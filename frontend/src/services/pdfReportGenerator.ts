import { jsPDF } from 'jspdf';
import type { AnalysisResponse } from '../types/api';

/**
 * Generates an executive, professional PDF audit report from an AnalysisResponse payload.
 * Formatted cleanly for print and digital review with proper pagination and typography.
 */
export async function generateAnalysisPdf(data: AnalysisResponse): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178mm
  let cursorY = 16;

  // Colors
  const primaryDark = [15, 23, 42];     // #0f172a
  const violetAccent = [109, 40, 217];   // #6d28d9
  const textDark = [30, 41, 59];        // #1e293b
  const textMuted = [100, 116, 139];    // #64748b
  const lightBg = [248, 250, 252];      // #f8fafc
  const cardBorder = [226, 232, 240];   // #e2e8f0
  const emeraldGreen = [16, 185, 129];  // #10b981
  const amberOrange = [217, 119, 6];    // #d97706

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 20) {
      doc.addPage();
      cursorY = 20;
    }
  };

  // =========================================================================
  // 1. Header Banner
  // =========================================================================
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(marginX, cursorY, contentWidth, 26, 3, 3, 'F');

  // Title & Subtitle in Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('DevProfile AI', marginX + 6, cursorY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Developer Portfolio & Technical Recruitment Audit', marginX + 6, cursorY + 16);

  // Metadata block (right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  const handleText = `@${data.username}`;
  doc.text(handleText, pageWidth - marginX - 6, cursorY + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = new Date(data.analyzed_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - marginX - 6, cursorY + 16, { align: 'right' });

  if (data.is_demo_data) {
    doc.text('Mode: Offline Placement Demo', pageWidth - marginX - 6, cursorY + 21, { align: 'right' });
  }

  cursorY += 32;

  // =========================================================================
  // 2. Executive Score Card & Summary
  // =========================================================================
  checkPageBreak(42);

  const scoreBoxWidth = 48;
  const scoreBoxHeight = 36;
  const summaryBoxWidth = contentWidth - scoreBoxWidth - 4;

  // Score Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cursorY, scoreBoxWidth, scoreBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('PORTFOLIO SCORE', marginX + scoreBoxWidth / 2, cursorY + 8, { align: 'center' });

  doc.setFontSize(24);
  const scoreVal = data.portfolio_score?.overall_score ?? 0;
  if (scoreVal >= 75) {
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  } else if (scoreVal >= 55) {
    doc.setTextColor(violetAccent[0], violetAccent[1], violetAccent[2]);
  } else {
    doc.setTextColor(amberOrange[0], amberOrange[1], amberOrange[2]);
  }
  doc.text(`${scoreVal}`, marginX + scoreBoxWidth / 2, cursorY + 20, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('out of 100', marginX + scoreBoxWidth / 2, cursorY + 25, { align: 'center' });

  const tierText = data.portfolio_score?.tier || 'Developing Tier';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(tierText, marginX + scoreBoxWidth / 2, cursorY + 31, { align: 'center' });

  // Summary Box
  const summaryX = marginX + scoreBoxWidth + 4;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(summaryX, cursorY, summaryBoxWidth, scoreBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Executive Assessment Summary', summaryX + 6, cursorY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const summaryContent =
    data.ai_analysis?.analysis?.summary ||
    data.portfolio_score?.summary ||
    'Portfolio analyzed across GitHub repository hygiene, documentation breadth, technical diversity, and codebase activity.';
  const splitSummary = doc.splitTextToSize(summaryContent, summaryBoxWidth - 12);
  doc.text(splitSummary.slice(0, 4), summaryX + 6, cursorY + 14);

  cursorY += scoreBoxHeight + 6;

  // =========================================================================
  // 3. 5-Pillar Score Breakdown
  // =========================================================================
  checkPageBreak(50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Portfolio Pillar Breakdown', marginX, cursorY + 2);
  cursorY += 6;

  const breakdown = data.portfolio_score?.breakdown || [];
  const colWidth = (contentWidth - 8) / 3;

  for (let i = 0; i < breakdown.length; i += 3) {
    checkPageBreak(22);
    const rowItems = breakdown.slice(i, i + 3);

    for (let j = 0; j < rowItems.length; j++) {
      const item = rowItems[j];
      const itemX = marginX + j * (colWidth + 4);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.roundedRect(itemX, cursorY, colWidth, 18, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(item.category.substring(0, 24), itemX + 3, cursorY + 5);

      doc.setFontSize(10);
      doc.setTextColor(violetAccent[0], violetAccent[1], violetAccent[2]);
      doc.text(`${item.score} / ${item.max_score} pts`, itemX + 3, cursorY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Status: ${item.status.toUpperCase()} (${item.percentage}%)`, itemX + 3, cursorY + 15);
    }
    cursorY += 22;
  }

  cursorY += 2;

  // =========================================================================
  // 4. Key Strengths & Priority Improvement Areas
  // =========================================================================
  const strengths = data.ai_analysis?.analysis?.strengths || [];
  const weaknesses = data.ai_analysis?.analysis?.weaknesses || [];

  if (strengths.length > 0 || weaknesses.length > 0) {
    checkPageBreak(45);

    const halfColWidth = (contentWidth - 4) / 2;

    // Strengths Column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    doc.text('Key Strengths & Evidence', marginX, cursorY + 2);

    // Weaknesses Column
    doc.setTextColor(amberOrange[0], amberOrange[1], amberOrange[2]);
    doc.text('Priority Improvement Opportunities', marginX + halfColWidth + 4, cursorY + 2);
    cursorY += 6;

    const startY = cursorY;

    // Render Strengths
    let leftY = startY;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    const activeStrengths = strengths.slice(0, 4);
    if (activeStrengths.length > 0) {
      for (const s of activeStrengths) {
        doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
        doc.circle(marginX + 2, leftY + 1.5, 0.8, 'F');
        const lines = doc.splitTextToSize(s, halfColWidth - 8);
        doc.text(lines, marginX + 5, leftY + 2.5);
        leftY += lines.length * 3.8 + 2;
      }
    } else {
      doc.text('Analysis baseline verified repository documentation & commit cadence.', marginX + 5, leftY + 2.5);
      leftY += 6;
    }

    // Render Weaknesses
    let rightY = startY;
    const activeWeaknesses = weaknesses.slice(0, 4);
    const rightX = marginX + halfColWidth + 4;

    if (activeWeaknesses.length > 0) {
      for (const w of activeWeaknesses) {
        doc.setFillColor(amberOrange[0], amberOrange[1], amberOrange[2]);
        doc.circle(rightX + 2, rightY + 1.5, 0.8, 'F');
        const lines = doc.splitTextToSize(w, halfColWidth - 8);
        doc.text(lines, rightX + 5, rightY + 2.5);
        rightY += lines.length * 3.8 + 2;
      }
    } else {
      doc.text('Add license declarations and live project demo links to raise your score.', rightX + 5, rightY + 2.5);
      rightY += 6;
    }

    cursorY = Math.max(leftY, rightY) + 4;
  }

  // =========================================================================
  // 5. Repository Insights & Technology Breakdown
  // =========================================================================
  checkPageBreak(40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Repository Insights & Stack Breadth', marginX, cursorY + 2);
  cursorY += 6;

  // Stat Summary Strip
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(marginX, cursorY, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const stats = data.stats;
  const statsLine = `Public Repositories: ${stats.total_public_repos}   |   Analyzed: ${stats.total_analyzed_repos}   |   Total Stars: ${stats.total_stars}   |   Primary Language: ${stats.primary_language || 'Various'}`;
  doc.text(statsLine, marginX + 6, cursorY + 7.5);
  cursorY += 16;

  // Top Repositories Table
  const repos = (data.top_repositories || []).slice(0, 5);
  if (repos.length > 0) {
    checkPageBreak(35);

    // Table Header
    doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.rect(marginX, cursorY, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('REPOSITORY NAME', marginX + 3, cursorY + 5);
    doc.text('LANGUAGE', marginX + 60, cursorY + 5);
    doc.text('STARS / FORKS', marginX + 95, cursorY + 5);
    doc.text('DESCRIPTION / AUDIT NOTE', marginX + 130, cursorY + 5);
    cursorY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    for (let r = 0; r < repos.length; r++) {
      checkPageBreak(12);
      const repo = repos[r];
      const isEven = r % 2 === 0;

      if (isEven) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(marginX, cursorY, contentWidth, 9, 'F');
      }

      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.line(marginX, cursorY + 9, marginX + contentWidth, cursorY + 9);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(violetAccent[0], violetAccent[1], violetAccent[2]);
      doc.text(repo.name.substring(0, 26), marginX + 3, cursorY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(repo.language || 'N/A', marginX + 60, cursorY + 6);
      doc.text(`${repo.stargazers_count} ★  /  ${repo.forks_count} ⑂`, marginX + 95, cursorY + 6);

      const desc = repo.description || 'No description provided';
      doc.text(desc.substring(0, 32) + (desc.length > 32 ? '...' : ''), marginX + 130, cursorY + 6);

      cursorY += 9;
    }
    cursorY += 6;
  }

  // =========================================================================
  // 6. Actionable Priority Recommendations
  // =========================================================================
  const recs = (data.recommendations || []).slice(0, 4);
  if (recs.length > 0) {
    checkPageBreak(45);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text('Actionable Career Recommendations', marginX, cursorY + 2);
    cursorY += 6;

    for (const rec of recs) {
      checkPageBreak(18);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.roundedRect(marginX, cursorY, contentWidth, 15, 1.5, 1.5, 'FD');

      // Priority pill
      const isHigh = rec.priority === 'high';
      if (isHigh) {
        doc.setFillColor(amberOrange[0], amberOrange[1], amberOrange[2]);
      } else {
        doc.setFillColor(violetAccent[0], violetAccent[1], violetAccent[2]);
      }
      doc.roundedRect(marginX + 3, cursorY + 3, 14, 4.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(rec.priority.toUpperCase(), marginX + 10, cursorY + 6.2, { align: 'center' });

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(rec.title.substring(0, 50), marginX + 20, cursorY + 6.5);

      // Action Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const actionText = `Action: ${rec.action}`;
      doc.text(actionText.substring(0, 100), marginX + 5, cursorY + 11.5);

      cursorY += 17;
    }
  }

  // =========================================================================
  // 7. Page Footers (Page X of Y)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.text(
      'DevProfile AI — Confidential Developer Audit Report',
      marginX,
      pageHeight - 8
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Save the PDF
  const filename = `devprofile-${data.username}-report.pdf`;
  doc.save(filename);
}
