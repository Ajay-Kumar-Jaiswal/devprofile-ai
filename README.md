<div align="center">

# DevProfile AI

### Turn a GitHub profile into an actionable developer growth plan.

Analyze profile quality, explore repository signals, receive AI-assisted feedback, and track improvements over time.

<p>
  <a href="https://devprofile-ai.vercel.app/"><strong>Live Demo</strong></a>
  ·
  <a href="https://github.com/Ajay-Kumar-Jaiswal/devprofile-ai"><strong>Source Code</strong></a>
</p>

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Groq](https://img.shields.io/badge/AI-Groq-F55036)
![License](https://img.shields.io/badge/License-MIT-8A63D2)

</div>

---

## Overview

**DevProfile AI** is a full-stack application that helps developers understand how their public GitHub profile and repositories present their work. It combines a rule-based portfolio score with AI-generated feedback to highlight strengths, identify improvement opportunities, and suggest practical next steps.

The score is based on observable profile and repository signals. It is intended as a guide to profile presentation—not a measure of a developer's worth, ability, or hiring potential.

## Features

- **Portfolio score:** A deterministic score from 0–100 across five areas: profile completeness, repository documentation, community engagement, technology breadth, and maintenance activity.
- **AI-assisted review:** Uses Groq to generate a summary, evidence-based strengths, improvement areas, and actionable recommendations.
- **Repository insights:** Reviews available repository metadata, including languages, stars, forks, descriptions, topics, licenses, and activity.
- **Action roadmaps:** Provides suggested short-term and longer-term steps for improving a developer portfolio.
- **Account authentication:** Email/password registration and login, plus GitHub OAuth.
- **Analysis history:** Save analysis snapshots, revisit previous results, and compare changes between runs.
- **Tracked recommendations:** Follow findings across analyses, dismiss items, and identify recurring issues.
- **Visual analytics:** Explore language distribution and repository reach through charts.
- **JSON export:** Download a structured analysis report.
- **Demo mode:** Explore a sample profile without needing to analyze a real account.

## How it works

1. Enter a GitHub username or profile URL.
2. DevProfile AI retrieves publicly available profile and repository information.
3. A deterministic scoring engine evaluates five portfolio areas.
4. Groq generates additional feedback from the available evidence.
5. Review recommendations and roadmaps, then save and compare future analyses when signed in.

> **Note:** Results depend on the information available from GitHub and the configured AI service. AI feedback is advisory; review recommendations before acting on them.

## Architecture

```text
React + TypeScript + Vite
          |
          | HTTPS / JSON API
          v
     FastAPI backend
       /    |     \
      v     v      v
 GitHub API Groq  SQLAlchemy
                   |
             SQLite / PostgreSQL
```

### Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Routing and UI | React Router, Lucide icons |
| Charts | Recharts |
| Backend | Python, FastAPI, Pydantic |
| Persistence | SQLAlchemy, SQLite / PostgreSQL |
| Authentication | GitHub OAuth 2.0, JWT sessions, Argon2id password hashing |
| AI | Groq Python SDK |
| External data | GitHub REST API |
| Deployment | Vercel (frontend), Render (backend) |

## Live application

- **Frontend:** [devprofile-ai.vercel.app](https://devprofile-ai.vercel.app/)
- **Backend health endpoint:** `https://<your-render-service>.onrender.com/api/health`
- **API documentation:** `https://<your-render-service>.onrender.com/docs`

Replace `<your-render-service>` with your actual Render service hostname when using the backend links.

## Run locally

### Requirements

- Python 3.11 or newer
- Node.js 18 or newer (Node.js 20+ recommended)
- npm
- A Groq API key for live AI analysis
- GitHub OAuth credentials for GitHub sign-in (optional for basic local development)

### 1. Start the backend

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file from the example:

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux**
```bash
cp .env.example .env
```

Update `backend/.env` with the settings required by `backend/app/config.py`. At minimum, configure your Groq key for live AI analysis and set the local frontend origin for CORS.

Example values:

```ini
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=your_supported_groq_model
FRONTEND_ORIGIN=http://localhost:5173
ENVIRONMENT=development
```

Do not commit `.env` or real credentials.

Start the API:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`; interactive API documentation is at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

Open another terminal from the repository root:

```bash
cd frontend
npm install
```

Create `frontend/.env` from `.env.example` and set:

```ini
VITE_API_BASE_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173`.

To verify the production build:

```bash
npm run build
```

## Configuration

Configure secrets in local `.env` files for development and in the hosting provider's environment settings for deployment.

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend; frontend build-time variable |
| `GROQ_API_KEY` | Groq API key used by the backend |
| `GROQ_MODEL` | Model identifier supported by your Groq account |
| `FRONTEND_ORIGIN` | Frontend origin allowed by backend CORS |
| `GITHUB_CLIENT_ID` | GitHub OAuth application client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth application secret |
| `GITHUB_REDIRECT_URI` | OAuth callback URL configured for the deployed frontend, if required by the app configuration |
| `SECRET_KEY` | Secret used for signing application tokens/state, according to backend configuration |
| `DATABASE_URL` | SQLAlchemy database connection URL; use a PostgreSQL URL for hosted PostgreSQL |

Check `backend/.env.example` and `frontend/.env.example` for the exact settings supported by the current code. Never expose backend secrets through `VITE_` variables; Vite variables are included in the browser bundle.

## Deployment

### Frontend — Vercel

1. Import the GitHub repository into Vercel.
2. Set the project root directory to `frontend`.
3. Use the Vite framework preset.
4. Set the build command to `npm run build` and output directory to `dist`.
5. Add `VITE_API_BASE_URL` with the public Render backend URL.
6. Deploy and verify the production site.

### Backend — Render

1. Create a Web Service from the GitHub repository.
2. Set the root directory to `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Configure the backend environment variables, database URL, and production frontend origin.
6. Deploy and verify `/api/health` and `/docs`.

If both services are configured for automatic deployment, pushing changes to their watched branch can trigger new deployments. Confirm each service's branch and deployment settings in its dashboard.

## API overview

| Area | Endpoint examples |
|---|---|
| Health | `GET /api/health` |
| Analysis | `GET /api/analyze/{username}` |
| AI re-analysis | `POST /api/analyze/{username}/ai` |
| Registration and login | `POST /api/auth/register`, `POST /api/auth/login` |
| Current user | `GET /api/auth/me` |
| GitHub OAuth | `GET /api/auth/github/url`, `POST /api/auth/github/callback` |
| Analysis history | `GET /api/history` |
| Compare saved runs | `GET /api/history/{id}/compare/{id2}` |
| Recommendations | `GET /api/recommendations` |

For the complete, current schema and interactive endpoint details, run the backend and open `/docs`.

## Testing

Run the backend tests from the repository root:

```bash
pytest backend/tests -v
```

Run the frontend production build:

```bash
cd frontend
npm run build
```

Keep the README's test counts and coverage claims aligned with the test suite currently in the repository.

## Security notes

- Keep Groq keys, GitHub OAuth secrets, database credentials, and signing secrets on the backend.
- Use environment variables for configuration; do not commit `.env` files.
- Treat GitHub profile and repository text as external, untrusted input.
- The portfolio score is rule-based; AI output is supplementary and should not override the underlying evidence.

## Project structure

```text
devprofile-ai/
├── backend/
│   ├── app/
│   │   ├── analyzer/       # Scoring and recommendation logic
│   │   ├── routers/        # API routes
│   │   ├── services/       # GitHub, authentication, and AI services
│   │   ├── config.py       # Application settings
│   │   ├── database.py     # Database setup
│   │   └── main.py         # FastAPI entry point
│   ├── tests/              # Backend tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Authentication state
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   ├── .env.example
│   └── package.json
└── README.md
```

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.
