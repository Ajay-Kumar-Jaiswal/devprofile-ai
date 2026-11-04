import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Briefcase,
  GitBranch,
  Trash2,
  Mail,
  Scale,
  Server,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-transparent py-10 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-violet-500/30">
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        {/* Top Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-violet-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-[11px] font-mono text-slate-500">
            Last Updated: November 4, 2026
          </span>
        </div>

        {/* Page Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Platform Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            These Terms &amp; Conditions govern your access to and use of DevProfile AI. Please review them carefully. By creating an account, authenticating via GitHub, or accessing the platform, you agree to be bound by these terms.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">01.</span>
              <span>Acceptance of Terms</span>
            </h2>
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200 text-xs flex items-start gap-2.5">
              <span>
                <strong>Independent Personal Project:</strong> DevProfile AI is an independently developed personal software project operated by an individual developer, not a registered company or incorporated business entity. References to &ldquo;we&rdquo;, &ldquo;us&rdquo;, and &ldquo;our&rdquo; refer to the individual developer operating the Platform.
              </span>
            </div>
            <p>
              By accessing, browsing, registering for an account, connecting a GitHub account, or utilizing any features provided by <strong>DevProfile AI</strong> (&ldquo;the Platform&rdquo;), you confirm that you have read, understood, and agreed to be legally bound by these Terms &amp; Conditions and our Privacy Policy.
            </p>
            <p className="text-slate-400">
              If you do not agree with all provisions of these Terms, you must immediately discontinue using the Platform. If you are using DevProfile AI on behalf of an educational institution, organization, or employer, you represent and warrant that you possess the authority to bind that entity to these Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">02.</span>
              <span>Platform Description &amp; Services</span>
            </h2>
            <p>
              DevProfile AI provides developer portfolio diagnostics, public GitHub repository hygiene evaluation, automated ATS-readiness scoring, AI-assisted portfolio improvement recommendations, and targeted campus internship discovery.
            </p>
            <p className="text-slate-400">
              Our system analyzes publicly available GitHub metadata—including commit cadence, documentation coverage, license availability, repository topics, and technology stack diversity—to synthesize heuristic benchmarks intended to assist software developers in preparing for campus placement drives, technical interviews, and portfolio presentations.
            </p>
          </section>

          {/* Section 3 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">03.</span>
              <span>Account Registration, Security &amp; OTP Verification</span>
            </h2>
            <p>
              To access personalized analysis history, saved internships, and progress tracking, you must create an account via email and password or authenticated GitHub OAuth. In doing so, you agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Age Requirement:</strong> You must be at least 13 years of age (or at least 16 where required by applicable local law in your jurisdiction) to access or use the Platform. DevProfile AI is not intended for individuals under these statutory thresholds.</li>
              <li><strong>Accurate Information:</strong> You agree to provide a valid, accessible email address and truthful account credentials.</li>
              <li><strong>Email Verification Flow:</strong> Accounts registered with email and password require identity verification via a cryptographically hashed, single-use 6-digit One-Time Password (OTP) dispatched to your registered email. Unverified accounts cannot authenticate with passwords until verified.</li>
              <li><strong>Credential Confidentiality:</strong> You are strictly responsible for maintaining the confidentiality of your login credentials and JWT authentication tokens. DevProfile AI will never ask for your password or raw verification codes.</li>
              <li><strong>Prompt Notification:</strong> You must promptly notify DevProfile AI of any unauthorized access, compromised credentials, or security vulnerabilities associated with your account.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">04.</span>
              <span>User Responsibilities, Repository Authorization &amp; Acceptable Use</span>
            </h2>
            <p>
              You agree to utilize DevProfile AI responsibly and lawfully. Specifically, you acknowledge and agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Authorized Analysis:</strong> You will only analyze GitHub accounts and public repositories that you own, have created, or have legitimate educational, research, or authorized evaluative interest to review. You will not use the Platform for unauthorized surveillance, harassment, or malicious scraping.</li>
              <li><strong>No Reverse Engineering or Algorithmic Abuse:</strong> You will not decompile, reverse engineer, extract training datasets from, or disassemble the Platform&rsquo;s scoring heuristics, analysis pipelines, or backend algorithms.</li>
              <li><strong>Rate Limit Compliance:</strong> You will not bypass, defeat, or manipulate published rate limits, OTP cooldown timers (e.g. 60-second resend cooldowns), or IP security controls through botnets, proxies, or automated scripts.</li>
              <li><strong>Integrity of the Service:</strong> You will not introduce viruses, trojans, worms, logic bombs, or other malicious code, nor launch denial-of-service (DoS/DDoS) attacks against the Platform or upstream infrastructure.</li>
              <li><strong>Truthful Employment Applications:</strong> You acknowledge that DevProfile AI does not submit job applications on your behalf. Any resume submissions or statements made on third-party employer career sites are your sole responsibility.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-violet-400" />
              <span>Platform Availability, Maintenance &amp; Service Interruptions</span>
            </h2>
            <p>
              We strive to maintain continuous platform availability. However, DevProfile AI operates over distributed cloud networks and relies upon external third-party infrastructure. You acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>The Platform may occasionally be inaccessible, throttled, or interrupted due to scheduled maintenance, software updates, emergency security patches, or cloud hosting hardware failures.</li>
              <li>Service delivery may be affected by upstream outages or rate limits imposed by third-party providers, including GitHub API rate limits, Groq AI inference latency, cloud database scaling, or Brevo email delivery delays.</li>
              <li>DevProfile AI provides no guaranteed service-level agreement (SLA) or continuous uptime warranty. We shall not be liable for any losses, missed deadlines, or damages resulting from service unavailability or performance degradation.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-violet-400" />
              <span>GitHub Data &amp; Third-Party API Services Disclaimer</span>
            </h2>
            <p>
              DevProfile AI retrieves public repository metrics, user profiles, commit counts, language breakdowns, and README contents via official GitHub REST and GraphQL APIs.
            </p>
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200 text-xs">
              <strong>Independent Platform Notice:</strong> DevProfile AI is an independent software application and is <strong>not affiliated with, endorsed by, sponsored by, or partner-certified by GitHub, Inc. or Microsoft Corporation</strong>.
            </div>
            <p className="text-slate-400">
              Your use of GitHub is governed separately by GitHub&rsquo;s Terms of Service and Privacy Statement. DevProfile AI does not control GitHub API availability, rate limits, schema revisions, or account policies.
            </p>
          </section>

          {/* Section 7 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>AI-Powered Insights, Advisory Nature &amp; Possible Inaccuracies</span>
            </h2>
            <p>
              DevProfile AI incorporates large language model inference (powered by Groq) and deterministic heuristic rules to generate executive portfolio summaries, project feedback, and campus placement roadmaps.
            </p>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Advisory &amp; Educational Purpose Only</span>
              </div>
              All AI-generated scores, skill evaluations, project critiques, and action roadmaps are provided strictly as <strong>advisory estimates and educational indicators</strong>. They do not constitute certified code audits, professional career counseling, or official academic assessments.
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Possible Inaccuracies:</strong> Generative AI models may produce incomplete, generalized, or inaccurate observations regarding your source code architecture or skills. Users should exercise independent judgment when reviewing suggested improvements.</li>
              <li><strong>No Guarantee of Career Outcomes:</strong> DevProfile AI makes no representation or warranty that achieving a higher portfolio score or completing recommended action items will lead to job offers, interview invitations, internship placements, compensation increases, or successful campus recruitment.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-400" />
              <span>Internship Recommendations, External Employer Sites &amp; Disclaimers</span>
            </h2>
            <p>
              Internship opportunities featured on the Platform are periodically fetched, cached, and synchronized from official, public employer job boards (including Greenhouse and Lever) and verified RSS career feeds.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Not an Employer or Recruiting Agency:</strong> DevProfile AI is an educational analytics software platform. We are not a recruiter, staffing agency, employer, or hiring intermediary. We do not participate in applicant screening, interview scheduling, or employment offers.</li>
              <li><strong>No Vacancy or Process Guarantee:</strong> Job listings are retrieved from public endpoints and may change or expire at any time. We cannot guarantee that listed positions remain open, that employer links remain active, or that applications will receive consideration.</li>
              <li><strong>External Career Portals:</strong> When clicking &ldquo;Apply Now&rdquo; or external job links, you are redirected to third-party employer websites. DevProfile AI does not control and is not responsible for the privacy policies, terms, application forms, or hiring practices of third-party employers.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              <span>Intellectual Property Rights &amp; User Ownership</span>
            </h2>
            <p>
              <strong>Your Content &amp; Code:</strong> You retain complete ownership, copyright, and intellectual property rights over your underlying GitHub repositories, source code, commits, and portfolio artifacts. DevProfile AI does not claim any ownership over code or projects analyzed on the Platform.
            </p>
            <p className="text-slate-400">
              <strong>Platform Property:</strong> The DevProfile AI name, brand assets, user interface designs, logo, visual styling, database architectures, and scoring heuristics are the intellectual property of the individual developer operating DevProfile AI and are protected by applicable copyright, trademark, and trade secret laws.
            </p>
          </section>

          {/* Section 10 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Account Suspension, Termination &amp; Permanent Self-Serve Deletion</span>
            </h2>
            <p>
              You have the right to terminate your account with DevProfile AI at any time. Authenticated users can initiate permanent, self-serve account deletion directly within <strong>Account Settings &rarr; Delete Account</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Permanent Deletion Flow:</strong> Account deletion requires email ownership validation via a single-use 6-digit confirmation OTP dispatched via Brevo. Upon valid confirmation, our backend initiates an immediate cascading hard delete of all user-owned records (user account, linked GitHub identity records, historical analysis runs, tracked recommendations, progress milestones, and saved internships).</li>
              <li><strong>Technical Retention &amp; Backup Limitations:</strong> While active production database records are deleted immediately upon confirmation, you acknowledge that copies of database states may persist temporarily in automated cloud database disaster-recovery archives and transient web server security logs until rotated according to our hosting and database providers&rsquo; standard operational retention policies. Deletion of user data from third-party systems outside our control (such as GitHub, Groq, or external employer portals) is governed by those third parties.</li>
              <li><strong>Platform Suspension Rights:</strong> We reserve the right to suspend or terminate account access, with or without notice, in the event of material violations of these Terms, automated scraping, security tampering, fraudulent behavior, or actions that jeopardize platform reliability.</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Limitation of Liability, Warranty Disclaimer &amp; Statutory Rights</span>
            </h2>
            <p className="uppercase text-[11px] font-mono tracking-wide text-slate-400">
              Provided &ldquo;As Is&rdquo; and &ldquo;As Available&rdquo;
            </p>
            <p>
              To the fullest extent permitted by applicable law, DevProfile AI and its contributors, operators, and hosting partners provide the Platform on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express, statutory, or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
            <p className="text-slate-400">
              In no event shall DevProfile AI or its operators be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data loss, loss of employment opportunities, reputational harm, or service disruptions arising from your use of or inability to use the Platform.
            </p>
            <p className="text-slate-400 text-xs">
              <strong>Statutory Consumer Rights:</strong> Nothing in these Terms shall limit or exclude any statutory consumer guarantees, statutory warranties, or mandatory consumer protection rights that cannot be lawfully waived or excluded under applicable consumer law in your jurisdiction.
            </p>
          </section>

          {/* Section 12 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">12.</span>
              <span>Modifications to Terms</span>
            </h2>
            <p>
              We reserve the right to update or modify these Terms &amp; Conditions periodically to reflect technical enhancements, architectural updates, or statutory obligations.
            </p>
            <p className="text-slate-400">
              When modifications are made, we will update the &ldquo;Last Updated&rdquo; timestamp at the top of this document. Material changes will be accompanied by an in-app notice or email notification where feasible. Your continued access to or use of the Platform following the posting of updated Terms constitutes your agreement to be bound by the revised provisions.
            </p>
          </section>

          {/* Section 13 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">13.</span>
              <span>Governing Law, Severability &amp; Entire Agreement</span>
            </h2>
            <p>
              These Terms &amp; Conditions shall be governed by and construed in accordance with the laws of the Republic of India, without regard to its conflict-of-law principles. Any legal claim, dispute, or proceeding arising under or in connection with these Terms or the Platform shall be subject to the exclusive jurisdiction of the competent courts in India, subject to any mandatory consumer protection or statutory rights under applicable law that cannot be lawfully excluded or waived.
            </p>
            <p className="text-slate-400">
              <strong>Severability:</strong> If any provision of these Terms is determined to be unlawful, void, or unenforceable, that provision shall be enforced to the maximum permissible extent, and the remaining provisions shall continue in full force and effect.
            </p>
            <p className="text-slate-400">
              <strong>Entire Agreement:</strong> These Terms &amp; Conditions, together with our Privacy Policy, constitute the complete and exclusive agreement between you and DevProfile AI concerning the Platform, superseding all prior oral or written representations.
            </p>
          </section>

          {/* Section 14 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-400" />
              <span>Contact Information &amp; Legal Notices</span>
            </h2>
            <p>
              If you have questions, feedback, or legal notices concerning these Terms &amp; Conditions, please reach out through our documented support channels:
            </p>
            <div className="p-4 rounded-xl bg-navy-950/60 border border-slate-800/80 font-mono text-xs space-y-1.5 text-slate-300">
              <p><span className="text-slate-400">Project Operator:</span> Individual Developer (Independent Project)</p>
              <p><span className="text-slate-400">Project Name:</span> DevProfile AI</p>
              <p>
                <span className="text-slate-400">Contact Email:</span>{' '}
                  <a
                    href="mailto:xyz369457@gmail.com"
                    className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 font-semibold hover:text-violet-200 transition-colors"
                  >
                    xyz369457@gmail.com
                  </a>
              </p>
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            to="/privacy"
            className="text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-colors underline-offset-4 hover:underline"
          >
            Read Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
