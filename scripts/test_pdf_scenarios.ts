import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Use jspdf from frontend
import { createAnalysisPdfDoc, sanitizePdfText, formatStarsAndForks } from '../frontend/src/services/pdfReportGenerator.ts';
import type { AnalysisResponse } from '../frontend/src/types/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Base mock builder
// ---------------------------------------------------------------------------
function buildMockAnalysis(overrides: Partial<AnalysisResponse> = {}): AnalysisResponse {
  return {
    username: 'octocat',
    analyzed_at: '2026-11-26T01:00:00Z',
    is_demo_data: false,
    profile: {
      login: 'octocat',
      name: 'The Octocat',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
      html_url: 'https://github.com/octocat',
      bio: 'Open source enthusiast & full-stack architect building developer productivity systems.',
      company: '@github',
      location: 'San Francisco, CA',
      blog: 'https://github.blog',
      twitter_username: 'github',
      public_repos: 8,
      public_gists: 4,
      followers: 12500,
      following: 9,
      created_at: '2011-01-25T18:44:36Z',
      updated_at: '2026-11-20T12:00:00Z',
      account_age_years: 15,
    },
    stats: {
      total_stars: 4200,
      total_forks: 1850,
      total_public_repos: 8,
      total_analyzed_repos: 8,
      detected_languages_count: 5,
      primary_language: 'TypeScript',
      average_stars_per_repo: 525,
      total_open_issues: 42,
    },
    languages: [
      { language: 'TypeScript', repo_count: 4, percentage: 50, color: '#3178c6' },
      { language: 'Python', repo_count: 2, percentage: 25, color: '#3572A5' },
      { language: 'Go', repo_count: 1, percentage: 15, color: '#00ADD8' },
      { language: 'Rust', repo_count: 1, percentage: 10, color: '#dea584' },
    ],
    portfolio_score: {
      overall_score: 84,
      tier: 'Strong',
      summary: 'Demonstrates exemplary repository hygiene, comprehensive architecture documentation, and active open-source contribution velocity across production codebases.',
      breakdown: [
        {
          category: 'Code Quality & Hygiene',
          score: 18,
          max_score: 20,
          percentage: 90,
          status: 'excellent',
          feedback: 'High linting consistency and clean branching practices across core repositories.',
        },
        {
          category: 'Documentation Breadth',
          score: 17,
          max_score: 20,
          percentage: 85,
          status: 'good',
          feedback: 'README files include architectural overviews and clear local development setup.',
        },
        {
          category: 'Technical Diversity',
          score: 16,
          max_score: 20,
          percentage: 80,
          status: 'good',
          feedback: 'Solid polyglot experience spanning modern TypeScript, Python, and Go microservices.',
        },
        {
          category: 'Community & Collaboration',
          score: 17,
          max_score: 20,
          percentage: 85,
          status: 'good',
          feedback: 'Strong fork and star traction with active issue resolution cadence.',
        },
        {
          category: 'Activity & Cadence',
          score: 16,
          max_score: 20,
          percentage: 80,
          status: 'good',
          feedback: 'Consistent commit history with weekly contributions over the past 6 months.',
        },
      ],
      disclaimer: 'Score calibrated using DevProfile AI public GitHub benchmark metrics.',
    },
    quality_checklist: {
      total_repos_analyzed: 8,
      repos_with_description: 8,
      repos_with_description_pct: 100,
      repos_with_topics: 7,
      repos_with_topics_pct: 88,
      repos_with_license: 8,
      repos_with_license_pct: 100,
      repos_active_within_6_months: 6,
      repos_active_within_6_months_pct: 75,
      original_repos_count: 7,
      forked_repos_count: 1,
      pinned_notice: 'Standard repository configuration verified.',
    },
    top_repositories: [
      {
        id: 101,
        name: 'Spoon-Knife',
        full_name: 'octocat/Spoon-Knife',
        description: 'The archetype repository for learning Git branching, pull requests, and distributed collaboration.',
        html_url: 'https://github.com/octocat/Spoon-Knife',
        language: 'HTML',
        stargazers_count: 14200,
        forks_count: 14000,
        open_issues_count: 12,
        watchers_count: 14200,
        has_readme: true,
        has_description: true,
        has_topics: true,
        has_license: true,
        license_name: 'MIT',
        topics: ['git', 'collaboration', 'education'],
        is_fork: false,
        created_at: '2011-01-27T19:30:43Z',
        updated_at: '2026-11-20T12:00:00Z',
        pushed_at: '2026-11-15T12:00:00Z',
        days_since_last_push: 5,
        quality_score: 95,
      },
      {
        id: 102,
        name: 'Hello-World',
        full_name: 'octocat/Hello-World',
        description: 'First GitHub repository for testing commits, releases, and basic automation.',
        html_url: 'https://github.com/octocat/Hello-World',
        language: 'TypeScript',
        stargazers_count: 2400,
        forks_count: 2100,
        open_issues_count: 4,
        watchers_count: 2400,
        has_readme: true,
        has_description: true,
        has_topics: true,
        has_license: true,
        license_name: 'Apache-2.0',
        topics: ['starter', 'typescript'],
        is_fork: false,
        created_at: '2011-01-26T19:01:12Z',
        updated_at: '2026-11-18T10:00:00Z',
        pushed_at: '2026-11-10T10:00:00Z',
        days_since_last_push: 10,
        quality_score: 88,
      },
      {
        id: 103,
        name: 'git-consortium',
        full_name: 'octocat/git-consortium',
        description: 'Organizational repository for coordinating open specifications and toolchains.',
        html_url: 'https://github.com/octocat/git-consortium',
        language: 'Go',
        stargazers_count: 420,
        forks_count: 85,
        open_issues_count: 2,
        watchers_count: 420,
        has_readme: true,
        has_description: true,
        has_topics: false,
        has_license: true,
        license_name: 'MIT',
        topics: [],
        is_fork: false,
        created_at: '2014-04-03T18:00:00Z',
        updated_at: '2026-10-15T08:00:00Z',
        pushed_at: '2026-10-01T08:00:00Z',
        days_since_last_push: 50,
        quality_score: 82,
      },
      {
        id: 104,
        name: 'linguist-sample',
        full_name: 'octocat/linguist-sample',
        description: 'Language detection testing corpus with syntax samples and build configurations.',
        html_url: 'https://github.com/octocat/linguist-sample',
        language: 'Ruby',
        stargazers_count: 180,
        forks_count: 32,
        open_issues_count: 1,
        watchers_count: 180,
        has_readme: true,
        has_description: true,
        has_topics: true,
        has_license: true,
        license_name: 'BSD-3-Clause',
        topics: ['linguist', 'syntax'],
        is_fork: false,
        created_at: '2015-06-12T12:00:00Z',
        updated_at: '2026-09-01T14:00:00Z',
        pushed_at: '2026-08-20T14:00:00Z',
        days_since_last_push: 90,
        quality_score: 79,
      },
      {
        id: 105,
        name: 'octocat.github.io',
        full_name: 'octocat/octocat.github.io',
        description: 'Personal technical portfolio blog and interactive project showcase hosted on GitHub Pages.',
        html_url: 'https://github.com/octocat/octocat.github.io',
        language: 'JavaScript',
        stargazers_count: 850,
        forks_count: 230,
        open_issues_count: 3,
        watchers_count: 850,
        has_readme: true,
        has_description: true,
        has_topics: true,
        has_license: false,
        license_name: null,
        topics: ['portfolio', 'github-pages'],
        is_fork: false,
        created_at: '2013-03-08T15:00:00Z',
        updated_at: '2026-11-01T16:00:00Z',
        pushed_at: '2026-11-01T16:00:00Z',
        days_since_last_push: 25,
        quality_score: 76,
      },
    ],
    recommendations: [
      {
        id: 'rec-1',
        priority: 'high',
        category: 'Licensing & Compliance',
        title: 'Add Open Source Licenses to Unlicensed Projects',
        description: 'Several repositories lack a standard OSI-approved license.',
        action: 'Add standard MIT or Apache 2.0 license files to octocat.github.io to clarify reuse permissions for recruiters and contributors.',
        impact: 'Boosts Code Hygiene score from 85% to 95% and guarantees compliance clearance during recruitment diligence.',
      },
      {
        id: 'rec-2',
        priority: 'medium',
        category: 'Documentation & Architecture',
        title: 'Include System Architecture Diagrams in Key Repositories',
        description: 'Core projects have concise README files but lack visual component architecture.',
        action: 'Embed Mermaid diagrams and live demo links within repository READMEs to demonstrate end-to-end design thinking to hiring managers.',
        impact: 'Demonstrates senior-level technical communication and speeds up technical interview walkthroughs.',
      },
      {
        id: 'rec-3',
        priority: 'medium',
        category: 'CI/CD & Testing',
        title: 'Attach Automated GitHub Actions Workflows',
        description: 'Automated test pipelines are missing from secondary repositories.',
        action: 'Configure GitHub Actions CI workflows with automated test execution, code coverage reporting, and lint checks on pull requests.',
        impact: 'Direct evidence of DevOps familiarity and enterprise-grade software delivery practices.',
      },
    ],
    ai_analysis: {
      status: 'success',
      model_used: 'llama-3.3-70b-versatile',
      is_mock: false,
      error_message: null,
      analysis: {
        summary: 'Exceptional open-source footprint with outstanding community adoption across major repositories. Codebase signals exhibit mature development practices, active collaboration, and solid documentation discipline.',
        strengths: [
          'High community traction with over 17,000 combined stars and 16,000 forks across top repositories.',
          'Consistently detailed README documentation with clear onboarding steps for new contributors.',
          'Active branch maintenance and regular version-controlled releases.',
          'Broad technology diversity spanning TypeScript, Go, Python, and modern web frameworks.',
        ],
        weaknesses: [
          'A subset of peripheral repositories lack formal open-source license declarations.',
          'Automated CI/CD workflow badges could be more prominently displayed in repository headers.',
          'Live interactive deployment demos could be linked in project metadata for instant verification.',
        ],
        project_feedback: [],
        profile_improvements: [],
        placement_readiness: [],
        recommendations: [],
        roadmap_7_days: [],
        roadmap_30_days: [],
        missing_evidence: [],
      },
    },
    roadmap_7_day: {
      title: '7-Day Quick Wins',
      timeline: 'Week 1',
      objective: 'Address immediate repository hygiene gaps.',
      is_mock_ai: false,
      ai_engine_badge: 'Groq Llama 3.3',
      steps: [],
    },
    roadmap_30_day: {
      title: '30-Day Strategic Roadmap',
      timeline: 'Month 1',
      objective: 'Transform portfolio into a competitive recruiter showcase.',
      is_mock_ai: false,
      ai_engine_badge: 'Groq Llama 3.3',
      steps: [],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Run Test Scenarios
// ---------------------------------------------------------------------------
async function runAllScenarios() {
  console.log('===============================================================');
  console.log('DevProfile AI — PDF Redesign Verification & Visual Stress Tests');
  console.log('===============================================================\n');

  // Test 1: Baseline High-Volume Profile (Many repos)
  console.log('1. Testing Scenario A: Profile with many repositories (45 public repos)...');
  const scenarioA = buildMockAnalysis({
    username: 'alex-developer',
    stats: {
      total_stars: 840,
      total_forks: 190,
      total_public_repos: 45,
      total_analyzed_repos: 30,
      detected_languages_count: 8,
      primary_language: 'TypeScript',
      average_stars_per_repo: 18.6,
      total_open_issues: 14,
    },
  });
  const docA = createAnalysisPdfDoc(scenarioA);
  const pdfBytesA = Buffer.from(docA.output('arraybuffer'));
  const pathA = path.join(outputDir, 'scenario-a-many-repos.pdf');
  fs.writeFileSync(pathA, pdfBytesA);
  console.log(`   -> Generated ${pathA} (${pdfBytesA.length} bytes, ${docA.getNumberOfPages()} pages)`);
  if (docA.getNumberOfPages() < 2) throw new Error('Scenario A should have at least 2 pages');

  // Test 2: Profile with very few repositories (0 or 1 repo)
  console.log('\n2. Testing Scenario B: Profile with very few repositories (1 repo, 0 stars)...');
  const scenarioB = buildMockAnalysis({
    username: 'junior-dev-fresh',
    profile: {
      login: 'junior-dev-fresh',
      name: 'Fresh Graduate',
      avatar_url: '',
      html_url: 'https://github.com/junior-dev-fresh',
      bio: null,
      company: null,
      location: 'Bangalore, India',
      blog: null,
      twitter_username: null,
      public_repos: 1,
      public_gists: 0,
      followers: 2,
      following: 12,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
      account_age_years: 0.3,
    },
    stats: {
      total_stars: 0,
      total_forks: 0,
      total_public_repos: 1,
      total_analyzed_repos: 1,
      detected_languages_count: 1,
      primary_language: 'JavaScript',
      average_stars_per_repo: 0,
      total_open_issues: 0,
    },
    languages: [{ language: 'JavaScript', repo_count: 1, percentage: 100, color: '#f1e05a' }],
    top_repositories: [
      {
        id: 999,
        name: 'student-capstone-project',
        full_name: 'junior-dev-fresh/student-capstone-project',
        description: null,
        html_url: 'https://github.com/junior-dev-fresh/student-capstone-project',
        language: 'JavaScript',
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        watchers_count: 0,
        has_readme: false,
        has_description: false,
        has_topics: false,
        has_license: false,
        license_name: null,
        topics: [],
        is_fork: false,
        created_at: '2026-08-05T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        pushed_at: '2026-10-01T00:00:00Z',
        days_since_last_push: 56,
        quality_score: 35,
      },
    ],
  });
  const docB = createAnalysisPdfDoc(scenarioB);
  const pdfBytesB = Buffer.from(docB.output('arraybuffer'));
  const pathB = path.join(outputDir, 'scenario-b-few-repos.pdf');
  fs.writeFileSync(pathB, pdfBytesB);
  console.log(`   -> Generated ${pathB} (${pdfBytesB.length} bytes, ${docB.getNumberOfPages()} pages)`);
  if (docB.getNumberOfPages() < 2) throw new Error('Scenario B should have 2 pages');

  // Test 3: Long Repository Names, Complex Unicode & Emojis
  console.log('\n3. Testing Scenario C: Long repository names, emojis, and special Unicode typography...');
  const scenarioC = buildMockAnalysis({
    username: 'unicode-stress-tester',
    top_repositories: [
      {
        id: 701,
        name: 'enterprise-distributed-microservices-event-driven-mesh-telemetry-engine',
        full_name: 'unicode-stress-tester/enterprise-distributed-microservices-event-driven-mesh-telemetry-engine',
        description: '⚡ Ultra-fast distributed mesh featuring “smart” adaptive load-balancing, gRPC streams, & real-time analytics — production tested! 🚀 Zero latency ★ 100% SLA.',
        html_url: 'https://github.com/test/mesh',
        language: 'Rust',
        stargazers_count: 8,
        forks_count: 0,
        open_issues_count: 2,
        watchers_count: 8,
        has_readme: true,
        has_description: true,
        has_topics: true,
        has_license: true,
        license_name: 'Apache-2.0',
        topics: ['microservices', 'telemetry', 'rust'],
        is_fork: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2026-11-20T00:00:00Z',
        pushed_at: '2026-11-20T00:00:00Z',
        days_since_last_push: 6,
        quality_score: 92,
      },
      {
        id: 702,
        name: 'ai-powered-natural-language-document-retrieval-and-summarization-pipeline',
        full_name: 'unicode-stress-tester/ai-powered-natural-language-document-retrieval-and-summarization-pipeline',
        description: '🔥 Next-gen RAG search with vector embeddings, hybrid semantic indexing, and automated citation synthesis. Tested on 500k+ enterprise manuals.',
        html_url: 'https://github.com/test/rag',
        language: 'Python',
        stargazers_count: 34,
        forks_count: 5,
        open_issues_count: 0,
        watchers_count: 34,
        has_readme: true,
        has_description: true,
        has_topics: true,
        has_license: true,
        license_name: 'MIT',
        topics: ['ai', 'rag', 'vector-database'],
        is_fork: false,
        created_at: '2025-04-01T00:00:00Z',
        updated_at: '2026-11-15T00:00:00Z',
        pushed_at: '2026-11-15T00:00:00Z',
        days_since_last_push: 11,
        quality_score: 89,
      },
    ],
  });
  const docC = createAnalysisPdfDoc(scenarioC);
  const pdfBytesC = Buffer.from(docC.output('arraybuffer'));
  const pathC = path.join(outputDir, 'scenario-c-long-names-unicode.pdf');
  fs.writeFileSync(pathC, pdfBytesC);
  console.log(`   -> Generated ${pathC} (${pdfBytesC.length} bytes, ${docC.getNumberOfPages()} pages)`);

  // Verify that the PDF stream does not contain corrupted emoji artifacts
  const rawStrC = docC.output();
  if (rawStrC.includes('Ø=Þ€')) {
    throw new Error('Corrupted emoji sequence Ø=Þ€ detected in Scenario C output!');
  }
  // Verify clean formatting of stars and forks
  if (!rawStrC.includes('8 stars · 0 forks')) {
    throw new Error('Expected "8 stars · 0 forks" formatting not found in Scenario C!');
  }

  // Test 4: Missing profile metadata
  console.log('\n4. Testing Scenario D: Completely missing profile metadata (null bio, null name, null company)...');
  const scenarioD = buildMockAnalysis({
    username: 'stealth-coder',
    profile: {
      login: 'stealth-coder',
      name: null,
      avatar_url: '',
      html_url: 'https://github.com/stealth-coder',
      bio: null,
      company: null,
      location: null,
      blog: null,
      twitter_username: null,
      public_repos: 3,
      public_gists: 0,
      followers: 0,
      following: 0,
      created_at: null,
      updated_at: null,
      account_age_years: null,
    },
    stats: {
      total_stars: 12,
      total_forks: 1,
      total_public_repos: 3,
      total_analyzed_repos: 3,
      detected_languages_count: 0,
      primary_language: null,
      average_stars_per_repo: 4,
      total_open_issues: 0,
    },
    languages: [],
    portfolio_score: {
      overall_score: 52,
      tier: 'Developing',
      summary: '',
      breakdown: [],
      disclaimer: '',
    },
    ai_analysis: null,
  });
  const docD = createAnalysisPdfDoc(scenarioD);
  const pdfBytesD = Buffer.from(docD.output('arraybuffer'));
  const pathD = path.join(outputDir, 'scenario-d-missing-metadata.pdf');
  fs.writeFileSync(pathD, pdfBytesD);
  console.log(`   -> Generated ${pathD} (${pdfBytesD.length} bytes, ${docD.getNumberOfPages()} pages)`);

  // Test 5: Long Career Recommendations (Overflow test)
  console.log('\n5. Testing Scenario E: Long recommendations requiring natural pagination flow...');
  const scenarioE = buildMockAnalysis({
    username: 'senior-architect',
    recommendations: [
      {
        id: 'rec-long-1',
        priority: 'high',
        category: 'Architecture & Scalability',
        title: 'Establish Enterprise Observability, Distributed Tracing, and Automated Canary Deployments Across Services',
        description: 'Microservices architecture lacks a unified OpenTelemetry standard.',
        action: 'Implement OpenTelemetry collectors across all microservice entrypoints, configure distributed trace propagation using W3C TraceContext standards, and integrate Prometheus service monitors with Grafana dashboards to track p99 latency regressions. Furthermore, establish automated canary deployment pipelines using Argo Rollouts to automatically detect error budget burn rates and roll back unstable releases without human intervention.',
        impact: 'Provides undeniable proof of enterprise platform architecture competence, eliminating senior engineering hiring hesitation regarding systems reliability and modern cloud-native operational standards.',
      },
      {
        id: 'rec-long-2',
        priority: 'high',
        category: 'Security & Supply Chain',
        title: 'Harden Software Supply Chain with Sigstore Cosign Signing and Dependabot Automated Remediations',
        description: 'Dependencies require automated vulnerability triage.',
        action: 'Configure automated SBOM generation (SPDX / CycloneDX) in GitHub Actions pipelines, enforce cryptographic container image signing using Sigstore Cosign, and enable Dependabot automated security pull requests with strict vulnerability thresholds to prevent zero-day exposures in published Docker artifacts.',
        impact: 'Satisfies institutional security compliance checklists and demonstrates zero-trust developer mindset for FinTech and HealthTech recruitment pipelines.',
      },
      {
        id: 'rec-long-3',
        priority: 'medium',
        category: 'Open Source Mentorship',
        title: 'Author Comprehensive Architecture Decision Records (ADRs) and Interactive Developer Onboarding Guides',
        description: 'Complex design choices are not currently documented in ADR format.',
        action: 'Document the structural design decisions, data consistency trade-offs, and messaging queue topologies in standardized Architecture Decision Records within the /docs/adr directory. Accompany this with a step-by-step local development setup script that boots the full environment via docker-compose within under 60 seconds.',
        impact: 'Demonstrates tech lead capability and team-scaling leadership, which directly differentiates staff-level candidates during architectural interview rounds.',
      },
      {
        id: 'rec-long-4',
        priority: 'low',
        category: 'Documentation & Public Speaking',
        title: 'Publish Accompanying Technical Case Studies and Performance Benchmark Whitepapers',
        description: 'High-performance microservices lack external benchmark documentation.',
        action: 'Write a detailed engineering blog post analyzing the benchmark throughput of your Go messaging worker under 100,000 concurrent websocket connections, citing flame graphs and memory allocation profiles.',
        impact: 'Generates organic developer inbound traction and serves as an influential technical artifact for hiring managers.',
      },
    ],
  });
  const docE = createAnalysisPdfDoc(scenarioE);
  const pdfBytesE = Buffer.from(docE.output('arraybuffer'));
  const pathE = path.join(outputDir, 'scenario-e-long-recommendations.pdf');
  fs.writeFileSync(pathE, pdfBytesE);
  console.log(`   -> Generated ${pathE} (${pdfBytesE.length} bytes, ${docE.getNumberOfPages()} pages)`);
  if (docE.getNumberOfPages() < 2) throw new Error('Scenario E should have at least 2 pages');

  console.log('\n===============================================================');
  console.log('All 5 PDF Scenarios Generated and Validated Successfully!');
  console.log('===============================================================');
}

runAllScenarios().catch((err) => {
  console.error('\nPDF Verification Test Failed:', err);
  process.exit(1);
});
