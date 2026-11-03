import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger("devprofile_ai.email_service")

RESEND_API_URL = "https://api.resend.com/emails"


class EmailDeliveryError(Exception):
    """Raised when email delivery via Resend HTTPS API fails."""
    pass


def build_otp_email_html(otp_code: str, recipient_email: str) -> str:
    """
    Renders a responsive, branded HTML email for DevProfile AI OTP verification.
    Matches the platform's dark theme with violet accents.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your DevProfile AI Verification Code</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #0b0d12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #cbd5e1;
    }}
    .wrapper {{
      max-width: 560px;
      margin: 40px auto;
      background: #101723;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }}
    .header {{
      padding: 32px 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      background: linear-gradient(180deg, rgba(124, 58, 237, 0.08) 0%, rgba(16, 23, 35, 0) 100%);
    }}
    .brand {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0;
    }}
    .brand span {{
      color: #a78bfa;
    }}
    .tagline {{
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }}
    .content {{
      padding: 32px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px;
    }}
    .otp-card {{
      background: #0b0d12;
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #c4b5fd;
      display: inline-block;
      padding: 4px 12px;
      user-select: all;
    }}
    .otp-expiry {{
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
    }}
    .security-notice {{
      background: rgba(148, 163, 184, 0.06);
      border-left: 3px solid #8b5cf6;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
      margin-top: 24px;
    }}
    .footer {{
      padding: 24px 32px;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
      text-align: center;
      font-size: 11px;
      color: #475569;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">DevProfile<span>.AI</span></div>
      <div class="tagline">Developer Portfolio &amp; Internship Intelligence</div>
    </div>
    <div class="content">
      <h1>Verify your email address</h1>
      <p>
        Welcome to DevProfile AI! Please use the 6-digit verification code below
        to activate your account and complete your signup.
      </p>

      <div class="otp-card">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-expiry">Expires in 10 minutes &bull; Single-use only</div>
      </div>

      <div class="security-notice">
        <strong>Security tip:</strong> DevProfile AI will never ask for your verification code.
        If you did not request this code, someone may have entered your email by mistake.
        You can safely disregard this email.
      </div>
    </div>
    <div class="footer">
      &copy; DevProfile AI. All rights reserved.<br>
      This email was sent to {recipient_email}.
    </div>
  </div>
</body>
</html>"""


def build_otp_email_text(otp_code: str, recipient_email: str) -> str:
    """Plaintext fallback for the OTP verification email."""
    return f"""DevProfile AI — Email Verification

Your 6-digit verification code is:

    {otp_code}

This code will expire in 10 minutes and can only be used once.

Security notice: DevProfile AI will never ask for this code. If you did not create an account on DevProfile AI, you can safely ignore this email.

Sent to: {recipient_email}
"""


def build_deletion_otp_email_html(otp_code: str, recipient_email: str) -> str:
    """
    Renders a high-security, branded danger/red HTML email for permanent account deletion.
    Clearly warns the user about irreversible data destruction.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Permanent Account Deletion — DevProfile AI</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #0b0d12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #cbd5e1;
    }}
    .wrapper {{
      max-width: 560px;
      margin: 40px auto;
      background: #101723;
      border: 1px solid rgba(244, 63, 94, 0.3);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
    }}
    .header {{
      padding: 32px 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(244, 63, 94, 0.2);
      background: linear-gradient(180deg, rgba(244, 63, 94, 0.12) 0%, rgba(16, 23, 35, 0) 100%);
    }}
    .brand {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0;
    }}
    .brand span {{
      color: #f43f5e;
    }}
    .tagline {{
      font-size: 12px;
      color: #fb7185;
      margin-top: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .content {{
      padding: 32px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px;
    }}
    .warning-banner {{
      background: rgba(244, 63, 94, 0.1);
      border-left: 4px solid #f43f5e;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 13px;
      line-height: 1.5;
      color: #fecdd3;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px;
    }}
    .otp-card {{
      background: #0b0d12;
      border: 2px solid rgba(244, 63, 94, 0.5);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #f43f5e;
      margin: 0;
    }}
    .otp-label {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-top: 8px;
    }}
    .data-list {{
      background: #0d121c;
      border: 1px solid rgba(148, 163, 184, 0.12);
      border-radius: 10px;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 12px;
      color: #94a3b8;
    }}
    .data-list ul {{
      margin: 8px 0 0;
      padding-left: 20px;
    }}
    .data-list li {{
      margin-bottom: 6px;
    }}
    .footer {{
      padding: 24px 32px;
      background: #0d131d;
      border-top: 1px solid rgba(148, 163, 184, 0.08);
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">DevProfile<span>.AI</span></div>
      <div class="tagline">&#9888; Security Alert: Account Deletion Request</div>
    </div>
    <div class="content">
      <h1>Confirm Permanent Account Deletion</h1>
      <div class="warning-banner">
        <strong>Warning:</strong> You have requested to permanently delete your DevProfile AI account. This action cannot be reversed.
      </div>
      <p>
        To complete the permanent deletion of your account and all associated data, enter this 6-digit confirmation code:
      </p>
      <div class="otp-card">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-label">Single-Use Deletion Code &bull; Valid for 10 minutes</div>
      </div>
      <div class="data-list">
        <strong>The following records will be permanently erased:</strong>
        <ul>
          <li>All portfolio scores and aggregate repository metrics</li>
          <li>Full analysis history and past comparison reports</li>
          <li>Saved internship postings and bookmark data</li>
          <li>Tracked placement recommendations and progress roadmaps</li>
          <li>Connected GitHub OAuth identities and authentication credentials</li>
        </ul>
      </div>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
        If you did not request this deletion, change your password immediately and secure your account.
      </p>
    </div>
    <div class="footer">
      DevProfile AI &bull; Automated Campus Placement & GitHub Portfolio Readiness<br>
      Automated security notification sent to {recipient_email}.
    </div>
  </div>
</body>
</html>
"""


def build_deletion_otp_email_text(otp_code: str, recipient_email: str) -> str:
    """
    Renders a plaintext deletion confirmation email fallback.
    """
    return f"""DevProfile AI — PERMANENT ACCOUNT DELETION CONFIRMATION

SECURITY WARNING:
You have requested to permanently delete your DevProfile AI account for:
{recipient_email}

Your 6-digit deletion verification code is:
========================================
             {otp_code}
========================================

This code will expire in 10 minutes and can only be used once.

PERMANENT DATA ERASURE NOTICE:
Confirming this code will immediately and permanently erase:
- All portfolio scores and GitHub analysis history
- All saved internships and tracking history
- All placement recommendations and progress events
- All connected GitHub accounts and password credentials

This action is irreversible.

If you did NOT request to delete your account, ignore this message and change your password immediately.

--
DevProfile AI Security Team
"""


async def send_account_deletion_otp_email(
    to_email: str,
    otp_code: str,
    api_key: Optional[str] = None,
    from_email: Optional[str] = None,
) -> dict:
    """
    Sends an account deletion OTP email using the Resend HTTPS API.
    Does NOT use SMTP. Never exposes API keys or logs plaintext OTP values.
    """
    effective_api_key = api_key or settings.RESEND_API_KEY
    effective_from = from_email or settings.RESEND_FROM_EMAIL

    if not effective_api_key or not effective_api_key.strip():
        logger.error("RESEND_API_KEY is not configured in backend environment.")
        raise EmailDeliveryError(
            "Email service is not configured. Please set RESEND_API_KEY in your environment."
        )

    clean_recipient = to_email.lower().strip()
    html_content = build_deletion_otp_email_html(otp_code, clean_recipient)
    text_content = build_deletion_otp_email_text(otp_code, clean_recipient)

    payload = {
        "from": effective_from,
        "to": [clean_recipient],
        "subject": "Action Required: Confirm DevProfile AI Account Deletion",
        "html": html_content,
        "text": text_content,
    }

    headers = {
        "Authorization": f"Bearer {effective_api_key.strip()}",
        "Content-Type": "application/json",
        "User-Agent": "DevProfile-AI-Backend/2.0",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)

            if resp.status_code not in (200, 201):
                logger.error(
                    f"Resend HTTPS API error on deletion OTP: HTTP {resp.status_code} - recipient={clean_recipient}"
                )
                raise EmailDeliveryError(
                    f"Resend email delivery failed (HTTP {resp.status_code}). Please try again."
                )

            data = resp.json()
            email_id = data.get("id", "sent")
            logger.info(f"Account deletion OTP email dispatched via Resend (id={email_id}) to {clean_recipient}.")
            return {"success": True, "id": email_id}

    except httpx.RequestError as exc:
        logger.error(f"Network error communicating with Resend HTTPS API for deletion OTP: {type(exc).__name__}")
        raise EmailDeliveryError(
            "Could not connect to email delivery service. Please check network connection and try again."
        ) from exc
async def send_otp_email(
    to_email: str,
    otp_code: str,
    api_key: Optional[str] = None,
    from_email: Optional[str] = None,
) -> dict:
    """
    Sends an OTP verification email using the Resend HTTPS API.
    Does NOT use SMTP. Never exposes API keys or logs plaintext OTP values.
    """
    effective_api_key = api_key or settings.RESEND_API_KEY
    effective_from = from_email or settings.RESEND_FROM_EMAIL

    if not effective_api_key or not effective_api_key.strip():
        logger.error("RESEND_API_KEY is not configured in backend environment.")
        raise EmailDeliveryError(
            "Email service is not configured. Please set RESEND_API_KEY in your environment."
        )

    clean_recipient = to_email.lower().strip()
    html_content = build_otp_email_html(otp_code, clean_recipient)
    text_content = build_otp_email_text(otp_code, clean_recipient)

    payload = {
        "from": effective_from,
        "to": [clean_recipient],
        "subject": "Your DevProfile AI Verification Code",
        "html": html_content,
        "text": text_content,
    }

    headers = {
        "Authorization": f"Bearer {effective_api_key.strip()}",
        "Content-Type": "application/json",
        "User-Agent": "DevProfile-AI-Backend/2.0",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)

            if resp.status_code not in (200, 201):
                err_body = resp.text
                logger.error(
                    f"Resend HTTPS API error: HTTP {resp.status_code} - recipient={clean_recipient}"
                )
                raise EmailDeliveryError(
                    f"Resend email delivery failed (HTTP {resp.status_code}). Please check recipient address or try again."
                )

            data = resp.json()
            email_id = data.get("id", "sent")
            logger.info(f"Verification email dispatched via Resend (id={email_id}) to {clean_recipient}.")
            return {"success": True, "id": email_id}

    except httpx.RequestError as exc:
        logger.error(f"Network error communicating with Resend HTTPS API: {type(exc).__name__}")
        raise EmailDeliveryError(
            "Could not connect to email delivery service. Please check network connection and try again."
        ) from exc


def build_password_reset_otp_email_html(otp_code: str, recipient_email: str) -> str:
    """
    Renders a responsive, branded HTML email for DevProfile AI password recovery.
    Matches the platform's dark theme with violet accents.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your DevProfile AI Password</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #0b0d12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #cbd5e1;
    }}
    .wrapper {{
      max-width: 560px;
      margin: 40px auto;
      background: #101723;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }}
    .header {{
      padding: 32px 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      background: linear-gradient(180deg, rgba(124, 58, 237, 0.08) 0%, rgba(16, 23, 35, 0) 100%);
    }}
    .brand {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0;
    }}
    .brand span {{
      color: #a78bfa;
    }}
    .tagline {{
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }}
    .content {{
      padding: 32px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px;
      letter-spacing: -0.3px;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px;
    }}
    .otp-container {{
      background: rgba(124, 58, 237, 0.06);
      border: 1px dashed rgba(167, 139, 250, 0.35);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }}
    .otp-label {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
      color: #a78bfa;
      margin-bottom: 8px;
    }}
    .otp-code {{
      font-family: 'SF Mono', Consolas, Monaco, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #ffffff;
      margin: 0;
      padding: 4px 0;
    }}
    .info-list {{
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 10px;
      padding: 16px 20px;
      margin-top: 24px;
    }}
    .info-item {{
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .info-item + .info-item {{
      margin-top: 8px;
    }}
    .bullet {{
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #a78bfa;
      border-radius: 50%;
      flex-shrink: 0;
    }}
    .footer {{
      padding: 20px 32px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      text-align: center;
      font-size: 11px;
      color: #64748b;
      background: #0d121c;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">DevProfile<span>.AI</span></div>
      <div class="tagline">Developer Portfolio Analytics & Placement Intelligence</div>
    </div>
    <div class="content">
      <h1>Password Reset Request</h1>
      <p>
        We received a request to reset the password for your DevProfile AI account (<strong>{recipient_email}</strong>).
        Use the 6-digit verification code below to authorize your password change.
      </p>

      <div class="otp-container">
        <div class="otp-label">Password Reset Code</div>
        <div class="otp-code">{otp_code}</div>
      </div>

      <div class="info-list">
        <div class="info-item">
          <span class="bullet"></span>
          <span>This code expires in <strong>10 minutes</strong> and is strictly single-use.</span>
        </div>
        <div class="info-item">
          <span class="bullet"></span>
          <span>Never share this code with anyone. DevProfile AI will never ask for this code.</span>
        </div>
        <div class="info-item">
          <span class="bullet"></span>
          <span>If you did not request this password reset, you can safely ignore this email. Your account remains secure.</span>
        </div>
      </div>
    </div>
    <div class="footer">
      This is an automated security notice dispatched to {recipient_email}.<br>
      &copy; 2026 DevProfile AI. All rights reserved.
    </div>
  </div>
</body>
</html>"""


def build_password_reset_otp_email_text(otp_code: str, recipient_email: str) -> str:
    """Plain-text fallback for password reset emails."""
    return f"""DevProfile AI — Password Reset Request
==================================================

We received a request to reset the password for your DevProfile AI account: {recipient_email}

Your 6-digit password reset code is:
========================================
             {otp_code}
========================================

This code will expire in 10 minutes and can only be used once.

Security Notice:
- Never share this code with anyone.
- If you did NOT request a password reset, you can safely ignore this email.
- Your existing password remains active and secure.

--
DevProfile AI Security Team
"""


async def send_password_reset_otp_email(
    to_email: str,
    otp_code: str,
    api_key: Optional[str] = None,
    from_email: Optional[str] = None,
) -> dict:
    """
    Sends a password reset OTP email using the Resend HTTPS API.
    Does NOT use SMTP. Never exposes API keys or logs plaintext OTP values.
    """
    effective_api_key = api_key or settings.RESEND_API_KEY
    effective_from = from_email or settings.RESEND_FROM_EMAIL

    if not effective_api_key or not effective_api_key.strip():
        logger.error("RESEND_API_KEY is not configured in backend environment.")
        raise EmailDeliveryError(
            "Email service is not configured. Please set RESEND_API_KEY in your environment."
        )

    clean_recipient = to_email.lower().strip()
    html_content = build_password_reset_otp_email_html(otp_code, clean_recipient)
    text_content = build_password_reset_otp_email_text(otp_code, clean_recipient)

    payload = {
        "from": effective_from,
        "to": [clean_recipient],
        "subject": "Reset your DevProfile AI password",
        "html": html_content,
        "text": text_content,
    }

    headers = {
        "Authorization": f"Bearer {effective_api_key.strip()}",
        "Content-Type": "application/json",
        "User-Agent": "DevProfile-AI-Backend/2.0",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)

            if resp.status_code not in (200, 201):
                logger.error(
                    f"Resend HTTPS API error on password reset OTP: HTTP {resp.status_code} - recipient={clean_recipient}"
                )
                raise EmailDeliveryError(
                    f"Resend email delivery failed (HTTP {resp.status_code}). Please try again."
                )

            data = resp.json()
            email_id = data.get("id", "sent")
            logger.info(f"Password reset OTP email dispatched via Resend (id={email_id}) to {clean_recipient}.")
            return {"success": True, "id": email_id}

    except httpx.RequestError as exc:
        logger.error(f"Network error communicating with Resend HTTPS API for password reset: {type(exc).__name__}")
        raise EmailDeliveryError(
            "Could not connect to email delivery service. Please check network connection and try again."
        ) from exc
