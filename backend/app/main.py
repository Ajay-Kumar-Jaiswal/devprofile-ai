from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import init_db

from app.models import HealthResponse
from app.routers import analyze, auth, history, recommendations, internships
from app.services.github_service import github_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("devprofile_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite / PostgreSQL tables on application startup
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
    yield


app = FastAPI(
    title="DevProfile AI — GitHub Profile Analyzer API",
    description="Production-grade SaaS backend service providing deterministic developer portfolio evaluations, GitHub OAuth, persistent analysis history, and adaptive recommendations.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
allowed_origins = [origin.strip() for origin in settings.FRONTEND_ORIGIN.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(recommendations.router)
app.include_router(internships.router)


@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    tags=["System"],
)
async def health_check():
    """Returns application health and configuration status."""
    token_configured = bool(github_service.token)
    groq_configured = bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip())
    is_rate_limited = getattr(github_service, "is_rate_limited", False)
    reset_epoch = getattr(github_service, "rate_limit_reset_epoch", None)

    return HealthResponse(
        status="healthy",
        environment=settings.ENVIRONMENT,
        version="2.0.0",
        github_api_status="authenticated (rate-limit: 5,000/hr)" if token_configured else "unauthenticated (rate-limit: 60/hr)",
        groq_api_status=f"configured (model: {settings.GROQ_MODEL})" if groq_configured else "unconfigured (deterministic fallback)",
        github_authenticated=token_configured,
        github_rate_limited=is_rate_limited,
        github_rate_limit_reset=reset_epoch,
        groq_configured=groq_configured,
    )


@app.get("/", tags=["System"])
async def root():
    """Root metadata endpoint."""
    return {
        "service": "DevProfile AI — GitHub Profile Analyzer API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "auth": "/api/auth",
        "analyze": "/api/analyze/{username}",
        "history": "/api/history",
        "recommendations": "/api/recommendations",
    }


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handles unexpected database errors safely without leaking internal SQL queries or tables."""
    logger.error(f"Database error executing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "A database error occurred while processing your request. Please try again later."
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all unhandled exception handler ensuring clean JSON error output."""
    logger.error(f"Unhandled error processing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected server error occurred. Please try again later."
        },
    )

