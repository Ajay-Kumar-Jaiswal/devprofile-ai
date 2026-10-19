from pathlib import Path


def test_forgot_password_ui_exact_strings_and_no_technical_jargon():
    """
    Verifies that ForgotPasswordPage.tsx contains the exact required heading,
    message, primary button, and footer, and contains no technical SMTP / infrastructure
    jargon or fake success claims.
    """
    root_dir = Path(__file__).resolve().parent.parent.parent
    page_file = root_dir / "frontend" / "src" / "pages" / "ForgotPasswordPage.tsx"

    assert page_file.exists(), f"ForgotPasswordPage.tsx not found at {page_file}"
    content = page_file.read_text(encoding="utf-8")

    # 1. Exact required heading
    assert "Forgot your password?" in content

    # 2. Exact required message
    expected_message = (
        "No worries! Password recovery isn't available right now. "
        "You can return to login and try another sign-in method."
    )
    assert expected_message in content

    # 3. Exact primary button text
    assert "Back to Login" in content

    # 4. Exact required footer
    assert "We're here to help you get back to coding." in content

    # 5. Must NOT claim a recovery email was sent or show fake success
    assert "Request Processed" not in content
    assert "password recovery instructions would be dispatched" not in content
    assert "Send Recovery Instructions" not in content

    # 6. Must NOT mention SMTP, email service providers, or infrastructure
    assert "SMTP" not in content
    assert "SendGrid" not in content
    assert "Amazon SES" not in content
    assert "Mailgun" not in content
    assert "Infrastructure Notice" not in content
