import { jsPDF } from 'jspdf';
import type { AnalysisResponse, RepositoryItem, ScoreCategory, RecommendationItem } from '../types/api';

/**
 * Color Palette Tokens matching DevProfile AI's dark luxury developer visual identity.
 * RGB tuples for jsPDF fill, draw, and text primitives.
 */
export const PDF_THEME = {
  // Surfaces & Backgrounds
  bgPage: [11, 13, 20] as [number, number, number],         // #0B0D14 - Deep page canvas
  bgHeader: [16, 23, 38] as [number, number, number],       // #101726 - Header surface
  bgCard: [19, 27, 42] as [number, number, number],         // #131B2A - Main card surface
  bgCardSubtle: [24, 34, 54] as [number, number, number],   // #182236 - Nested panel / badge background
  bgRowAlt: [22, 31, 49] as [number, number, number],       // #161F31 - Alternating table row
  bgVioletPill: [36, 25, 63] as [number, number, number],   // #24193F - Violet badge container

  // Borders
  borderSubtle: [35, 46, 66] as [number, number, number],   // #232E42 - Subtle slate border
  borderViolet: [124, 58, 237] as [number, number, number], // #7C3AED - Primary violet border

  // Accent & Brand Highlights
  violetPrimary: [139, 92, 246] as [number, number, number], // #8B5CF6 - Vibrant violet
  violetLight: [167, 139, 250] as [number, number, number],  // #A78BFA - Light violet
  violetDeep: [109, 40, 217] as [number, number, number],    // #6D28D9 - Deep violet

  // Text Hierarchy
  textWhite: [255, 255, 255] as [number, number, number],    // #FFFFFF - Primary headings
  textBody: [226, 232, 240] as [number, number, number],     // #E2E8F0 - High contrast body text
  textSecondary: [203, 213, 225] as [number, number, number],// #CBD5E1 - Secondary text
  textMuted: [148, 163, 184] as [number, number, number],    // #94A3B8 - Labels & captions
  textFaint: [100, 116, 139] as [number, number, number],    // #64748B - Subtle metadata

  // Status & Semantic Accents
  emerald: [52, 211, 153] as [number, number, number],       // #34D399 - Strong areas / high scores
  amber: [251, 191, 36] as [number, number, number],         // #FBBF24 - Opportunities / medium priority
  rose: [248, 113, 113] as [number, number, number],         // #F87171 - Critical gaps / high priority
  teal: [56, 189, 248] as [number, number, number],          // #38BDF8 - Languages / tech stats
};

/**
 * Sanitizes dynamic text to prevent PDF rendering errors, corrupted emoji artifacts,
 * and unprintable glyphs with standard jsPDF fonts.
 */
export function sanitizePdfText(input: string | null | undefined): string {
  if (!input) return '';
  let str = String(input);

  // Normalize Unicode
  str = str.normalize('NFC');

  // Replace curly quotes, smart typography, dashes, and bullets with clean equivalents
  str = str
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2014\u2015]/g, ' - ')
    .replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u25AA]/g, '·')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/\r\n/g, ' ')
    .replace(/[\r\n]+/g, ' ');

  // Strip emojis and astral plane characters
  str = str.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    ''
  );

  // Keep printable ASCII (32-126) and standard Latin-1 symbols (such as middle dot \u00B7)
  str = str.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

  // Collapse consecutive spaces
  str = str.replace(/[ \t]+/g, ' ');

  return str.trim();
}

/**
 * Formats star and fork counts into a clean, human-readable string.
 * Example: "8 stars · 0 forks"
 */
export function formatStarsAndForks(stars: number | null | undefined, forks: number | null | undefined): string {
  const s = typeof stars === 'number' && !isNaN(stars) ? stars : 0;
  const f = typeof forks === 'number' && !isNaN(forks) ? forks : 0;
  return `${s} stars · ${f} forks`;
}

/**
 * Fills the canvas of the current page with the dark background theme.
 */
function fillPageCanvas(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  doc.setFillColor(PDF_THEME.bgPage[0], PDF_THEME.bgPage[1], PDF_THEME.bgPage[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
}

/**
 * Draws a rounded card surface with subtle border stroke.
 */
function drawSurfaceCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 2,
  fillColor: [number, number, number] = PDF_THEME.bgCard,
  borderColor: [number, number, number] = PDF_THEME.borderSubtle
): void {
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, radius, radius, 'FD');
}

/**
 * Draws a compact branded header on subsequent pages (Page 2+).
 */
function drawCompactPageHeader(
  doc: jsPDF,
  username: string,
  sectionTitle: string,
  dateStr: string,
  marginX: number,
  contentWidth: number,
  pageWidth: number
): void {
  const headerY = 12;
  const headerHeight = 11;

  drawSurfaceCard(doc, marginX, headerY, contentWidth, headerHeight, 2, PDF_THEME.bgHeader, PDF_THEME.borderSubtle);

  // Left Brand + Candidate
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.violetLight[0], PDF_THEME.violetLight[1], PDF_THEME.violetLight[2]);
  doc.text('DEVPROFILE AI', marginX + 4, headerY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text('|', marginX + 31, headerY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
  doc.text(`@${username}`, marginX + 34, headerY + 7);

  // Right Section Indicator + Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text(`${sectionTitle}  ·  ${dateStr}`, pageWidth - marginX - 4, headerY + 7, { align: 'right' });
}

/**
 * Core factory that constructs the fully styled jsPDF document instance.
 */
export function createAnalysisPdfDoc(data: AnalysisResponse): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  const bottomContentLimit = pageHeight - 18;   // Safe limit before footer (leaving 18mm at bottom)
  let cursorY = 14;

  const username = sanitizePdfText(data.username) || 'Developer';
  const dateStr = new Date(data.analyzed_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  /**
   * Safe page break helper that ensures dark canvas and compact header on continuation pages.
   */
  const ensurePageSpace = (neededHeight: number, nextSectionTitle: string = 'Portfolio Audit Dossier'): void => {
    if (cursorY + neededHeight > bottomContentLimit) {
      doc.addPage();
      fillPageCanvas(doc, pageWidth, pageHeight);
      drawCompactPageHeader(doc, username, nextSectionTitle, dateStr, marginX, contentWidth, pageWidth);
      cursorY = 27;
    }
  };

  // =========================================================================
  // PAGE 1: Canvas & Executive Overview
  // =========================================================================
  fillPageCanvas(doc, pageWidth, pageHeight);

  // 1. Branded Header Banner (Height: 24mm)
  const headerHeight = 24;
  drawSurfaceCard(doc, marginX, cursorY, contentWidth, headerHeight, 2.5, PDF_THEME.bgHeader, PDF_THEME.borderSubtle);

  // DevProfile AI Logo Badge Pill
  const pillW = 28;
  const pillH = 5.5;
  doc.setFillColor(PDF_THEME.bgVioletPill[0], PDF_THEME.bgVioletPill[1], PDF_THEME.bgVioletPill[2]);
  doc.setDrawColor(PDF_THEME.borderViolet[0], PDF_THEME.borderViolet[1], PDF_THEME.borderViolet[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX + 5, cursorY + 4, pillW, pillH, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(PDF_THEME.violetLight[0], PDF_THEME.violetLight[1], PDF_THEME.violetLight[2]);
  doc.text('DEVPROFILE AI', marginX + 5 + pillW / 2, cursorY + 7.8, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text('Developer Portfolio & Technical Recruitment Audit', marginX + 37, cursorY + 7.8);

  // Candidate Name & Handle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
  const displayName = sanitizePdfText(data.profile?.name);
  const candidateHeading = displayName ? `${displayName} (@${username})` : `@${username}`;
  doc.text(candidateHeading, marginX + 5, cursorY + 16);

  // Bio or Tagline
  const rawBio = sanitizePdfText(data.profile?.bio);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_THEME.textSecondary[0], PDF_THEME.textSecondary[1], PDF_THEME.textSecondary[2]);
  if (rawBio) {
    const bioLine = rawBio.length > 85 ? `${rawBio.substring(0, 82)}...` : rawBio;
    doc.text(bioLine, marginX + 5, cursorY + 21);
  } else {
    doc.text('Verified Public GitHub Codebase & Activity Analysis', marginX + 5, cursorY + 21);
  }

  // Right Side Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text(`Audit Date: ${dateStr}`, pageWidth - marginX - 5, cursorY + 8, { align: 'right' });

  doc.setTextColor(PDF_THEME.textSecondary[0], PDF_THEME.textSecondary[1], PDF_THEME.textSecondary[2]);
  doc.text('Scope: Public GitHub Repositories', pageWidth - marginX - 5, cursorY + 14, { align: 'right' });

  // Mode Badge
  const isDemo = Boolean(data.is_demo_data);
  const modeText = isDemo ? 'OFFLINE DEMO' : 'LIVE AUDIT';
  const modeW = 22;
  const modeH = 4.5;
  doc.setFillColor(PDF_THEME.bgCardSubtle[0], PDF_THEME.bgCardSubtle[1], PDF_THEME.bgCardSubtle[2]);
  doc.setDrawColor(PDF_THEME.borderSubtle[0], PDF_THEME.borderSubtle[1], PDF_THEME.borderSubtle[2]);
  doc.roundedRect(pageWidth - marginX - 5 - modeW, cursorY + 16.5, modeW, modeH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(isDemo ? PDF_THEME.amber[0] : PDF_THEME.emerald[0], isDemo ? PDF_THEME.amber[1] : PDF_THEME.emerald[1], isDemo ? PDF_THEME.amber[2] : PDF_THEME.emerald[2]);
  doc.text(modeText, pageWidth - marginX - 5 - modeW / 2, cursorY + 19.8, { align: 'center' });

  cursorY += headerHeight + 4;

  // =========================================================================
  // 2. Executive Score Card & Assessment Summary (Height: 44mm)
  // =========================================================================
  const scoreCardW = 52;
  const summaryCardW = contentWidth - scoreCardW - 4; // 126mm
  const blockH = 43;

  // Left: Portfolio Score Card
  drawSurfaceCard(doc, marginX, cursorY, scoreCardW, blockH, 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text('PORTFOLIO SCORE', marginX + scoreCardW / 2, cursorY + 7, { align: 'center' });

  const scoreVal = Math.round(data.portfolio_score?.overall_score ?? 0);
  let scoreColor = PDF_THEME.amber;
  if (scoreVal >= 75) scoreColor = PDF_THEME.emerald;
  else if (scoreVal >= 55) scoreColor = PDF_THEME.violetLight;
  else if (scoreVal < 35) scoreColor = PDF_THEME.rose;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${scoreVal}`, marginX + scoreCardW / 2 - 5, cursorY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text('/ 100', marginX + scoreCardW / 2 + 10, cursorY + 20);

  // Tier Pill
  const tierText = sanitizePdfText(data.portfolio_score?.tier) || (scoreVal >= 75 ? 'Strong Tier' : 'Developing Tier');
  const tierPillW = 34;
  const tierPillH = 5.2;
  doc.setFillColor(PDF_THEME.bgCardSubtle[0], PDF_THEME.bgCardSubtle[1], PDF_THEME.bgCardSubtle[2]);
  doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(marginX + (scoreCardW - tierPillW) / 2, cursorY + 24, tierPillW, tierPillH, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(tierText, marginX + scoreCardW / 2, cursorY + 27.8, { align: 'center' });

  // Visual Score Gauge Bar
  const barW = 38;
  const barH = 2.5;
  const barX = marginX + (scoreCardW - barW) / 2;
  const barY = cursorY + 32.5;
  doc.setFillColor(PDF_THEME.bgCardSubtle[0], PDF_THEME.bgCardSubtle[1], PDF_THEME.bgCardSubtle[2]);
  doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');

  const filledW = Math.max(2, Math.min(barW, (scoreVal / 100) * barW));
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(barX, barY, filledW, barH, 1, 1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(PDF_THEME.textFaint[0], PDF_THEME.textFaint[1], PDF_THEME.textFaint[2]);
  doc.text('5-Pillar Normalized Benchmark', marginX + scoreCardW / 2, cursorY + 39.5, { align: 'center' });

  // Right: Executive Assessment Summary Card
  const summaryX = marginX + scoreCardW + 4;
  drawSurfaceCard(doc, summaryX, cursorY, summaryCardW, blockH, 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
  doc.text('Executive Assessment Summary', summaryX + 6, cursorY + 7);

  // Small AI synthesis tag
  doc.setFillColor(PDF_THEME.bgVioletPill[0], PDF_THEME.bgVioletPill[1], PDF_THEME.bgVioletPill[2]);
  doc.setDrawColor(PDF_THEME.borderViolet[0], PDF_THEME.borderViolet[1], PDF_THEME.borderViolet[2]);
  doc.roundedRect(summaryX + summaryCardW - 27, cursorY + 4, 22, 4.2, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(PDF_THEME.violetLight[0], PDF_THEME.violetLight[1], PDF_THEME.violetLight[2]);
  doc.text('AI SYNTHESIS', summaryX + summaryCardW - 16, cursorY + 7, { align: 'center' });

  // Summary Content (Wrapped to avoid truncation)
  const rawSummary =
    data.ai_analysis?.analysis?.summary ||
    data.portfolio_score?.summary ||
    'Comprehensive evaluation across GitHub repository documentation breadth, commit cadence, open-source hygiene, and technology stack diversity.';
  const cleanSummary = sanitizePdfText(rawSummary);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.textBody[0], PDF_THEME.textBody[1], PDF_THEME.textBody[2]);
  const splitSummary = doc.splitTextToSize(cleanSummary, summaryCardW - 12);
  doc.text(splitSummary.slice(0, 6), summaryX + 6, cursorY + 13, { lineHeightFactor: 1.35 });

  // Bottom note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(PDF_THEME.textFaint[0], PDF_THEME.textFaint[1], PDF_THEME.textFaint[2]);
  doc.text('Audit Scope: Synthesized from public repository metadata, README documentation, and commit patterns.', summaryX + 6, cursorY + 39.5);

  cursorY += blockH + 4;

  // =========================================================================
  // 3. Five-Pillar Score Breakdown (Height: ~60mm)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.violetPrimary[0], PDF_THEME.violetPrimary[1], PDF_THEME.violetPrimary[2]);
  doc.text('01 /', marginX, cursorY + 2);

  doc.setFontSize(9);
  doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
  doc.text('PORTFOLIO PILLAR BREAKDOWN', marginX + 8, cursorY + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text('5 Core Dimensions · 20 pts each · 100 max', pageWidth - marginX, cursorY + 2, { align: 'right' });

  cursorY += 5;

  const rawBreakdown: ScoreCategory[] = data.portfolio_score?.breakdown || [];
  const defaultCategories = [
    'Code Quality & Hygiene',
    'Documentation Breadth',
    'Technical Diversity',
    'Community & Collaboration',
    'Activity & Cadence',
  ];
  const breakdown: ScoreCategory[] = defaultCategories.map((defName, idx) => {
    const found = rawBreakdown.find((b) => b.category.toLowerCase().includes(defName.toLowerCase().split(' ')[0]));
    return (
      found ||
      rawBreakdown[idx] || {
        category: defName,
        score: Math.round(scoreVal / 5),
        max_score: 20,
        percentage: scoreVal,
        status: scoreVal >= 75 ? 'excellent' : scoreVal >= 55 ? 'good' : 'average',
        feedback: 'Evaluation calibrated against placement benchmarks.',
      }
    );
  });

  // Render Row 1: 3 cards
  const row1ColW = (contentWidth - 6) / 3; // ~58.6mm
  const cardH = 26;

  for (let i = 0; i < 3; i++) {
    const item = breakdown[i];
    const colX = marginX + i * (row1ColW + 3);
    drawSurfaceCard(doc, colX, cursorY, row1ColW, cardH, 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
    const cleanCat = sanitizePdfText(item.category);
    doc.text(cleanCat.length > 25 ? `${cleanCat.substring(0, 23)}...` : cleanCat, colX + 4, cursorY + 6);

    doc.setFontSize(11);
    doc.setTextColor(PDF_THEME.violetLight[0], PDF_THEME.violetLight[1], PDF_THEME.violetLight[2]);
    doc.text(`${item.score}`, colX + 4, cursorY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    doc.text(`/ ${item.max_score} pts`, colX + 13, cursorY + 13);

    const st = (item.status || 'good').toUpperCase();
    let stColor = PDF_THEME.emerald;
    if (st.includes('POOR') || st.includes('CRITICAL')) stColor = PDF_THEME.rose;
    else if (st.includes('AVERAGE') || st.includes('FOCUS')) stColor = PDF_THEME.amber;

    const stW = 20;
    const stH = 4;
    doc.setFillColor(PDF_THEME.bgCardSubtle[0], PDF_THEME.bgCardSubtle[1], PDF_THEME.bgCardSubtle[2]);
    doc.setDrawColor(stColor[0], stColor[1], stColor[2]);
    doc.roundedRect(colX + row1ColW - stW - 3, cursorY + 9.5, stW, stH, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(stColor[0], stColor[1], stColor[2]);
    doc.text(st, colX + row1ColW - 3 - stW / 2, cursorY + 12.5, { align: 'center' });

    const pBarW = row1ColW - 8;
    const pBarH = 1.8;
    doc.setFillColor(PDF_THEME.bgCardSubtle[0], PDF_THEME.bgCardSubtle[1], PDF_THEME.bgCardSubtle[2]);
    doc.roundedRect(colX + 4, cursorY + 16, pBarW, pBarH, 0.8, 0.8, 'F');

    const fillRatio = Math.max(0.05, Math.min(1, item.score / (item.max_score || 20)));
    doc.setFillColor(stColor[0], stColor[1], stColor[2]);
    doc.roundedRect(colX + 4, cursorY + 16, pBarW * fillRatio, pBarH, 0.8, 0.8, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    const cleanFb = sanitizePdfText(item.feedback) || `Calibrated score: ${item.percentage}% benchmark`;
    doc.text(cleanFb.length > 36 ? `${cleanFb.substring(0, 34)}...` : cleanFb, colX + 4, cursorY + 22);
  }

  cursorY += cardH + 3;

  // Render Row 2: 2 cards (balanced width)
  const row2ColW = (contentWidth - 4) / 2; // ~89mm
  for (let i = 3; i < 5; i++) {
    const item = breakdown[i] || breakdown[0];
    const colX = marginX + (i - 3) * (row2ColW + 4);
    drawSurfaceCard(doc, colX, cursorY, row2ColW, cardH, 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
    const cleanCat = sanitizePdfText(item.category);
    doc.text(cleanCat.length > 40 ? `${cleanCat.substring(0, 38)}...` : cleanCat, colX + 4, cursorY + 6);

    doc.setFontSize(11);
    doc.setTextColor(PDF_THEME.violetLight[0], PDF_THEME.violetLight[1], PDF_THEME.violetLight[2]);
    doc.text(`${item.score}`, colX + 4, cursorY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    doc.text(`/ ${item.max_score} pts`, colX + 13, cursorY + 13);

    const st = (item.status || 'good').toUpperCase();
    let stColor = PDF_THEME.emerald;
    if (st.includes('POOR') || st.includes('CRITICAL')) stColor = PDF_THEME.rose;
    else if (st.includes('AVERAGE') || st.includes('FOCUS')) stColor = PDF_THEME.amber;

    const stW = 24;
    const stH = 4;
    doc.setFillColor(PDF_THEME.bgCardSubtle[0], PDF_THEME.bgCardSubtle[1], PDF_THEME.bgCardSubtle[2]);
    doc.setDrawColor(stColor[0], stColor[1], stColor[2]);
    doc.roundedRect(colX + row2ColW - stW - 4, cursorY + 9.5, stW, stH, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(stColor[0], stColor[1], stColor[2]);
    doc.text(st, colX + row2ColW - 4 - stW / 2, cursorY + 12.5, { align: 'center' });

    const pBarW = row2ColW - 8;
    const pBarH = 1.8;
    doc.setFillColor(PDF_THEME.bgCardSubtle[0], PDF_THEME.bgCardSubtle[1], PDF_THEME.bgCardSubtle[2]);
    doc.roundedRect(colX + 4, cursorY + 16, pBarW, pBarH, 0.8, 0.8, 'F');

    const fillRatio = Math.max(0.05, Math.min(1, item.score / (item.max_score || 20)));
    doc.setFillColor(stColor[0], stColor[1], stColor[2]);
    doc.roundedRect(colX + 4, cursorY + 16, pBarW * fillRatio, pBarH, 0.8, 0.8, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    const cleanFb = sanitizePdfText(item.feedback) || `Calibrated score: ${item.percentage}% benchmark`;
    doc.text(cleanFb.length > 55 ? `${cleanFb.substring(0, 52)}...` : cleanFb, colX + 4, cursorY + 22);
  }

  cursorY += cardH + 4;

  // =========================================================================
  // 4. Key Strengths & Priority Improvement Opportunities (Height: ~95mm)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.violetPrimary[0], PDF_THEME.violetPrimary[1], PDF_THEME.violetPrimary[2]);
  doc.text('02 /', marginX, cursorY + 2);

  doc.setFontSize(9);
  doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
  doc.text('CORE STRENGTHS & IMPROVEMENT OPPORTUNITIES', marginX + 8, cursorY + 2);

  cursorY += 5;

  const colW = (contentWidth - 4) / 2; // 89mm
  const strengthsWeaknessesH = 88;

  // Left Card: Strengths
  drawSurfaceCard(doc, marginX, cursorY, colW, strengthsWeaknessesH, 2.5);

  doc.setFillColor(PDF_THEME.emerald[0], PDF_THEME.emerald[1], PDF_THEME.emerald[2]);
  doc.circle(marginX + 6, cursorY + 7, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.emerald[0], PDF_THEME.emerald[1], PDF_THEME.emerald[2]);
  doc.text('KEY STRENGTHS & EVIDENCE', marginX + 10, cursorY + 8);

  const rawStrengths = data.ai_analysis?.analysis?.strengths || [];
  const activeStrengths = rawStrengths.length > 0
    ? rawStrengths.slice(0, 4)
    : [
        'Demonstrates consistent repository version control cadence.',
        'Core repositories feature active branch maintenance.',
        'Technical stack breadth matches modern developer expectations.',
      ];

  let strY = cursorY + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_THEME.textBody[0], PDF_THEME.textBody[1], PDF_THEME.textBody[2]);

  for (const s of activeStrengths) {
    const cleanS = sanitizePdfText(s);
    doc.setFillColor(PDF_THEME.emerald[0], PDF_THEME.emerald[1], PDF_THEME.emerald[2]);
    doc.circle(marginX + 6, strY + 1.2, 0.7, 'F');

    const lines = doc.splitTextToSize(cleanS, colW - 13);
    doc.text(lines, marginX + 9, strY + 2.2, { lineHeightFactor: 1.3 });
    strY += lines.length * 3.6 + 3.2;
  }

  // Right Card: Weaknesses / Improvement Opportunities
  const rightColX = marginX + colW + 4;
  drawSurfaceCard(doc, rightColX, cursorY, colW, strengthsWeaknessesH, 2.5);

  doc.setFillColor(PDF_THEME.amber[0], PDF_THEME.amber[1], PDF_THEME.amber[2]);
  doc.circle(rightColX + 6, cursorY + 7, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.amber[0], PDF_THEME.amber[1], PDF_THEME.amber[2]);
  doc.text('PRIORITY IMPROVEMENT OPPORTUNITIES', rightColX + 10, cursorY + 8);

  const rawWeaknesses = data.ai_analysis?.analysis?.weaknesses || [];
  const activeWeaknesses = rawWeaknesses.length > 0
    ? rawWeaknesses.slice(0, 4)
    : [
        'Add formal Open Source licenses (MIT, Apache-2.0) across public repositories.',
        'Expand README documentation with live architecture diagrams and demo URLs.',
        'Add GitHub repository topic tags to enhance discovery and categorization.',
      ];

  let weakY = cursorY + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_THEME.textBody[0], PDF_THEME.textBody[1], PDF_THEME.textBody[2]);

  for (const w of activeWeaknesses) {
    const cleanW = sanitizePdfText(w);
    doc.setFillColor(PDF_THEME.amber[0], PDF_THEME.amber[1], PDF_THEME.amber[2]);
    doc.circle(rightColX + 6, weakY + 1.2, 0.7, 'F');

    const lines = doc.splitTextToSize(cleanW, colW - 13);
    doc.text(lines, rightColX + 9, weakY + 2.2, { lineHeightFactor: 1.3 });
    weakY += lines.length * 3.6 + 3.2;
  }

  // =========================================================================
  // PAGE 2: Repository Insights & Actionable Career Recommendations
  // =========================================================================
  doc.addPage();
  fillPageCanvas(doc, pageWidth, pageHeight);
  drawCompactPageHeader(doc, username, 'Repository Evidence & Action Plan', dateStr, marginX, contentWidth, pageWidth);
  cursorY = 27;

  // 5. Repository Insights & Stack Breadth (Height: ~30mm)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.violetPrimary[0], PDF_THEME.violetPrimary[1], PDF_THEME.violetPrimary[2]);
  doc.text('03 /', marginX, cursorY + 2);

  doc.setFontSize(9);
  doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
  doc.text('REPOSITORY INSIGHTS & STACK BREADTH', marginX + 8, cursorY + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text('Aggregate GitHub Metrics & Codebase Signals', pageWidth - marginX, cursorY + 2, { align: 'right' });

  cursorY += 5;

  // 4 Metric Highlight Cards in a horizontal row
  const metricColW = (contentWidth - 9) / 4; // ~43.25mm
  const metricH = 17;
  const stats = data.stats || {
    total_public_repos: 0,
    total_analyzed_repos: 0,
    total_stars: 0,
    total_forks: 0,
    detected_languages_count: 0,
    primary_language: 'Various',
  };

  const metricCards = [
    {
      title: 'PUBLIC REPOSITORIES',
      main: `${stats.total_public_repos}`,
      sub: `Analyzed: ${stats.total_analyzed_repos}`,
      color: PDF_THEME.violetLight,
    },
    {
      title: 'COMMUNITY TRACTION',
      main: `${stats.total_stars} stars`,
      sub: `${stats.total_forks} total forks`,
      color: PDF_THEME.amber,
    },
    {
      title: 'PRIMARY LANGUAGE',
      main: sanitizePdfText(stats.primary_language) || 'Full Stack',
      sub: `${stats.detected_languages_count} languages detected`,
      color: PDF_THEME.teal,
    },
    {
      title: 'DOCUMENTATION HYGIENE',
      main: `${Math.round(data.quality_checklist?.repos_with_description_pct ?? 80)}% bio`,
      sub: `${Math.round(data.quality_checklist?.repos_with_license_pct ?? 50)}% with license`,
      color: PDF_THEME.emerald,
    },
  ];

  for (let m = 0; m < 4; m++) {
    const card = metricCards[m];
    const mX = marginX + m * (metricColW + 3);
    drawSurfaceCard(doc, mX, cursorY, metricColW, metricH, 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    doc.text(card.title, mX + 4, cursorY + 5);

    doc.setFontSize(9.5);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.main, mX + 4, cursorY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(PDF_THEME.textFaint[0], PDF_THEME.textFaint[1], PDF_THEME.textFaint[2]);
    doc.text(card.sub, mX + 4, cursorY + 14.5);
  }

  cursorY += metricH + 3;

  // Language Distribution Pill Bar (if languages available)
  const languages = data.languages || [];
  if (languages.length > 0) {
    const langBarH = 7;
    drawSurfaceCard(doc, marginX, cursorY, contentWidth, langBarH, 1.5, PDF_THEME.bgHeader, PDF_THEME.borderSubtle);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    doc.text('STACK BREADTH:', marginX + 4, cursorY + 4.6);

    const topLangs = languages.slice(0, 5);
    const langParts = topLangs.map((l) => `${sanitizePdfText(l.language)} (${Math.round(l.percentage)}%)`);
    const langString = langParts.join('   ·   ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(PDF_THEME.textBody[0], PDF_THEME.textBody[1], PDF_THEME.textBody[2]);
    doc.text(langString, marginX + 27, cursorY + 4.6);

    cursorY += langBarH + 4;
  } else {
    cursorY += 2;
  }

  // =========================================================================
  // 6. Selected Repositories Table (Clean, multi-line, formatted)
  // =========================================================================
  const allRepos: RepositoryItem[] = data.top_repositories || [];
  const displayRepos = allRepos.slice(0, 5);
  const totalAnalyzed = Math.max(stats.total_public_repos || 0, stats.total_analyzed_repos || 0, displayRepos.length);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
  doc.text(`Selected Repositories (Sample: showing ${displayRepos.length} of ${totalAnalyzed} public repos analyzed)`, marginX, cursorY + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
  doc.text('Evaluated for documentation hygiene, technical stack, and engagement', pageWidth - marginX, cursorY + 2, { align: 'right' });

  cursorY += 5;

  if (displayRepos.length > 0) {
    // Table Header Row
    const tableHeaderH = 6.5;
    doc.setFillColor(26, 35, 56); // #1A2338
    doc.setDrawColor(PDF_THEME.borderSubtle[0], PDF_THEME.borderSubtle[1], PDF_THEME.borderSubtle[2]);
    doc.setLineWidth(0.25);
    doc.rect(marginX, cursorY, contentWidth, tableHeaderH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
    doc.text('REPOSITORY & STACK', marginX + 4, cursorY + 4.4);
    doc.text('ENGAGEMENT', marginX + 56, cursorY + 4.4);
    doc.text('DESCRIPTION & CODE QUALITY AUDIT', marginX + 96, cursorY + 4.4);

    cursorY += tableHeaderH;

    // Table Data Rows
    for (let r = 0; r < displayRepos.length; r++) {
      const repo = displayRepos[r];
      const repoName = sanitizePdfText(repo.name) || 'repository';
      const repoLang = sanitizePdfText(repo.language) || 'Codebase';
      const engagementText = formatStarsAndForks(repo.stargazers_count, repo.forks_count);

      const rawDesc = sanitizePdfText(repo.description) || 'No description provided in repository metadata.';
      const descLines = doc.splitTextToSize(rawDesc, 80);
      const activeDescLines = descLines.slice(0, 3);

      const nameLines = doc.splitTextToSize(repoName, 46);
      // Ensure row height accommodates name lines + separate language badge line without overlap
      const col1Height = nameLines.length * 3.8 + 6.0;
      const col3Height = activeDescLines.length * 3.5 + 4.0;
      const rowHeight = Math.max(15, Math.max(col1Height, col3Height));

      ensurePageSpace(rowHeight + 2, 'Repository Evidence & Quality Audit');

      const isEven = r % 2 === 0;
      const rowFill = isEven ? PDF_THEME.bgHeader : PDF_THEME.bgRowAlt;
      doc.setFillColor(rowFill[0], rowFill[1], rowFill[2]);
      doc.setDrawColor(PDF_THEME.borderSubtle[0], PDF_THEME.borderSubtle[1], PDF_THEME.borderSubtle[2]);
      doc.rect(marginX, cursorY, contentWidth, rowHeight, 'FD');

      // Col 1: Name + Language pill cleanly below the name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_THEME.violetLight[0], PDF_THEME.violetLight[1], PDF_THEME.violetLight[2]);
      doc.text(nameLines, marginX + 4, cursorY + 4.8);

      const langY = cursorY + 4.8 + nameLines.length * 3.8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(PDF_THEME.teal[0], PDF_THEME.teal[1], PDF_THEME.teal[2]);
      doc.text(`[${repoLang}]`, marginX + 4, langY);

      // Col 2: Engagement (stars & forks formatting fixed!)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(PDF_THEME.textBody[0], PDF_THEME.textBody[1], PDF_THEME.textBody[2]);
      doc.text(engagementText, marginX + 56, cursorY + 5.2);

      const qualityScore = Math.round(repo.quality_score || (repo.has_readme ? 80 : 50));
      const licenseNote = repo.has_license ? (sanitizePdfText(repo.license_name) || 'Licensed') : 'No License';
      doc.setFontSize(6.2);
      doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
      doc.text(`Hygiene: ${qualityScore}/100  ·  ${licenseNote}`, marginX + 56, cursorY + 9.4);

      // Col 3: Description & Quality Notes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(repo.description ? PDF_THEME.textBody[0] : PDF_THEME.textFaint[0], repo.description ? PDF_THEME.textBody[1] : PDF_THEME.textFaint[1], repo.description ? PDF_THEME.textBody[2] : PDF_THEME.textFaint[2]);
      doc.text(activeDescLines, marginX + 96, cursorY + 5.0, { lineHeightFactor: 1.3 });

      cursorY += rowHeight;
    }

    cursorY += 5;
  } else {
    // Empty state fallback for accounts with 0 repos
    drawSurfaceCard(doc, marginX, cursorY, contentWidth, 14, 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    doc.text('No public repositories available for granular audit inspection.', marginX + 6, cursorY + 8);
    cursorY += 18;
  }

  // =========================================================================
  // 7. Actionable Career Recommendations (Full text, wrapped, no truncation)
  // =========================================================================
  const allRecs: RecommendationItem[] = data.recommendations || [];
  const recsToRender = allRecs.slice(0, 4);

  if (recsToRender.length > 0) {
    ensurePageSpace(28, 'Actionable Career Recommendations');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(PDF_THEME.violetPrimary[0], PDF_THEME.violetPrimary[1], PDF_THEME.violetPrimary[2]);
    doc.text('04 /', marginX, cursorY + 2);

    doc.setFontSize(9);
    doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
    doc.text('ACTIONABLE CAREER RECOMMENDATIONS', marginX + 8, cursorY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    doc.text('Prioritized Steps for Recruiter Appeal & Placement Readiness', pageWidth - marginX, cursorY + 2, { align: 'right' });

    cursorY += 5;

    for (let i = 0; i < recsToRender.length; i++) {
      const rec = recsToRender[i];
      const priority = (rec.priority || 'medium').toLowerCase();
      const cleanTitle = sanitizePdfText(rec.title) || 'Portfolio Enhancement';
      const cleanAction = sanitizePdfText(rec.action) || 'Review repository documentation and architecture.';
      const cleanImpact = sanitizePdfText(rec.impact);
      const cleanCat = sanitizePdfText(rec.category || 'General').toUpperCase();

      // Wrap title, action, and impact across full card width
      const maxTextW = contentWidth - 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      const titleLines = doc.splitTextToSize(cleanTitle, maxTextW);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const actionLines = doc.splitTextToSize(`Action: ${cleanAction}`, maxTextW);
      const impactLines = cleanImpact ? doc.splitTextToSize(`Expected Impact: ${cleanImpact}`, maxTextW) : [];

      const neededCardH = 11 + titleLines.length * 3.8 + actionLines.length * 3.4 + (impactLines.length > 0 ? impactLines.length * 3.4 + 2 : 0);
      ensurePageSpace(neededCardH + 3, 'Actionable Career Recommendations');

      drawSurfaceCard(doc, marginX, cursorY, contentWidth, neededCardH, 2);

      // Top Row: Priority Badge + Category Pill
      let pColor = PDF_THEME.violetLight;
      let pFill = PDF_THEME.bgVioletPill;
      if (priority === 'high') {
        pColor = PDF_THEME.rose;
        pFill = [45, 20, 28];
      } else if (priority === 'low') {
        pColor = PDF_THEME.teal;
        pFill = [18, 35, 45];
      }

      const pW = 16;
      const pH = 4.2;
      doc.setFillColor(pFill[0], pFill[1], pFill[2]);
      doc.setDrawColor(pColor[0], pColor[1], pColor[2]);
      doc.roundedRect(marginX + 4, cursorY + 3.5, pW, pH, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(pColor[0], pColor[1], pColor[2]);
      doc.text(priority.toUpperCase(), marginX + 4 + pW / 2, cursorY + 6.4, { align: 'center' });

      // Category tag placed with comfortable spacing after the priority badge
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(PDF_THEME.textFaint[0], PDF_THEME.textFaint[1], PDF_THEME.textFaint[2]);
      doc.text(`[${cleanCat}]`, marginX + 23, cursorY + 6.4);

      // Prominent Title on its own row below priority/category header
      let textCursor = cursorY + 11.6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(PDF_THEME.textWhite[0], PDF_THEME.textWhite[1], PDF_THEME.textWhite[2]);
      doc.text(titleLines, marginX + 4, textCursor, { lineHeightFactor: 1.25 });
      textCursor += titleLines.length * 3.8 + 0.8;

      // Action Text (multi-line)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(PDF_THEME.textBody[0], PDF_THEME.textBody[1], PDF_THEME.textBody[2]);
      doc.text(actionLines, marginX + 4, textCursor, { lineHeightFactor: 1.3 });
      textCursor += actionLines.length * 3.4;

      // Impact Text (multi-line in emerald)
      if (impactLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(PDF_THEME.emerald[0], PDF_THEME.emerald[1], PDF_THEME.emerald[2]);
        doc.text(impactLines, marginX + 4, textCursor + 1.2, { lineHeightFactor: 1.3 });
      }

      cursorY += neededCardH + 3;
    }
  }

  // =========================================================================
  // 8. Global Footers (Page X of Y)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(PDF_THEME.borderSubtle[0], PDF_THEME.borderSubtle[1], PDF_THEME.borderSubtle[2]);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(PDF_THEME.textMuted[0], PDF_THEME.textMuted[1], PDF_THEME.textMuted[2]);
    doc.text('DevProfile AI — Confidential Developer Portfolio & Placement Audit', marginX, pageHeight - 7);

    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }

  return doc;
}

/**
 * Generates and triggers browser download of the redesigned DevProfile AI PDF report.
 * Preserves the exact filename pattern: devprofile-${data.username}-report.pdf
 */
export async function generateAnalysisPdf(data: AnalysisResponse): Promise<void> {
  const doc = createAnalysisPdfDoc(data);
  const cleanUsername = sanitizePdfText(data.username) || 'developer';
  const filename = `devprofile-${cleanUsername}-report.pdf`;
  doc.save(filename);
}
