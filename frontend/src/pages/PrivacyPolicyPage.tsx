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
            Last Updated: November 1, 2026
          </span>
        </div>

        {/* Page Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data Protection &amp; Transparency</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            DevProfile AI is built on principles of data minimization, transparent security, and complete user ownership. This policy explains what information we collect, how it is secured, and how you retain full control over your data.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">01.</span>
              <span>Introduction &amp; Core Privacy Commitment</span>
            </h2>
            <p>
              At <strong>DevProfile AI</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;), we respect your privacy and are committed to safeguarding your developer data. We only collect information strictly necessary to provide portfolio evaluation scores, personalized skill insights, and verified internship matches. We do not sell user data, train commercial foundation models on your proprietary work, or track you across the web.
            </p>
          </section>

          {/* Section 2 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-400" />
              <span>Information We Collect</span>
            </h2>
            <p>We collect and process the following categories of information:</p>
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Account &amp; Authentication Data</h3>
                <p className="text-slate-400 text-xs">
                  Your email address, account display name, and securely salted password hash (for email/password users). We never store plaintext passwords.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">GitHub OAuth &amp; Profile Data</h3>
                <p className="text-slate-400 text-xs">
                  When you authenticate via GitHub, we receive your public GitHub user ID, username, public avatar URL, and profile URL. OAuth tokens are encrypted at rest and utilized strictly to query GitHub APIs within authorized scopes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Repository &amp; Portfolio Analysis Data</h3>
                <p className="text-slate-400 text-xs">
                  Public repository statistics (names, stars, forks, primary languages, commit activity metadata, documentation coverage, and commit frequency), calculated portfolio scores, and generated improvement suggestions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Internship &amp; Preference Data</h3>
                <p className="text-slate-400 text-xs">
                  Bookmarked or saved internship listings, user search filter preferences, and fit calculation scores computed against active public vacancies.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Security &amp; Verification Data</h3>
                <p className="text-slate-400 text-xs">
                  Cryptographically secure SHA-256 hashes of verification One-Time Passwords (OTPs), attempt counts, timestamps, and active JWT session identifiers. Raw OTP codes are never persisted in the database.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80">
                <h3 className="font-semibold text-white text-xs mb-1">Technical &amp; Telemetry Data</h3>
                <p className="text-slate-400 text-xs">
                  Client IP address, user-agent string, and request timestamps gathered solely for operational rate limiting, denial-of-service mitigation, and fraud defense.
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
              <li>Computing automated ATS readiness scores and evaluating repository quality benchmarks.</li>
              <li>Generating tailored skill improvement suggestions and campus placement roadmaps via high-speed Groq AI inference.</li>
              <li>Matching candidate strengths to live, verified internship positions from official employer boards (Greenhouse, Lever).</li>
              <li>Validating identity during signup, authentication, password management, and permanent account deletion via Brevo transactional emails.</li>
              <li>Enforcing IP and user rate limits to prevent brute-force attacks and abuse.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-violet-400" />
              <span>Third-Party Sub-Processors &amp; Infrastructure</span>
            </h2>
            <p>We work exclusively with trusted cloud infrastructure providers to deliver DevProfile AI:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">GitHub REST &amp; GraphQL APIs</h3>
                <p className="text-slate-400 text-xs">Source for public repository and developer commit metrics. Governed by GitHub privacy terms.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Groq AI Inference</h3>
                <p className="text-slate-400 text-xs">Powers low-latency LLM analysis. Groq does not retain or use customer API inputs to train AI foundation models.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Brevo (HTTPS API)</h3>
                <p className="text-slate-400 text-xs">Delivers verification and account security OTP emails over TLS-secured HTTPS without exposing SMTP credentials.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1">
                <h3 className="font-bold text-white text-xs">Render Cloud</h3>
                <p className="text-slate-400 text-xs">Hosts the FastAPI application backend and managed PostgreSQL database with encrypted volume storage.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/80 space-y-1 md:col-span-2">
                <h3 className="font-bold text-white text-xs">Vercel</h3>
                <p className="text-slate-400 text-xs">Hosts the production frontend static single-page application and content delivery network (CDN).</p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Data Storage &amp; Cryptographic Security</span>
            </h2>
            <p>
              We implement industry-standard cryptographic controls to protect user data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Encryption in Transit:</strong> All HTTP network communication is enforced via TLS 1.2/1.3 with HTTPS certificates.</li>
              <li><strong>Password Hashing:</strong> Passwords are processed through adaptive slow-hashing algorithms (Argon2 / Passlib bcrypt) with individual salt generation.</li>
              <li><strong>OTP Storage:</strong> OTP codes are transformed into SHA-256 digests prior to database storage. The original plaintext value exists only ephemerally in server memory during transmission.</li>
              <li><strong>Database Protection:</strong> PostgreSQL runs on isolated VPC subnets with daily encrypted snapshot backups and role-based access controls.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">06.</span>
              <span>Data Retention Policy</span>
            </h2>
            <p>
              We retain user profile data, analysis history runs, and saved internships only for as long as your account remains open and active.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>Verification and account deletion OTP records expire automatically after 10 minutes and are permanently invalidated once consumed.</li>
              <li>Rate limiting tracking records are stored in memory and cleared on rolling sliding windows.</li>
              <li>When you delete your account, all associated data is purged immediately without staging periods.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>User Rights &amp; Permanent Account Deletion</span>
            </h2>
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs">
              <strong>Your Right to be Forgotten:</strong> You possess full control over your data. We provide an automated, self-serve permanent account deletion mechanism available at all times.
            </div>
            <p>
              You may initiate complete deletion from <strong>Account Settings &rarr; Delete Account</strong>:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-400">
              <li>Request an account deletion security code to your verified email.</li>
              <li>Input the 6-digit OTP code to verify account ownership.</li>
              <li>Our backend performs an immediate, hard cascading delete across all tables (user record, credentials, OAuth credentials, analysis runs, progress markers, and bookmarked internships).</li>
              <li>No backups retain your personal identifiers, and the action cannot be undone.</li>
            </ol>
          </section>

          {/* Section 8 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-violet-400" />
              <span>Cookies &amp; Local Storage</span>
            </h2>
            <p>
              DevProfile AI <strong>does not use tracking cookies, advertising beacons, or third-party behavioral pixels</strong>.
            </p>
            <p className="text-slate-400">
              We utilize browser <code className="text-violet-300 font-mono text-xs">localStorage</code> solely to store your JSON Web Token (<code className="text-violet-300 font-mono text-xs">devprofile_token</code>) to keep you signed in across page reloads. You can clear this storage at any time by logging out or through your browser settings.
            </p>
          </section>

          {/* Section 9 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">09.</span>
              <span>Children&rsquo;s Privacy</span>
            </h2>
            <p>
              DevProfile AI is designed for students, university developers, and job candidates. We do not knowingly solicit or collect personal information from individuals under 13 years of age (or under 16 where required by local statute). If we discover that an account has been created by a child under this age threshold, we will delete the account and associated records immediately.
            </p>
          </section>

          {/* Section 10 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-400 font-mono text-xs">10.</span>
              <span>International Data Transfers</span>
            </h2>
            <p>
              Our hosting and cloud services (Render, Vercel, Brevo, and Groq) maintain servers and network nodes primarily located in the United States and the European Union. By using DevProfile AI, you understand that your information will be processed and stored in these secure facilities in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Section 11 & 12 */}
          <section className="surface-card p-6 rounded-2xl border border-slate-800/60 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-400" />
              <span>Policy Updates &amp; Privacy Contact</span>
            </h2>
            <p>
              We may update this Privacy Policy periodically to reflect technological adjustments or privacy regulation enhancements. Significant updates will be highlighted via the &ldquo;Last Updated&rdquo; timestamp.
            </p>
            <p>
              If you have inquiries, require data export assistance, or wish to contact our Data Protection Officer, please reach out to:
            </p>
            <div className="p-4 rounded-xl bg-navy-950/60 border border-slate-800/80 font-mono text-xs space-y-1 text-slate-300">
              <p>Privacy Inquiries: <a href="mailto:privacy@devprofile.ai" className="text-violet-400 hover:underline">[privacy@devprofile.ai]</a></p>
              <p>Security Team: <a href="mailto:security@devprofile.ai" className="text-violet-400 hover:underline">[security@devprofile.ai]</a></p>
              <p>Organization: [DevProfile AI Privacy Team]</p>
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
