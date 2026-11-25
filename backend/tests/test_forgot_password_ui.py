from pathlib import Path


def test_forgot_password_ui_exact_strings_and_no_technical_jargon():
    """
    Verifies that ForgotPasswordPage.tsx contains the required headings,
    verification controls, and contains no technical SMTP / infrastructure jargon.
    """
    root_dir = Path(__file__).resolve().parent.parent.parent
    page_file = root_dir / "frontend" / "src" / "pages" / "ForgotPasswordPage.tsx"

    assert page_file.exists(), f"ForgotPasswordPage.tsx not found at {page_file}"
    content = page_file.read_text(encoding="utf-8")

    # 1. Required headings for the multi-step recovery flow
    assert "Forgot password?" in content
    assert "Enter recovery code" in content
    assert "Create new password" in content
    assert "Password reset complete" in content

    # 2. Back to Login navigation
    assert "Back to login" in content or "Back to Login" in content or "Return to login" in content

    # 3. Must NOT mention raw SMTP or email infrastructure jargon
    assert "SMTP" not in content
    assert "SendGrid" not in content
    assert "Amazon SES" not in content
    assert "Mailgun" not in content
    assert "Infrastructure Notice" not in content
