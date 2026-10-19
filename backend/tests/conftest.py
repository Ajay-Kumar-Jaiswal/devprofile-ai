import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app as fastapi_app
import app.db_models  # noqa: F401 ensures all tables registered on metadata
from app.services.github_service import github_service

# Centralized in-memory SQLite database using StaticPool for thread-safe test execution
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


fastapi_app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def db_tables_lifecycle():
    """Initializes a fresh schema before each test and purges after completion."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(autouse=True)
def reset_github_service_state():
    """Ensures each test runs with a fresh rate-limit state and empty cache."""
    github_service._rate_limit_reset_epoch = None
    github_service.clear_cache()
    yield
    github_service._rate_limit_reset_epoch = None
    github_service.clear_cache()


@pytest.fixture(autouse=True)
def reset_settings_allowlist():
    """Ensures personal instance allowlist is cleared before and after each test."""
    from app.config import settings
    settings.ALLOWED_GITHUB_ACCOUNTS = None
    yield
    settings.ALLOWED_GITHUB_ACCOUNTS = None


@pytest.fixture
def test_user():
    """Creates and returns an active test user in the database."""
    from app.db_models import User
    from app.services.auth_service import hash_password

    db = TestSession()
    try:
        user = User(
            email="tester@campus.edu",
            hashed_password=hash_password("password123"),
            full_name="Campus Tester",
            default_profile_username="testuser",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def auth_headers(test_user):
    """Generates an Authorization Bearer header for the test_user."""
    from app.services.auth_service import create_access_token

    token = create_access_token({"sub": str(test_user.id), "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}
