"""Update admin username to employee ID format."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import get_settings

settings = get_settings()


async def update_admin_username():
    engine = create_async_engine(settings.database_url)
    
    async with engine.begin() as conn:
        # Check if admin exists
        result = await conn.execute(
            text("SELECT id, username FROM users WHERE username = :old_username OR username = :new_username"),
            {"old_username": "admin", "new_username": "A00001"}
        )
        existing = result.fetchone()
        
        if not existing:
            print("Admin user not found!")
            return
        
        if existing[1] == "A00001":
            print("Admin username is already 'A00001'")
            return
        
        # Update admin username
        await conn.execute(
            text("UPDATE users SET username = :new_username WHERE username = :old_username"),
            {"old_username": "admin", "new_username": "A00001"}
        )
        
        print("Admin username updated successfully!")
        print("  Old username: admin")
        print("  New username: A00001")
        print("\n请使用新的学号/工号登录: A00001 / admin123")


if __name__ == "__main__":
    asyncio.run(update_admin_username())
