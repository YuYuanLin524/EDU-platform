"""Seed script to create initial admin user using raw SQL."""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import get_settings
from app.auth.security import hash_password

settings = get_settings()


async def create_admin():
    engine = create_async_engine(settings.database_url)

    async with engine.begin() as conn:
        username = os.getenv("SEED_ADMIN_USERNAME", "A00001")
        password = os.getenv("SEED_ADMIN_PASSWORD", "admin123")
        display_name = os.getenv("SEED_ADMIN_DISPLAY_NAME", "Administrator")

        # Check if any admin exists
        result = await conn.execute(
            text("SELECT id, username FROM users WHERE role = :role LIMIT 1"),
            {"role": "admin"},
        )
        existing = result.fetchone()

        if existing:
            print("Admin user already exists!")
            print(f"  Username: {existing[1]}")
            return

        # Hash password
        password_hash = hash_password(password)

        # Create admin user with raw SQL
        await conn.execute(
            text("""
                INSERT INTO users (username, display_name, role, password_hash, must_change_password, status, created_at)
                VALUES (:username, :display_name, :role, :password_hash, :must_change_password, :status, NOW())
            """),
            {
                "username": username,
                "display_name": display_name,
                "role": "admin",
                "password_hash": password_hash,
                "must_change_password": False,
                "status": "active",
            },
        )

        print("Admin user created!")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        print("  Role: admin")


if __name__ == "__main__":
    asyncio.run(create_admin())
