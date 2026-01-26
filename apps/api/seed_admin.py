"""Seed script to create initial admin user using raw SQL."""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext
from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin():
    engine = create_async_engine(settings.database_url)

    async with engine.begin() as conn:
        # Check if admin exists
        result = await conn.execute(
            text("SELECT id FROM users WHERE username = :username"),
            {"username": "admin"},
        )
        existing = result.fetchone()

        if existing:
            print("Admin user already exists!")
            return

        # Hash password
        password_hash = pwd_context.hash("admin123")

        # Create admin user with raw SQL
        await conn.execute(
            text("""
                INSERT INTO users (username, display_name, role, password_hash, must_change_password, status, created_at)
                VALUES (:username, :display_name, :role, :password_hash, :must_change_password, :status, NOW())
            """),
            {
                "username": "admin",
                "display_name": "Administrator",
                "role": "admin",
                "password_hash": password_hash,
                "must_change_password": False,
                "status": "active",
            },
        )

        print("Admin user created!")
        print("  Username: admin")
        print("  Password: admin123")
        print("  Role: admin")


if __name__ == "__main__":
    asyncio.run(create_admin())
