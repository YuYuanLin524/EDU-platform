"""Seed script to create default system prompt in database."""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import get_settings

settings = get_settings()

# 默认系统提示词（与 prompts/routes.py 中的 DEFAULT_SYSTEM_PROMPT 保持一致）
DEFAULT_SYSTEM_PROMPT = """你是一位耐心的编程学习导师，采用苏格拉底式教学法帮助中学生学习编程。

核心原则：
1. 永远不要直接给出完整的可运行代码
2. 通过提问引导学生思考问题的本质
3. 当学生遇到错误时，先询问他们的理解，再引导他们自己发现问题
4. 每次回复必须包含至少一个引导性问题
5. 可以给出伪代码、思路框架或代码片段作为提示，但不能给出完整解答
6. 鼓励学生解释自己的思路，并对其思路给予反馈
7. 适时给予正面鼓励，保持学习热情

回复格式建议：
- 先确认学生的问题或当前状态
- 给出思路引导或提示
- 以一个或多个问题结束，引导学生继续思考
"""


async def create_default_prompt():
    engine = create_async_engine(settings.database_url)

    async with engine.begin() as conn:
        # 检查是否已存在全局提示词
        result = await conn.execute(
            text("SELECT id FROM prompt_scopes WHERE scope_type = :scope_type LIMIT 1"),
            {"scope_type": "global"},
        )
        existing = result.fetchone()

        if existing:
            print("Global prompt already exists!")
            print(f"  Prompt ID: {existing[0]}")
            return

        # 获取管理员用户ID（用于 created_by 字段）
        admin_result = await conn.execute(
            text("SELECT id, username FROM users WHERE role = :role LIMIT 1"),
            {"role": "admin"},
        )
        admin = admin_result.fetchone()

        if not admin:
            print("Error: No admin user found!")
            print("Please run seed_admin.py first to create an admin user.")
            return

        admin_id = admin[0]
        print(f"Using admin user: {admin[1]} (ID: {admin_id})")

        # 创建默认全局提示词
        await conn.execute(
            text("""
                INSERT INTO prompt_scopes 
                (scope_type, class_id, content, version, is_active, created_by, created_at)
                VALUES (:scope_type, :class_id, :content, :version, :is_active, :created_by, NOW())
            """),
            {
                "scope_type": "global",
                "class_id": None,
                "content": DEFAULT_SYSTEM_PROMPT,
                "version": 1,
                "is_active": True,
                "created_by": admin_id,
            },
        )

        print("Default global prompt created successfully!")
        print("  Scope: global")
        print("  Version: 1")
        print("  Status: active")


if __name__ == "__main__":
    asyncio.run(create_default_prompt())
