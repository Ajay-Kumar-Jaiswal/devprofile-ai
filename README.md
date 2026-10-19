# DevProfile AI — GitHub Profile Analyzer

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq SDK](https://img.shields.io/badge/AI%20Inference-Groq%20Cloud%20(LLaMA--3)-f55036.svg?style=flat&logo=openai)](https://groq.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TypeScript-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styles-Tailwind%20CSS%203.4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)

**DevProfile AI** is a professional, developer-focused web application engineered for college placement drives, recruitment presentations, and engineering interviews. It combines a **transparent, deterministic 5-pillar portfolio scoring engine** with **live Groq Cloud AI reasoning** (powered by LLaMA-3 models) to deliver evidence-based strengths, repository-level feedback, and customized 7-day and 30-day placement action roadmaps.

---

## Key Features

1. **Deterministic Portfolio Scoring (0–100)**
   - Calculates a reproducible, rule-based score across 5 weighted categories (20 pts each):
     - **Profile Completeness & Branding**: Display name, bio length, links, location, account maturity.
     - **Documentation & Hygiene**: Repository descriptions ratio, topic tags, open-source licensing.
     - **Reach & Community Engagement**: Total stars, forks, and followers.
     - **Tech Stack Breadth & Depth**: Language variety, primary specialization dominance, multi-project depth.
     - **Maintenance Freshness**: Commit activity (< 60 / 180 days), original vs. forked repository balance.
   - Assigns achievement tiers (*Exceptional*, *Strong*, *Competitive*, *Developing*, *Needs Work*).
   - *Hiring Notice*: Clearly states that the numeric score evaluates presentation hygiene, not hiring potential or innate developer capability.

2. **Professional SaaS Authentication & Sessions**
   - **Email & Password**: Hardened with modern **Argon2id** password hashing (`argon2-cffi`), minimum length constraints, and email validation.
   - **Session Security**: Cryptographic **HttpOnly JWT cookies** with dual fallback support for `Authorization: Bearer` headers (ideal for SPA routing and automated testing).
   - **Brute-Force Rate Limiting**: Exponential cooldown protection on authentication endpoints to defend against credential stuffing.
   - **Profile Isolation**: Strict user-level data isolation for all snapshots, custom settings, and tracked recommendations.

3. **Real GitHub OAuth 2.0 Integration**
   - Secure authorization code grant with CSRF mitigation using single-use cryptographically signed `state` tokens.
   - Tracks candidates by **stable numeric GitHub user ID** (`github_user_id`), ensuring account integrity even if a developer changes their GitHub username handle.
   - **Seamless Onboarding**: Connecting via GitHub OAuth automatically populates developer credentials and triggers an automated first audit with real-time feedback.

4. **Persistent Analysis History & Run Comparison**
   - **Immutable Snapshots**: Every completed evaluation is persisted as an immutable snapshot in SQLite/PostgreSQL with scores, category breakdowns, repository metrics, and AI synthesis.
   - **Side-by-Side Run Comparison**: Compare any two historical snapshots to visualize:
     - Total score delta (`+X` or `-X` points) and category breakdown shifts.
     - Repository growth (stars, forks, newly created repos).
     - New hygiene issues introduced vs. resolved hygiene findings.
   - Snapshot management with pagination and deletion with full user isolation.

5. **Adaptive Recommendation Reconciliation Engine**
   - Built on deterministic, stable rule keys (e.g., `lic_missing_license`, `desc_sparse_descriptions`).
   - Automatically tracks findings across successive profile audits:
     - **First Detection**: Creates an open tracked finding.
     - **Persistent Issue**: Unchanged profile data generates **0 duplicate recommendations**.
     - **Automated Resolution**: Automatically resolved **only** when live GitHub evidence disappears on subsequent audits.
     - **Recurring Regression**: Reopens resolved issues with an incremented recurrence counter if the defect reappears.
     - **User Dismissal**: Allows users to dismiss items without faking resolution status.

6. **Live Groq API Portfolio Synthesis**
   - Integrates the official Groq Python SDK with low-temperature, grounded structured JSON mode.
   - Supported models: `llama-3.3-70b-versatile` (default), `llama-3.1-8b-instant`, or `mixtral-8x7b-32768`.
   - Generates an executive summary, evidence-based strengths, specific weaknesses, repository-specific technical advice, prioritized recommendations, and daily/weekly roadmaps.
   - Built-in prompt-injection defenses: treats repository names, descriptions, and README snippets as untrusted data.

7. **Placement-Ready Offline Demo Mode**
   - Full candidate profile (`alex-dev-demo`) accessible via a 1-click **Load Demo** button or `?demo=true`.
   - Guarantees a 100% reliable local demonstration during placement drives even with no internet connection or GitHub rate limits.
   - Curated demo AI insights are clearly flagged with `is_mock: true` for academic honesty.

8. **Visual Analytics & Tech Stack Telemetry**
   - **Language Breakdown**: Interactive Recharts donut chart with percentage distributions and customized tooltips.
   - **Repository Reach**: Comparative bar chart evaluating star traction vs. forks across top projects.
   - **One-Click JSON Export**: Download complete structured analysis payload (`devprofile-<username>-report.json`).

---

## Architecture

```
                  +-------------------------------------------------------------+
                  |                  Vite + React + TypeScript                  |
                  |  - Tailwind CSS (Dark Navy & Violet Glass SaaS Theme)       |
                  |  - React Router (Protected SaaS Routes & Public Demo Mode)   |
                  |  - Recharts (Donut & Comparative Bar Charts)                |
                  |  - Lucide React Iconography                                 |
                  +-------------------------------------------------------------+
                                      |                       ^
              JSON API (Bearer / HttpOnly Cookie)             | OAuth Redirect
                                      v                       |
                  +-------------------------------------------------------------+
                  |               FastAPI Backend (Python 3.11+)                |
                  |  - Argon2id Password Hashing & JWT Session Management       |
                  |  - GitHub OAuth 2.0 State Verification & Code Exchange      |
                  |  - SSRF-Safe GitHub Profile URL & Handle Normalizer         |
                  |  - Deterministic 5-Pillar Scoring Engine (0-100)            |
                  |  - Adaptive Recommendation Reconciliation Engine            |
                  |  - Groq Async Client (LLaMA-3 Grounded Structured JSON)     |
                  |  - HTTPX Asynchronous GitHub REST Client with TTL Caching   |
                  +-------------------------------------------------------------+
                             /            |            \            \
                            /             |             \            \
                  SQLAlchemy /            |              \            \
                            v             v               v            v
                 +--------------+  +--------------+ +-----------+ +-----------+
                 | SQLite / PG  |  | GitHub OAuth | | GitHub    | | Groq Cloud|
                 | - Users      |  | - App Auth   | | REST API  | | - LLaMA 3 |
                 | - Snapshots  |  | - Numeric ID | | - Profile | | - JSON    |
                 | - Recs History| | - Web Flow   | | - Repos   | |   Mode    |
                 +--------------+  +--------------+ +-----------+ +-----------+
```

---

## Project Structure

```
devprofile-ai/
├── .gitignore                                # Comprehensive root gitignore (Python, Node, secrets, builds)
├── README.md                                 # Full architecture, setup, testing & deployment docs
├── backend/
│   ├── Procfile                              # Web start command for cloud hosts
│   ├── render.yaml                           # Infrastructure blueprint for Render hosting
│   ├── requirements.txt                      # FastAPI, SQLAlchemy, Argon2, PyJWT, Groq, Pytest
│   ├── .env.example                          # Complete environment variables template
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                         # Pydantic Settings (DB, JWT, OAuth, Groq, CORS)
│   │   ├── database.py                       # SQLAlchemy engine & SessionLocal dependency
│   │   ├── db_models.py                      # ORM tables: User, ConnectedGitHub, Run, Recommendation
│   │   ├── saas_models.py                    # Pydantic schemas for Auth, History, Comparison, Recs
│   │   ├── dependencies.py                   # Session & Bearer token auth dependencies
│   │   ├── main.py                           # FastAPI entrypoint, health check & router aggregation
│   │   ├── models.py                         # Core profile, scoring & Groq AI Pydantic models
│   │   ├── analyzer/
│   │   │   ├── __init__.py
│   │   │   ├── scoring.py                    # 5-pillar 0–100 deterministic scoring engine
│   │   │   ├── recommendations.py            # Rule findings & placement roadmaps
│   │   │   └── reconciliation.py             # Adaptive reconciliation engine (open/resolved/recurring)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── analyze.py                    # GET /api/analyze/{user} & POST /api/analyze/{user}/ai
│   │   │   ├── auth.py                       # Register, Login, Logout, /me, GitHub OAuth endpoints
│   │   │   ├── history.py                    # Snapshot listing, detail, delta comparison, deletion
│   │   │   └── recommendations.py            # Filtered recommendations & manual dismiss/reopen
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── auth_service.py               # Argon2 hashing, JWT tokens, login rate limiting
│   │       ├── url_validator.py              # SSRF-defended GitHub URL normalizer
│   │       ├── github_service.py             # Async GitHub client, rate limits, README excerpts
│   │       └── ai_service.py                 # Groq AsyncGroq integration, sanitization & fallback
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py                       # In-memory SQLite fixtures & shared test overrides
│       ├── test_saas_auth.py                 # Tests for user registration, login, rate limits, OAuth
│       ├── test_saas_history_reconciliation.py # Tests for URL normalization, lifecycle, history comparison
│       ├── test_github_rate_limits.py        # Tests for GitHub token injection, rate limits, caching
│       ├── test_ai_service.py                # Tests for Groq auth, rate limits, JSON parsing, resilience
│       ├── test_analyzer.py                  # Tests for scoring boundaries & rule filters
│       └── test_api.py                       # Tests for analysis endpoints with mocks
└── frontend/
    ├── vercel.json                           # SPA routing configuration for Vercel
    ├── package.json                          # React 18, Vite, TypeScript, React Router, Tailwind, Recharts
    ├── postcss.config.js
    ├── tailwind.config.js                    # Custom navy/violet SaaS theme & glow utilities
    ├── tsconfig.json
    ├── .env.example
    ├── public/
    │   └── favicon.svg                       # SVG terminal icon
    └── src/
        ├── index.css                         # Tailwind directives & glassmorphism panels
        ├── main.tsx                          # React DOM mount with AuthProvider & BrowserRouter
        ├── App.tsx                           # Master router with protected routes & SaaS shell
        ├── context/
        │   └── AuthContext.tsx               # Global authentication provider (user, login, register)
        ├── services/
        │   └── api.ts                        # Comprehensive API client with Bearer token & cookie support
        ├── types/
        │   └── api.ts                        # Strict TypeScript interfaces mirroring backend schemas
        ├── pages/
        │   ├── DashboardPage.tsx             # Primary analytics dashboard (demo + authenticated)
        │   ├── LoginPage.tsx                 # SaaS sign-in with email & GitHub OAuth
        │   ├── SignUpPage.tsx                # SaaS registration with handle validation
        │   ├── ForgotPasswordPage.tsx        # Password reset guidance & security documentation
        │   ├── OnboardingPage.tsx            # Login-specific setup with SSRF-safe URL validation
        │   ├── OAuthCallbackPage.tsx         # GitHub OAuth code exchange & auto-analysis
        │   ├── HistoryPage.tsx               # Snapshot manager & side-by-side run comparison modal
        │   ├── RecommendationsPage.tsx       # Tracked hygiene recommendations manager
        │   └── SettingsPage.tsx              # Account profile, linked GitHub identity & security
        └── components/
            ├── Navbar.tsx                    # SaaS navigation, user identity menu & health pill
            ├── GithubIcon.tsx                # Native SVG GitHub icon
            ├── ProgressSummaryCard.tsx       # Live resolution rate progress bar
            ├── QuickComparisonBanner.tsx     # Latest vs. previous score delta banner
            ├── HeroSection.tsx               # Headline, handle input & sample tags
            ├── ProfileHeader.tsx             # Candidate avatar, bio, links & metadata
            ├── StatsGrid.tsx                 # Metric cards (stars, forks, repos, langs)
            ├── PortfolioScoreCard.tsx        # 0–100 SVG circular gauge & 5 category breakdowns
            ├── AIAnalysisSection.tsx         # Groq AI portfolio assessment, strengths, feedback
            ├── VisualAnalytics.tsx           # Recharts language donut & repo reach bar charts
            ├── RepoQualityChecklist.tsx      # Audit of descriptions, topics, licenses & activity
            ├── RepositoryList.tsx            # Filterable repository cards with language badges
            ├── RecommendationsSection.tsx    # Baseline prioritized action items
            ├── RoadmapSection.tsx            # Baseline 7-day sprint & 30-day timeline views
            ├── ExportButton.tsx              # One-click JSON report download
            ├── LoadingSkeleton.tsx           # Shimmer loading layout
            ├── EmptyState.tsx                # Feature highlights before search
            └── ErrorCard.tsx                 # Contextual troubleshooting for rate limits & network
```

---

## Prerequisites

- **Python**: 3.11, 3.12, or 3.13
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: 9.0.0 or higher
- **Groq API Key**: Obtain a free key from [console.groq.com](https://console.groq.com)
- **GitHub Token (Optional)**: Raises GitHub public rate limits from 60 req/hr to 5,000 req/hr

---

## Local Setup Instructions

### 1. Backend Setup

1. Navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install backend dependencies (including official `groq` SDK):
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `backend/.env`:
   ```ini
   # Groq Cloud API Configuration (https://console.groq.com)
   GROQ_API_KEY=gsk_yourGroqApiKeyHere
   GROQ_MODEL=llama-3.3-70b-versatile

   # Optional: GitHub Personal Access Token (PAT)
   # Increases rate limit from 60 requests/hour to 5,000 requests/hour:
   # Create a free token at https://github.com/settings/tokens (classic with 'public_repo' or fine-grained read-only)
   GITHUB_TOKEN=

   # In-memory cache TTL for GitHub responses (seconds)
   GITHUB_CACHE_TTL_SECONDS=300

   # Allowed frontend origin for CORS
   FRONTEND_ORIGIN=http://localhost:5173
   HOST=0.0.0.0
   PORT=8000
   ENVIRONMENT=development
   ```

5. Run all 35 backend tests:
   ```bash
   pytest tests -v
   ```

6. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   Backend will be live at `http://127.0.0.1:8000`. OpenAPI docs are available at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Ensure `frontend/.env` contains:
   ```ini
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. Test production build:
   ```bash
   npm run build
   ```

---

## API Endpoints Reference

### 1. SaaS Authentication & User Lifecycle
- `POST /api/auth/register` — Create developer account with Argon2id password hashing and optional default profile handle.
- `POST /api/auth/login` — Sign in with email and password, establishing an HttpOnly cookie session and returning a JWT token.
- `POST /api/auth/logout` — Invalidate user session and clear HttpOnly cookie.
- `GET /api/auth/me` — Retrieve current authenticated user profile, linked GitHub account, and default handle.
- `PATCH /api/auth/default-profile` — Update default analyzed GitHub handle with SSRF validation.
- `POST /api/auth/change-password` — Change password requiring current password verification.
- `POST /api/auth/forgot-password` — Password reset endpoint documenting security architecture and email provider requirements.
- `GET /api/auth/github/url` — Generate secure GitHub OAuth 2.0 authorization URL with cryptographically signed single-use state token.
- `POST /api/auth/github/callback` — Exchange OAuth authorization code, bind verified numeric GitHub ID, and log user in.
- `POST /api/auth/github/disconnect` — Unlink connected GitHub account while protecting passwordless OAuth-only users from account lockout.

### 2. Analysis & AI Synthesis
- `GET /api/analyze/{username}?demo=false&skip_ai=false` — Full profile analysis, deterministic 5-pillar scoring, README fetching, Groq AI evaluation, automated recommendation reconciliation, and immutable snapshot persistence (when authenticated).
- `POST /api/analyze/{username}/ai?demo=false` — Re-evaluate Groq Cloud AI analysis without modifying deterministic scoring.

### 3. Persistent Analysis History & Run Comparison
- `GET /api/history?username=...&skip=0&limit=20` — List historical analysis snapshots with scores and metadata.
- `GET /api/history/{id}` — Retrieve full snapshot payload.
- `GET /api/history/{id}/compare/{id2}` — Side-by-side run comparison returning score delta (+/- pts), category shifts, repository reach deltas, and newly introduced vs. resolved hygiene findings.
- `DELETE /api/history/{id}` — Delete a historical snapshot with strict user isolation.

### 4. Adaptive Recommendations Tracking
- `GET /api/recommendations?status=open&username=...` — Filter tracked recommendations by status (`open`, `resolved`, `recurring`, `dismissed`).
- `PATCH /api/recommendations/{id}/status` — Manually dismiss or re-open a finding (prevents faking "resolved" status without verified GitHub evidence).

### 5. Health Check
- `GET /api/health` — Returns status of FastAPI service, database connection, GitHub rate limit status, and Groq LLM integration.

---

## Testing Commands

Run the full pytest suite (no real API key or internet access required — 100% mocked):
```bash
# From workspace root
.\backend\venv\Scripts\pytest.exe backend\tests -v
```

**51/51 Tests Passing Across 6 Suites**:
- **SaaS Authentication & OAuth (`test_saas_auth.py`)**:
  - `test_user_registration_success`: Registration with Argon2 password hashing and JWT token issuance
  - `test_user_registration_duplicate_email`: Rejection of duplicate email addresses
  - `test_user_registration_short_password`: Enforcement of minimum password length
  - `test_user_login_success_and_logout`: Authentication lifecycle, cookie issuance, and clean logout
  - `test_user_login_invalid_credentials_generic_message`: Generic message protection against user enumeration
  - `test_protected_endpoints_reject_unauthenticated`: HTTP 401 on unauthenticated access
  - `test_github_oauth_url_unconfigured_state`: Graceful notice when OAuth credentials are absent
  - `test_github_oauth_url_configured_state`: Valid GitHub OAuth redirect URL with signed state token
  - `test_forgot_password_documents_infrastructure_prerequisites`: Documentation of password reset delivery
- **History, Reconciliation & SSRF Validation (`test_saas_history_reconciliation.py`)**:
  - `test_url_normalization_cases`: SSRF defense, profile URL extraction, handling paths and invalid hosts
  - `test_recommendation_reconciliation_lifecycle`: First detection -> unchanged -> auto-resolve -> recurring reopen
  - `test_authenticated_history_and_user_isolation`: Snapshots persist for authenticated users and isolate between accounts
  - `test_recommendation_status_manual_update`: Manual dismiss and reopen; HTTP 422 preventing fake "resolved"
- **GitHub Rate Limit & Resilience (`test_github_rate_limits.py`)**:
  - `test_authenticated_headers_when_token_configured`: Injects `Authorization: Bearer <token>`
  - `test_authenticated_headers_with_existing_bearer_prefix`: Normalizes pre-formatted token strings
  - `test_unauthenticated_headers_when_no_token`: Cleanly omits authorization header
  - `test_token_is_never_leaked_in_exceptions`: Confirms token is excluded from error responses
  - `test_rate_limit_403_parses_reset_and_calculates_countdown`: Formats friendly countdown duration
  - `test_rate_limit_429_with_retry_after`: Respects `retry-after` header lockout
  - `test_fast_fail_lockout_prevents_network_hammering`: Short-circuits outbound traffic during quota exhaustion
  - `test_lockout_expires_cleanly`: Re-opens outbound requests once quota period elapses
  - `test_invalid_token_401_response`: Explains invalid/revoked personal access token
  - `test_in_memory_cache_prevents_duplicate_calls`: Confirms cache hits bypass network calls
  - `test_cache_expires_after_ttl`: Verifies automatic cache eviction after TTL
  - `test_pagination_stops_when_public_repos_count_met`: Prevents superfluous page requests
  - `test_pagination_zero_repos_makes_no_calls`: Zero network requests for empty portfolios
- **Groq Cloud AI Integration (`test_ai_service.py`)**:
  - `test_ai_service_missing_api_key`: Graceful fallback when key is unconfigured
  - `test_ai_service_demo_mode_returns_curated_mock`: Offline demo candidate validation
  - `test_ai_service_successful_groq_response`: Mock Groq chat completion parsing & validation
  - `test_ai_service_handles_auth_error`: Invalid API key caught safely
  - `test_ai_service_handles_rate_limit`: Groq 429 rate limit caught cleanly
  - `test_ai_service_handles_timeout`: Provider timeout handled without crash
  - `test_ai_service_handles_malformed_json`: Pydantic schema validation failure caught
  - `test_ai_service_handles_markdown_fences`: Tolerates markdown wrapped JSON blocks
  - `test_ai_service_normalizes_priority_and_strings`: Validates enum normalization
  - `test_ai_service_dynamic_key_and_model`: Verifies runtime configuration changes
- **Scoring & Analyzer (`test_analyzer.py`)**:
  - `test_scoring_boundaries_empty_profile`: Bounds testing on empty candidate data
  - `test_scoring_boundaries_ideal_profile`: Maximum score cap verification
  - `test_recommendation_generation_flags_missing_elements`: Rule-based recommendation flags
  - `test_roadmap_structure`: Baseline roadmap milestone steps
- **API Endpoints (`test_api.py`)**:
  - `test_health_endpoint`: Health check status schema
  - `test_demo_profile_analysis`: Offline demo end-to-end response
  - `test_invalid_username_format`: Rejection of illegal characters & hyphens
  - `test_valid_profile_analysis_with_mocked_github`: End-to-end analysis payload
  - `test_nonexistent_github_user_404`: Proper 404 user not found mapping
  - `test_github_rate_limit_429`: GitHub rate limit handling with reset time
  - `test_github_network_timeout_504`: Gateway timeout handling
  - `test_user_with_empty_repositories`: Zero-repository profile resilience
  - `test_github_service_fetch_profile_unit_mapping`: Direct HTTP error status translation
  - `test_post_analyze_ai_only_demo`: POST /ai endpoint validation
  - `test_ai_failure_preserves_github_metrics_and_score`: Score and metrics preserved during AI failure

---

## Production Cloud Deployment Guide

### Deploy Backend to Render

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), select **New +** -> **Web Service**.
3. Select your repository and specify:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables on Render:
   - `GROQ_API_KEY`: Your real Groq API key (`gsk_...`)
   - `GROQ_MODEL`: `llama-3.3-70b-versatile`
   - `FRONTEND_ORIGIN`: Your deployed Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `GITHUB_TOKEN`: *(Optional)* Your personal access token
   - `ENVIRONMENT`: `production`

### Deploy Frontend to Vercel

1. In the [Vercel Dashboard](https://vercel.com), select **Add New** -> **Project**.
2. Select your repository and configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Set Environment Variables on Vercel:
   - `VITE_API_BASE_URL`: Your deployed Render backend URL (e.g. `https://devprofile-ai-backend.onrender.com`)
4. Deploy! `frontend/vercel.json` will automatically route SPA routes to `index.html`.

---

## Security & Reliability Guidelines

- **Zero Client Credential Leakage**: `GROQ_API_KEY` and `GITHUB_TOKEN` exist solely in the backend runtime. They are never exposed in React code, HTTP response headers, or client bundle assets.
- **Untrusted Content Sanitization**: All repository descriptions and README snippets are scrubbed and truncated before inclusion in LLM prompts to prevent prompt injection.
- **Deterministic Independence**: The 0–100 portfolio score is strictly calculated by deterministic code in `scoring.py` and is never hallucinated or inflated by the LLM.
