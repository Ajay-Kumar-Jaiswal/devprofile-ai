import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  Database,
  Lock,
  Cpu,
  Trash2,
  Mail,
  Server,
  EyeOff,
  Clock,
  UserCheck,
  Globe,
  Sparkles,
  AlertCircle,
  User,
} from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy &amp; Data Transparency</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            This Privacy Policy explains how DevProfile AI handles personal information, repository metadata, authentication credentials, and security records. We prioritize technical transparency and genuine data minimization.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">01.</span>
              <span>Developer Identity &amp; Core Privacy Principles</span>
            </h2>
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200 text-xs flex items-start gap-2.5">
              <User className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <strong>Independent Personal Project:</strong> DevProfile AI is an independently developed personal software project operated by an individual developer, not a registered company or incorporated commercial entity. References to &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo; refer to the individual developer operating the application.
              </div>
            </div>
            <p className="text-slate-400">
              The Platform is built around straightforward privacy principles:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>No Data Brokering:</strong> We do not sell, rent, monetize, or trade user data to data brokers, marketing agencies, or advertisers.</li>
              <li><strong>No Commercial Model Training:</strong> We do not use your personal projects or repository data to train or fine-tune public commercial AI foundation models.</li>
              <li><strong>No Third-Party Ad Trackers:</strong> The Platform does not load third-party advertising pixels, behavioral tracking tags, or cross-site tracking scripts.</li>
              <li><strong>User Data Control:</strong> You maintain direct control over your account with a self-serve permanent deletion workflow available at any time.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-400" />
              <span>Information We Collect &amp; Store</span>
            </h2>
            <p>
              We collect and process only the data necessary to provide portfolio evaluation, account security, and internship matching:
            </p>
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Account &amp; Profile Information</h3>
                <p className="text-slate-400 text-xs">
                  Your registered email address, optional full name, and chosen default GitHub profile username.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Authentication Credentials (Email/Password Users)</h3>
                <p className="text-slate-400 text-xs">
                  For email/password accounts, we store a cryptographically salted password hash generated using the slow, memory-hard <strong>Argon2id</strong> algorithm. <strong>Plaintext passwords are never stored, logged, or accessible to anyone.</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">GitHub OAuth Identity (OAuth Users)</h3>
                <p className="text-slate-400 text-xs">
                  When you connect or log in via GitHub OAuth, we store your public numeric GitHub user ID, GitHub login handle, public avatar URL, and GitHub profile link. <strong>Important: GitHub OAuth access tokens are NOT stored, cached, or persisted in our database.</strong> The handshake token is held only ephemerally in server memory during login to fetch your verified public identity and email from GitHub APIs, and is discarded immediately.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Public Repository Metadata &amp; Analysis History</h3>
                <p className="text-slate-400 text-xs">
                  Public repository statistics retrieved via GitHub APIs (repository names, star counts, fork counts, primary languages, commit activity metadata, documentation indicators, licenses, and topics), calculated portfolio scores, and serialized JSON records of past analysis runs for progress tracking.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Tracked Recommendations &amp; Progress Markers</h3>
                <p className="text-slate-400 text-xs">
                  Actionable improvement items generated for your profile, tracked recommendation statuses (e.g., open, resolved, dismissed), recurrence counts, and milestone progress events.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Saved Internships &amp; Preferences</h3>
                <p className="text-slate-400 text-xs">
                  Bookmarked internship listings from official employer boards, user notes on saved vacancies, search filter parameters, and computed alignment scores.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Security Records, Hashed OTPs &amp; Reset Tokens</h3>
                <p className="text-slate-400 text-xs">
                  Verification, password-reset, and account-deletion One-Time Passwords (OTPs) are stored <strong>only as SHA-256 cryptographic hashes combined with per-code 16-byte random salts</strong>. Plaintext OTPs are never stored in the database. We also store attempt counts (maximum 5), expiration timestamps (10 minutes), and single-use password reset tokens (stored only as SHA-256 hashes, valid for 10 minutes).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Technical &amp; Telemetry Data</h3>
                <p className="text-slate-400 text-xs">
                  Client IP addresses are tracked <strong>only in temporary in-memory data structures</strong> for rolling 5-minute sliding windows to enforce rate limits and 60-second OTP cooldowns. IP addresses are NOT stored in persistent application database tables. Hosting providers (Render, Vercel) maintain standard web server access logs (IP, user agent, requested path, timestamp) for security monitoring and DDoS defense.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              <span>How We Use Your Information</span>
            </h2>
            <p>Your information is processed strictly for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Portfolio Diagnostics:</strong> Analyzing repository documentation, commit cadence, and language diversity to generate ATS-readiness scores and track growth over time.</li>
              <li><strong>AI-Generated Growth Insights:</strong> Generating qualitative portfolio summaries, project feedback, and actionable 7-day and 30-day campus placement roadmaps via Groq AI.</li>
              <li><strong>Internship Matching:</strong> Evaluating your detected skills against periodically synchronized internship listings ingested from official employer job boards.</li>
              <li><strong>Account Security &amp; Transactional Email:</strong> Delivering signup verification codes, password recovery codes, and account deletion confirmations via the Brevo HTTPS API.</li>
              <li><strong>Abuse Prevention:</strong> Enforcing request rate limits, brute-force protection on OTP codes, and 60-second cooldown windows between dispatches.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>AI Data Processing Disclosures (Groq AI)</span>
            </h2>
            <p>
              DevProfile AI uses large language model inference powered by Groq to generate executive summaries, project feedback, and campus placement roadmaps.
            </p>
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200 text-xs">
              <strong>Source Code Is Not Sent:</strong> We do NOT transmit your repository source code files, commit diffs, or private files to Groq or any LLM provider.
            </div>
            <p className="text-slate-400">
              Specifically, data submitted in the Groq API request payload is strictly limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>Public profile metadata (username handle, bio, company, location, public repo count, followers, and whether links to LinkedIn or a portfolio website exist).</li>
              <li>Aggregate statistics (total star count, total fork count, language percentage distribution, and original vs. forked repository counts).</li>
              <li>Up to 6 top repositories: name, primary language, star and fork counts, topics, license, <strong>sanitized repository description truncated to 200 characters</strong>, and a <strong>sanitized README excerpt truncated to 600 characters</strong>.</li>
              <li>Quality checklist boolean indicators (license presence, README presence, description presence).</li>
            </ul>
            <p className="text-slate-400">
              <strong>Provider Data Handling:</strong> Inference requests are transmitted via TLS-secured HTTPS to Groq&rsquo;s API. Under Groq&rsquo;s applicable commercial API terms, customer API inputs are processed ephemerally and are not used to train public foundation models. We cannot provide guarantees beyond Groq&rsquo;s documented terms.
            </p>
            <p className="text-slate-400 text-xs">
              <strong>Advisory Nature:</strong> AI analysis outputs and scoring estimates are heuristic indicators. They may occasionally contain generalizations or inaccuracies. They do not constitute formal code certifications, professional recruitment audits, or guarantees of employment.
            </p>
          </section>

          {/* Section 5 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-violet-400" />
              <span>Third-Party Sub-Processors &amp; Infrastructure</span>
            </h2>
            <p>
              We rely on trusted cloud infrastructure providers to host, secure, and operate DevProfile AI. Each provider processes data strictly within their technical operational scope:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Vercel</h3>
                <p className="text-slate-400 text-xs">Hosts the production frontend React single-page application and provides global Content Delivery Network (CDN) edge caching.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Render</h3>
                <p className="text-slate-400 text-xs">Hosts the Python FastAPI application service and executes the automated daily database cleanup maintenance cron job.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Neon PostgreSQL</h3>
                <p className="text-slate-400 text-xs">Provides managed serverless PostgreSQL database storage with encrypted storage volumes and automated point-in-time recovery archives.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Brevo (Official HTTPS API)</h3>
                <p className="text-slate-400 text-xs">Delivers transactional security emails (signup OTPs, password reset codes, account deletion verifications) via HTTPS requests. Does not use outbound SMTP.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Groq AI</h3>
                <p className="text-slate-400 text-xs">Processes sanitized repository metadata to generate structured AI feedback, project recommendations, and placement preparation roadmaps.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">GitHub REST &amp; GraphQL APIs</h3>
                <p className="text-slate-400 text-xs">Queried to retrieve public repository statistics, profile details, and verify user identity during GitHub OAuth login.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1 md:col-span-2">
                <h3 className="font-bold text-white text-xs">Greenhouse &amp; Lever APIs / Public RSS Feeds</h3>
                <p className="text-slate-400 text-xs">Official public employer board APIs and verified RSS feeds queried to ingest active internship vacancies. DevProfile AI queries public job endpoints and does not submit applications on user behalf.</p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Data Storage &amp; Security Controls</span>
            </h2>
            <p>
              We implement verified technical security controls to safeguard stored and transmitted data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>HTTPS / TLS Encryption:</strong> All communication between your browser and our backend APIs is encrypted in transit using modern TLS (TLS 1.2 or TLS 1.3).</li>
              <li><strong>Argon2id Password Hashing:</strong> Passwords are hashed using Argon2id with unique cryptographic salts. Passwords are never stored or logged in plaintext.</li>
              <li><strong>Salted SHA-256 OTP Hashing:</strong> Verification and deletion OTP codes are converted into SHA-256 digests with unique 16-byte random salts before database insertion. Plaintext codes exist only ephemerally in server memory during email dispatch. (Note: SHA-256 is a standard cryptographic hash suitable for short-lived OTPs with high-entropy salts and attempt limits, distinct from slow memory-hard Argon2id used for passwords).</li>
              <li><strong>Single-Use Password Reset Tokens:</strong> Password reset tokens are 48-byte cryptographically secure random values stored only as SHA-256 hashes in the database, expire in 10 minutes, and are invalidated immediately upon use to prevent replay attacks.</li>
              <li><strong>Database Volume Encryption:</strong> Production PostgreSQL databases are hosted on cloud infrastructure with encrypted persistent storage volumes.</li>
              <li><strong>Rate Limiting &amp; Cooldowns:</strong> An in-memory rate limiter enforces maximum attempt thresholds (5 attempts per code), IP request caps, and a 60-second cooldown between consecutive email dispatches.</li>
            </ul>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>
                <strong>Security Disclaimer:</strong> While we implement industry-standard cryptographic practices and defensive controls, no software system or Internet transmission can guarantee absolute security. Unauthorized access, hardware failure, or unforeseen software vulnerabilities remain inherent risks.
              </span>
            </div>
          </section>

          {/* Section 7 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Data Retention &amp; Automated Cleanup Jobs</span>
            </h2>
            <p>
              We retain user records and analysis history only as long as necessary to support platform functionality:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Active Account Data:</strong> Your account details, saved analysis snapshots, tracked recommendations, and bookmarked internships remain stored while your account is open and active.</li>
              <li><strong>10-Minute OTP Lifespan:</strong> All verification, password-reset, and account-deletion OTP codes expire automatically 10 minutes after generation.</li>
              <li><strong>Automated Daily Database Cleanup:</strong> A scheduled maintenance cron job runs daily at 03:00 UTC on Render to purge expired unconsumed OTPs, consumed OTPs older than 1 day, and expired OAuth state records.</li>
              <li><strong>Purge of Abandoned Unverified Accounts:</strong> Accounts registered with email/password that remain unverified and completely inactive (no connected GitHub, no analysis runs, no saved internships) are automatically purged after 7 days by our scheduled cleanup routine.</li>
              <li><strong>Backup and Log Retention:</strong> When records are deleted from our active production database, copies may temporarily persist in automated cloud database disaster-recovery archives and web server access logs until rotated according to our hosting and database providers&rsquo; standard operational retention policies.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>User Rights &amp; Permanent Self-Serve Account Deletion</span>
            </h2>
            <p>
              Depending on your location and applicable privacy laws (such as in the European Economic Area, the UK, or certain US states), you may have rights regarding your personal information, including the right to access, correct, or delete your data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Access:</strong> You can view your saved analyses, portfolio scores, and bookmarked internships directly within the application dashboard.</li>
              <li><strong>Correction:</strong> You can update your display name, default GitHub username, and password credentials at any time in Account Settings.</li>
              <li><strong>Permanent Account Deletion:</strong> You can permanently delete your account directly inside the app without needing to contact support.</li>
            </ul>
            <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-2 pt-2">
              <h3 className="font-semibold text-white text-xs">Self-Serve Account Deletion Workflow:</h3>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400 text-xs">
                <li>Navigate to <strong>Account Settings &rarr; Delete Account</strong>.</li>
                <li>Click &ldquo;Request Deletion Code&rdquo; to dispatch a single-use 6-digit confirmation OTP to your verified email via Brevo.</li>
                <li>Enter the 6-digit code in the deletion confirmation modal.</li>
                <li>Our backend executes an immediate, atomic cascading delete across all associated user records:
                  <ul className="list-disc pl-5 pt-1 space-y-0.5 text-slate-400">
                    <li>Your User account record and password hash</li>
                    <li>Connected GitHub account associations</li>
                    <li>All historical analysis runs and calculated score snapshots</li>
                    <li>All tracked recommendations and progress milestone events</li>
                    <li>All saved internship bookmarks</li>
                    <li>All associated verification, deletion, and password reset OTP records</li>
                  </ul>
                </li>
              </ol>
            </div>
            <p className="text-slate-400 text-xs">
              <strong>Scope of Deletion:</strong> Account deletion immediately purges all user-owned records from our active production database. As described in Section 07, automated disaster-recovery snapshots and server access logs held by hosting providers cycle out per their automated retention schedules. Data residing on external third-party platforms (such as your GitHub account or third-party employer career sites) is governed by those third parties.
            </p>
          </section>

          {/* Section 9 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-violet-400" />
              <span>Cookies &amp; Local Storage</span>
            </h2>
            <p>
              DevProfile AI is designed to minimize browser storage and tracking mechanisms:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>No Advertising or Tracking Cookies:</strong> The Platform does not set third-party tracking cookies, advertising beacons, or web analytics cookies.</li>
              <li><strong>Browser Local Storage (<code className="text-violet-300 font-mono text-xs">localStorage</code>):</strong> We store your signed JSON Web Token (<code className="text-violet-300 font-mono text-xs">devprofile_token</code>) in browser local storage. This maintains your authenticated session across browser reloads. You can clear this token at any time by clicking &ldquo;Sign Out&rdquo; or clearing site data in your browser settings.</li>
              <li><strong>Browser Session Storage (<code className="text-violet-300 font-mono text-xs">sessionStorage</code>):</strong> We use session storage to cache active analysis data and transient OAuth redirect states during an active browser tab session. This data is automatically cleared when the tab closes or upon signing out.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-violet-400" />
              <span>Children&rsquo;s Privacy</span>
            </h2>
            <p>
              DevProfile AI is intended for university students, software engineering candidates, and adult developers.
            </p>
            <p className="text-slate-400">
              The Platform is not intended for children under 13 years of age (or under 16 where required by applicable local law). We do not knowingly collect personal information from individuals under these ages. If we learn that an account was created by an individual under the applicable statutory threshold, we will take prompt steps to delete the account and purge its records from our active database. If you believe a child has created an account, please contact the developer using the contact information below.
            </p>
          </section>

          {/* Section 11 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-violet-400" />
              <span>International Data Processing &amp; Hosting</span>
            </h2>
            <p>
              DevProfile AI is hosted and operated through cloud infrastructure and service providers (including Vercel, Render, Neon, Groq, and Brevo) whose data centers and processing facilities are located in various international regions.
            </p>
            <p className="text-slate-400">
              Depending on your location and the services accessed, your information may be transmitted to, processed, and stored on servers located outside your country or local jurisdiction, subject to the operational agreements and technical security controls maintained by our third-party infrastructure providers.
            </p>
          </section>

          {/* Section 12 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-400" />
              <span>Policy Updates &amp; Contact Information</span>
            </h2>
            <p>
              This Privacy Policy may be updated periodically to reflect application enhancements, technical changes, or legal updates. Revisions will be published on this page with an updated &ldquo;Last Updated&rdquo; date.
            </p>
            <p className="text-slate-400">
              If you have questions, privacy inquiries, or wish to exercise your data rights, please contact the individual developer operating the Platform:
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
            to="/terms"
            className="text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-colors underline-offset-4 hover:underline"
          >
            Read Terms &amp; Conditions &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
