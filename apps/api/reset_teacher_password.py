"""
Script to reset teacher password for testing
"""
import asyncio
from sqlalchemy import select
from app.db.base import get_db, engine
from app.models import User
from app.auth.security import hash_password


async def reset_teacher_password():
    """Reset teacher password to a known value"""
    async with engine.begin() as conn:
        from app.db.base import async_session_maker
        async with async_session_maker() as db:
            # Find teacher user
            result = await db.execute(
                select(User).where(User.username == "T0001")
            )
            teacher = result.scalar_one_or_none()
            
            if teacher:
                # Set a known password
                new_password = "Teacher123!"
                teacher.password_hash = hash_password(new_password)
                teacher.must_change_password = False
                await db.commit()
                print(f"✓ Teacher password reset successfully")
                print(f"  Username: {teacher.username}")
                print(f"  Password: {new_password}")
                print(f"  Role: {teacher.role.value}")
                print(f"  Status: {teacher.status.value}")
            else:
                print("✗ Teacher user not found")


if __name__ == "__main__":
    asyncio.run(reset_teacher_password())
