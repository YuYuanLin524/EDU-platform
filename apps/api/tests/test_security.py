"""
Security unit tests.

Tests:
- Password hashing and verification
- bcrypt 72-byte truncation behavior is handled safely
"""

from app.auth.security import hash_password, verify_password


def test_password_hash_and_verify():
    password = "admin123"
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_long_password_is_supported():
    long_password = "a" * 200
    hashed = hash_password(long_password)

    assert verify_password(long_password, hashed) is True
    assert verify_password("b" + ("a" * 199), hashed) is False


def test_unicode_password_is_supported():
    password = "密码" * 100
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True
    assert verify_password("密" + ("码" * 199), hashed) is False

