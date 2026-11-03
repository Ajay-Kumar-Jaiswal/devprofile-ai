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
            Last Updated: November 1, 2026
          </span>
        </div>

        {/* Page Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            Please read these Terms &amp; Conditions carefully before accessing or using the DevProfile AI platform. By accessing or using any part of the service, you agree to become bound by these terms.
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
            <p>
              By accessing, browsing, registering for an account, connecting a GitHub profile, or using any feature provided by <strong>DevProfile AI</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;), you acknowledge that you have read, understood, and agreed to be bound by these Terms &amp; Conditions and our Privacy Policy. If you do not agree to all terms and conditions, you may not access or use the services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">02.</span>
              <span>Platform Description &amp; Services</span>
            </h2>
            <p>
              DevProfile AI provides intelligent developer portfolio diagnostics, GitHub repository analysis, automated ATS-readiness scoring, AI-generated improvement recommendations, and targeted internship matching. Our algorithms synthesize commit cadence, repository documentation, technology stack diversity, and code hygiene into quantitative indicators to assist developers in preparing for campus placement drives and technical evaluations.
            </p>
          </section>

          {/* Section 3 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">03.</span>
              <span>Account Registration, Security &amp; OTP Verification</span>
            </h2>
            <p>
              To access certain features of the platform, you must register an account using either email and password or authenticated GitHub OAuth. You agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>You are at least 13 years of age (or the minimum legal age required in your jurisdiction to consent to online services).</li>
              <li>You will provide accurate, current, and complete registration credentials.</li>
              <li>Email/password registrations require verification via a cryptographically hashed, single-use 6-digit One-Time Password (OTP) dispatched to your registered address. Accounts remain unverified until the OTP is successfully validated.</li>
              <li>You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.</li>
              <li>You must immediately notify DevProfile AI of any unauthorized use or security compromise.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">04.</span>
              <span>User Responsibilities &amp; Acceptable Use</span>
            </h2>
            <p>You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>Automated scraping, excessive polling, or abusive requests targeting our backend APIs or upstream providers beyond published rate limits.</li>
              <li>Analyzing GitHub repositories, accounts, or proprietary codebases without lawful authority or legitimate educational/evaluative interest.</li>
              <li>Attempting to bypass authentication mechanisms, manipulate OTP tokens, access another user&rsquo;s private history, or tamper with security checks.</li>
              <li>Decompiling, reverse engineering, or disassembling any part of our scoring algorithms or backend systems.</li>
              <li>Interfering with service availability, attempting denial-of-service attacks, or introducing malicious code.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-violet-400" />
              <span>GitHub Data &amp; Third-Party Services Disclaimer</span>
            </h2>
            <p>
              DevProfile AI retrieves publicly available repository and profile metadata via official GitHub REST and GraphQL APIs, or user-authorized OAuth scopes. <strong>DevProfile AI is an independent software application and is not affiliated with, sponsored by, or endorsed by GitHub, Inc. or Microsoft Corporation.</strong>
            </p>
            <p className="text-slate-400">
              Your use of GitHub is governed separately by GitHub&rsquo;s Terms of Service and Privacy Statement. We do not claim ownership of any content or repositories hosted on GitHub.
            </p>
          </section>

          {/* Section 6 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>AI-Powered Insights &amp; Advisory Disclaimers</span>
            </h2>
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200 text-xs">
              <strong>Notice Regarding AI Outputs:</strong> Analysis scores, skills assessments, and actionable recommendations are generated utilizing large language model inference (via Groq AI) and deterministic heuristics.
            </div>
            <p>
              All AI outputs, ATS readiness estimates, and suggested action roadmaps are provided strictly for <strong>advisory, educational, and self-improvement purposes</strong>. DevProfile AI does not guarantee that following any recommendation will result in job offers, interview selections, internship placements, higher compensation, or formal academic accreditation. AI evaluations do not constitute certified code audits or security certifications.
            </p>
          </section>

          {/* Section 7 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-400" />
              <span>Internship Recommendations Disclaimer</span>
            </h2>
            <p>
              Internship opportunities displayed on the Platform are aggregated in real time from official employer applicant tracking systems (including Greenhouse and Lever) via direct HTTPS APIs.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Not an Employer or Agency:</strong> DevProfile AI is not an employer, recruiting agency, headhunter, or staffing service. We do not participate in employment negotiations, candidate screening, or hiring decisions.</li>
              <li><strong>No Guarantee of Employment:</strong> We do not guarantee that listed positions remain vacant, that application links will be processed by hiring organizations, or that matching scores ensure recruitment success.</li>
              <li><strong>External Redirections:</strong> Application links redirect to external, official employer career portals. DevProfile AI is not responsible for the privacy practices, content, or accuracy of third-party employer websites.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">08.</span>
              <span>Intellectual Property Rights</span>
            </h2>
            <p>
              The DevProfile AI platform, its visual design, user interface, brand assets, source code, and scoring evaluation algorithms are the exclusive intellectual property of the DevProfile AI development team and are protected by applicable intellectual property laws.
            </p>
            <p className="text-slate-400">
              <strong>Your Content:</strong> You retain complete ownership and intellectual property rights over your underlying GitHub repositories, source code, and portfolio assets. DevProfile AI claims no intellectual property rights over code analyzed on the platform.
            </p>
          </section>

          {/* Section 9 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Account Termination &amp; Permanent Self-Serve Deletion</span>
            </h2>
            <p>
              You may terminate your relationship with DevProfile AI at any time. Under our commitment to user data sovereignty, authenticated users can permanently delete their account directly within <strong>Account Settings</strong>.
            </p>
            <p className="text-slate-400">
              Permanent deletion requires confirmation via a secure, single-use email OTP. Upon verification, our backend executes an irreversible, hard cascading purge of all user records, analysis history, saved internships, and OAuth associations with zero data retention. We also reserve the right to suspend or terminate accounts that breach these Terms or compromise platform integrity.
            </p>
          </section>

          {/* Section 10 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Limitation of Liability &amp; Warranty Disclaimer</span>
            </h2>
            <p className="uppercase text-[11px] font-mono tracking-wide text-slate-400">
              Provided &ldquo;As Is&rdquo; and &ldquo;As Available&rdquo;
            </p>
            <p>
              To the maximum extent permitted by applicable law, DevProfile AI is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express, statutory, or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p className="text-slate-400">
              In no event shall DevProfile AI, its operators, or contributors be liable for any indirect, incidental, consequential, special, or punitive damages arising from your use of or inability to use the platform, including lost career opportunities, data inaccuracies, or service interruptions.
            </p>
          </section>

          {/* Section 11 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">11.</span>
              <span>Modifications to Terms</span>
            </h2>
            <p>
              We reserve the right to amend these Terms &amp; Conditions from time to time to reflect product enhancements, statutory obligations, or evolving security standards. Significant revisions will be noted with an updated &ldquo;Last Updated&rdquo; date at the top of this document. Your continued use of the platform after modifications take effect constitutes acceptance of the amended terms.
            </p>
          </section>

          {/* Section 12 & 13 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">12.</span>
              <span>Governing Law, Severability &amp; Entire Agreement</span>
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws without regard to conflict-of-law principles. Any legal inquiry or arbitration shall be addressed in [Applicable Jurisdiction / Default Court of Competent Jurisdiction].
            </p>
            <p className="text-slate-400">
              If any provision of these Terms is deemed unlawful or unenforceable, that provision shall be enforced to the maximum extent permissible and the remaining provisions shall remain in full force and effect. These Terms constitute the entire agreement between you and DevProfile AI regarding the platform.
            </p>
          </section>

          {/* Section 14 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-400" />
              <span>Contact Information</span>
            </h2>
            <p>
              If you have any questions, concerns, or legal inquiries regarding these Terms &amp; Conditions, please reach out to our team:
            </p>
            <div className="p-4 rounded-xl bg-navy-950/60 border border-slate-800/80 font-mono text-xs space-y-1 text-slate-300">
              <p>Email: <a href="mailto:support@devprofile.ai" className="text-violet-400 hover:underline">[support@devprofile.ai]</a></p>
              <p>Organization: [DevProfile AI Team]</p>
              <p>Website: <Link to="/" className="text-violet-400 hover:underline">https://devprofile.ai</Link></p>
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
