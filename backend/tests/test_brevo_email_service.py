import pytest
import httpx
from app.config import settings
from app.services.email_service import (
    send_brevo_transactional_email,
    send_otp_email,
    send_password_reset_otp_email,
    send_account_deletion_otp_email,
    EmailDeliveryError,
    _parse_sender,
    BREVO_API_URL,
)


def test_parse_sender_formats():
    """Verifies that sender strings with and without names are parsed accurately."""
    email, name = _parse_sender("DevProfile AI <notifications@devprofile.ai>", default_name="Fallback")
    assert email == "notifications@devprofile.ai"
    assert name == "DevProfile AI"

    email2, name2 = _parse_sender("alerts@devprofile.ai", default_name="Default Team")
    assert email2 == "alerts@devprofile.ai"
    assert name2 == "Default Team"

    email3, name3 = _parse_sender("", default_name="Fallback Name")
    assert email3 == ""
    assert name3 == "Fallback Name"


@pytest.mark.asyncio
async def test_brevo_missing_api_key(monkeypatch):
    """Fails with an informative EmailDeliveryError if BREVO_API_KEY is not configured."""
    monkeypatch.setattr(settings, "BREVO_API_KEY", None)
    with pytest.raises(EmailDeliveryError, match="BREVO_API_KEY"):
        await send_brevo_transactional_email(
            to_email="student@campus.edu",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            api_key=None,
        )


@pytest.mark.asyncio
async def test_brevo_missing_from_email(monkeypatch):
    """Fails with an informative EmailDeliveryError if BREVO_FROM_EMAIL is not configured."""
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-validmockkey12345")
    monkeypatch.setattr(settings, "BREVO_FROM_EMAIL", "")
    with pytest.raises(EmailDeliveryError, match="BREVO_FROM_EMAIL"):
        await send_brevo_transactional_email(
            to_email="student@campus.edu",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            from_email="",
        )


@pytest.mark.asyncio
async def test_brevo_invalid_recipient():
    """Fails immediately if recipient email is empty or invalid."""
    with pytest.raises(EmailDeliveryError, match="Recipient email address is invalid"):
        await send_brevo_transactional_email(
            to_email="invalid-recipient",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            api_key="xkeysib-mock",
            from_email="noreply@devprofile.ai",
        )


@pytest.mark.asyncio
async def test_brevo_successful_delivery(monkeypatch):
    """Tests successful Brevo transactional email delivery with HTTP 201."""
    captured_request = {}

    def mock_handler(request: httpx.Request):
        assert request.url == BREVO_API_URL
        assert request.headers.get("api-key") == "xkeysib-mock-api-key-test"
        assert request.headers.get("content-type") == "application/json"
        assert request.headers.get("accept") == "application/json"

        import json
        payload = json.loads(request.content.decode("utf-8"))
        captured_request["payload"] = payload

        return httpx.Response(
            status_code=201,
            json={"messageId": "<202611041200.1234567890@smtp-relay.mailin.fr>"},
        )

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    result = await send_brevo_transactional_email(
        to_email="student@campus.edu",
        subject="Welcome to DevProfile AI",
        html_content="<p>Hello Student</p>",
        text_content="Hello Student",
        api_key="xkeysib-mock-api-key-test",
        from_email="noreply@devprofile.ai",
        from_name="DevProfile AI",
    )

    assert result["success"] is True
    assert result["id"] == "<202611041200.1234567890@smtp-relay.mailin.fr>"

    payload = captured_request["payload"]
    assert payload["sender"]["email"] == "noreply@devprofile.ai"
    assert payload["sender"]["name"] == "DevProfile AI"
    assert payload["to"] == [{"email": "student@campus.edu"}]
    assert payload["subject"] == "Welcome to DevProfile AI"
    assert payload["htmlContent"] == "<p>Hello Student</p>"
    assert payload["textContent"] == "Hello Student"


@pytest.mark.asyncio
async def test_brevo_http_401_unauthorized(monkeypatch):
    """Tests Brevo HTTP 401 invalid API key handling."""
    def mock_handler(request: httpx.Request):
        return httpx.Response(
            status_code=401,
            json={"code": "unauthorized", "message": "Key not found"},
        )

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    with pytest.raises(EmailDeliveryError, match="BREVO_API_KEY"):
        await send_brevo_transactional_email(
            to_email="student@campus.edu",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            api_key="xkeysib-invalid-key",
            from_email="noreply@devprofile.ai",
        )


@pytest.mark.asyncio
async def test_brevo_http_403_unverified_sender(monkeypatch):
    """Tests Brevo HTTP 403 unverified sender error handling."""
    def mock_handler(request: httpx.Request):
        return httpx.Response(
            status_code=403,
            json={"code": "permission_denied", "message": "Sender email is not verified"},
        )

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    with pytest.raises(EmailDeliveryError, match="not verified in Brevo"):
        await send_brevo_transactional_email(
            to_email="student@campus.edu",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            api_key="xkeysib-valid-key",
            from_email="unverified@customdomain.com",
        )


@pytest.mark.asyncio
async def test_brevo_http_429_rate_limit(monkeypatch):
    """Tests Brevo HTTP 429 rate limit error handling."""
    def mock_handler(request: httpx.Request):
        return httpx.Response(
            status_code=429,
            json={"code": "resourcelimit_exceeded", "message": "Too many requests"},
        )

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    with pytest.raises(EmailDeliveryError, match="rate limit"):
        await send_brevo_transactional_email(
            to_email="student@campus.edu",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            api_key="xkeysib-valid-key",
            from_email="noreply@devprofile.ai",
        )


@pytest.mark.asyncio
async def test_brevo_http_500_provider_error(monkeypatch):
    """Tests Brevo HTTP 500 internal server error handling."""
    def mock_handler(request: httpx.Request):
        return httpx.Response(
            status_code=500,
            json={"code": "server_error", "message": "Internal error"},
        )

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    with pytest.raises(EmailDeliveryError, match="temporarily unavailable"):
        await send_brevo_transactional_email(
            to_email="student@campus.edu",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            api_key="xkeysib-valid-key",
            from_email="noreply@devprofile.ai",
        )


@pytest.mark.asyncio
async def test_brevo_network_timeout(monkeypatch):
    """Tests Brevo connection timeout error handling."""
    def mock_handler(request: httpx.Request):
        raise httpx.TimeoutException("Read timed out")

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    with pytest.raises(EmailDeliveryError, match="timed out"):
        await send_brevo_transactional_email(
            to_email="student@campus.edu",
            subject="Test",
            html_content="<p>Test</p>",
            text_content="Test",
            api_key="xkeysib-valid-key",
            from_email="noreply@devprofile.ai",
        )


@pytest.mark.asyncio
async def test_send_otp_email_via_brevo(monkeypatch):
    """Verifies that send_otp_email dispatches the correct verification template via Brevo."""
    captured = {}

    def mock_handler(request: httpx.Request):
        import json
        captured["body"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(status_code=201, json={"messageId": "<otp-msg-id-1>"})

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    result = await send_otp_email(
        to_email="newuser@campus.edu",
        otp_code="849201",
        api_key="xkeysib-mock",
        from_email="noreply@devprofile.ai",
        from_name="DevProfile AI",
    )

    assert result["success"] is True
    assert result["id"] == "<otp-msg-id-1>"

    body = captured["body"]
    assert body["to"] == [{"email": "newuser@campus.edu"}]
    assert "849201" in body["htmlContent"]
    assert "849201" in body["textContent"]
    assert "Your DevProfile AI Verification Code" in body["subject"]


@pytest.mark.asyncio
async def test_send_password_reset_otp_email_via_brevo(monkeypatch):
    """Verifies that send_password_reset_otp_email dispatches the password reset template via Brevo."""
    captured = {}

    def mock_handler(request: httpx.Request):
        import json
        captured["body"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(status_code=201, json={"messageId": "<reset-msg-id-2>"})

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    result = await send_password_reset_otp_email(
        to_email="forgotten@campus.edu",
        otp_code="392817",
        api_key="xkeysib-mock",
        from_email="noreply@devprofile.ai",
        from_name="DevProfile AI",
    )

    assert result["success"] is True
    assert result["id"] == "<reset-msg-id-2>"

    body = captured["body"]
    assert body["to"] == [{"email": "forgotten@campus.edu"}]
    assert "392817" in body["htmlContent"]
    assert "392817" in body["textContent"]
    assert "Reset your DevProfile AI password" in body["subject"]


@pytest.mark.asyncio
async def test_send_account_deletion_otp_email_via_brevo(monkeypatch):
    """Verifies that send_account_deletion_otp_email dispatches the deletion template via Brevo."""
    captured = {}

    def mock_handler(request: httpx.Request):
        import json
        captured["body"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(status_code=201, json={"messageId": "<del-msg-id-3>"})

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda *args, **kwargs: httpx.AsyncClient(transport=transport),
    )

    result = await send_account_deletion_otp_email(
        to_email="delete-me@campus.edu",
        otp_code="918273",
        api_key="xkeysib-mock",
        from_email="noreply@devprofile.ai",
        from_name="DevProfile AI",
    )

    assert result["success"] is True
    assert result["id"] == "<del-msg-id-3>"

    body = captured["body"]
    assert body["to"] == [{"email": "delete-me@campus.edu"}]
    assert "918273" in body["htmlContent"]
    assert "918273" in body["textContent"]
    assert "Confirm DevProfile AI Account Deletion" in body["subject"]
