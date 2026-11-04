import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger("devprofile_ai.email_service")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


class EmailDeliveryError(Exception):
    """Raised when email delivery via Brevo HTTPS API fails."""
    pass


def _parse_sender(from_email_str: str, default_name: str = "DevProfile AI") -> tuple[str, str]:
    """
    Parses a sender string which may be 'Name <email@domain.com>' or 'email@domain.com'.
    Returns (sender_email, sender_name).
    """
    from email.utils import parseaddr
    clean_str = (from_email_str or "").strip()
    name, addr = parseaddr(clean_str)
    sender_email = addr.strip() if addr else clean_str
    sender_name = name.strip() if name else default_name.strip()
    return sender_email, sender_name


async def send_brevo_transactional_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str,
    api_key: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
) -> dict:
    """
    Dispatches a transactional email using the official Brevo (formerly Sendinblue) HTTPS API:
    POST https://api.brevo.com/v3/smtp/email

    Authenticates via the `api-key` header. Never uses SMTP.
    Safely sanitizes logs to ensure API keys, OTPs, and secrets are never exposed.
    """
    effective_api_key = api_key or settings.BREVO_API_KEY
    effective_from = from_email or settings.BREVO_FROM_EMAIL
    effective_name = from_name or settings.BREVO_FROM_NAME

    if not effective_api_key or not effective_api_key.strip():
        logger.error("BREVO_API_KEY is not configured in backend environment.")
        raise EmailDeliveryError(
            "Email service is not configured. Please set BREVO_API_KEY in your environment."
        )

    sender_email, sender_name = _parse_sender(effective_from, effective_name)
    if not sender_email or not sender_email.strip():
        logger.error("BREVO_FROM_EMAIL is not configured in backend environment.")
        raise EmailDeliveryError(
            "Sender email address is not configured. Please set BREVO_FROM_EMAIL in your environment."
        )

    clean_recipient = to_email.lower().strip()
    if not clean_recipient or "@" not in clean_recipient:
        raise EmailDeliveryError("Recipient email address is invalid.")

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email,
        },
        "to": [
            {
                "email": clean_recipient,
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,
    }

    headers = {
        "api-key": effective_api_key.strip(),
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "DevProfile-AI-Backend/2.0",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(BREVO_API_URL, json=payload, headers=headers)

            if resp.status_code in (200, 201, 202):
                data = resp.json() if resp.content else {}
                message_id = data.get("messageId", "sent")
                logger.info(
                    f"Transactional email successfully dispatched via Brevo (messageId={message_id}) to {clean_recipient}."
                )
                return {"success": True, "id": message_id}

            # Handle Brevo error response
            err_code = "unknown"
            err_msg = ""
            try:
                err_data = resp.json()
                err_code = err_data.get("code", "unknown")
                err_msg = err_data.get("message", "")
            except Exception:
                err_msg = resp.text[:200]

            logger.error(
                f"Brevo HTTPS API error: HTTP {resp.status_code} - code={err_code} - message={err_msg} - recipient={clean_recipient}"
            )

            if resp.status_code == 400:
                raise EmailDeliveryError(
                    f"Email delivery rejected: Invalid recipient or message parameters ({err_code})."
                )
            elif resp.status_code == 401:
                raise EmailDeliveryError(
                    "Email service authentication failed. Please verify BREVO_API_KEY configuration."
                )
            elif resp.status_code == 403:
                raise EmailDeliveryError(
                    f"Email delivery rejected: Sender '{sender_email}' is not verified in Brevo. "
                    "Please verify your sender email in the Brevo dashboard under Senders & IPs."
                )
            elif resp.status_code == 429:
                raise EmailDeliveryError(
                    "Email delivery rate limit reached. Please wait a few moments before trying again."
                )
            elif resp.status_code >= 500:
                raise EmailDeliveryError(
                    f"Email service temporarily unavailable (HTTP {resp.status_code}). Please try again shortly."
                )
            else:
                raise EmailDeliveryError(
                    f"Brevo email delivery failed (HTTP {resp.status_code}). Please check recipient address or try again."
                )

    except httpx.TimeoutException as exc:
        logger.error(f"Timeout connecting to Brevo HTTPS API for recipient={clean_recipient}")
        raise EmailDeliveryError(
            "Could not connect to email delivery service (request timed out). Please check network connection and try again."
        ) from exc
    except httpx.RequestError as exc:
        logger.error(f"Network error communicating with Brevo HTTPS API: {type(exc).__name__}")
        raise EmailDeliveryError(
            "Could not connect to email delivery service. Please check network connection and try again."
        ) from exc


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
    from_name: Optional[str] = None,
) -> dict:
    """
    Sends an account deletion OTP email using the Brevo HTTPS API.
    Does NOT use SMTP. Never exposes API keys or logs plaintext OTP values.
    """
    clean_recipient = to_email.lower().strip()
    html_content = build_deletion_otp_email_html(otp_code, clean_recipient)
    text_content = build_deletion_otp_email_text(otp_code, clean_recipient)

    return await send_brevo_transactional_email(
        to_email=clean_recipient,
        subject="Action Required: Confirm DevProfile AI Account Deletion",
        html_content=html_content,
        text_content=text_content,
        api_key=api_key,
        from_email=from_email,
        from_name=from_name,
    )


async def send_otp_email(
    to_email: str,
    otp_code: str,
    api_key: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
) -> dict:
    """
    Sends an OTP verification email using the Brevo HTTPS API.
    Does NOT use SMTP. Never exposes API keys or logs plaintext OTP values.
    """
    clean_recipient = to_email.lower().strip()
    html_content = build_otp_email_html(otp_code, clean_recipient)
    text_content = build_otp_email_text(otp_code, clean_recipient)

    return await send_brevo_transactional_email(
        to_email=clean_recipient,
        subject="Your DevProfile AI Verification Code",
        html_content=html_content,
        text_content=text_content,
        api_key=api_key,
        from_email=from_email,
        from_name=from_name,
    )


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
    from_name: Optional[str] = None,
) -> dict:
    """
    Sends a password reset OTP email using the Brevo HTTPS API.
    Does NOT use SMTP. Never exposes API keys or logs plaintext OTP values.
    """
    clean_recipient = to_email.lower().strip()
    html_content = build_password_reset_otp_email_html(otp_code, clean_recipient)
    text_content = build_password_reset_otp_email_text(otp_code, clean_recipient)

    return await send_brevo_transactional_email(
        to_email=clean_recipient,
        subject="Reset your DevProfile AI password",
        html_content=html_content,
        text_content=text_content,
        api_key=api_key,
        from_email=from_email,
        from_name=from_name,
    )
